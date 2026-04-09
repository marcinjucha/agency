# Szyfrowanie i bezpieczenstwo danych

> Dokument opisuje jak projekt Halo Efekt chroni wrażliwe dane (credentials, tokeny API) w bazie Supabase. Ostatnia aktualizacja: 2026-04-09.

## Spis tresci

1. [Architektura szyfrowania](#architektura-szyfrowania)
2. [Co jest szyfrowane](#co-jest-szyfrowane)
3. [Jak dziala pgcrypto](#jak-dziala-pgcrypto)
4. [Klucz szyfrowania — app_config](#klucz-szyfrowania--app_config)
5. [Przeplyw danych — CalDAV jako przyklad](#przeplyw-danych--caldav-jako-przyklad)
6. [Row Level Security (RLS)](#row-level-security-rls)
7. [Funkcje SECURITY DEFINER](#funkcje-security-definer)
8. [Co widzi anonimowy uzytkownik](#co-widzi-anonimowy-uzytkownik)
9. [Service role — kiedy i dlaczego](#service-role--kiedy-i-dlaczego)
10. [Deployment checklist](#deployment-checklist)
11. [Znane ryzyka i mitygacje](#znane-ryzyka-i-mitygacje)

---

## Architektura szyfrowania

```
CMS (Server Action)          Website (API Route)
       |                            |
       v                            v
  supabase.rpc(                supabase.rpc(
    'upsert_calendar_        'update_calendar_
     connection',              credentials',
     { credentials_json }      { credentials_json }
  )                           )
       |                            |
       v                            v
  +------------------------------------------+
  |  SECURITY DEFINER function (PostgreSQL)  |
  |                                          |
  |  1. get_encryption_key()                 |
  |     -> czyta z tabeli app_config         |
  |     -> fallback: 'local-dev-key'         |
  |                                          |
  |  2. pgp_sym_encrypt(json, key)           |
  |     -> symetryczne AES-128 (OpenPGP)     |
  |     -> wynik: BYTEA (binary)             |
  |                                          |
  |  3. INSERT/UPDATE do tabeli              |
  +------------------------------------------+
       |
       v
  +------------------------------------------+
  |  calendar_connections                    |
  |  credentials_encrypted: BYTEA           |
  |  (zaszyfrowany blob — nieczytelny)      |
  +------------------------------------------+
       |
       v (odczyt)
  +------------------------------------------+
  |  calendar_connections_decrypted (VIEW)   |
  |  security_invoker = true                 |
  |                                          |
  |  pgp_sym_decrypt(blob, key) -> JSONB    |
  |  (odszyfrowane credentials)             |
  +------------------------------------------+
```

**Kluczowa zasada:** Credentials nigdy nie sa przechowywane jako plain text. Szyfrowanie odbywa sie na poziomie PostgreSQL (nie aplikacji), co oznacza ze nawet bezposredni dostep do bazy nie ujawnia hasel bez klucza.

---

## Co jest szyfrowane

| Tabela | Kolumna | Co przechowuje | Format |
|--------|---------|----------------|--------|
| `calendar_connections` | `credentials_encrypted` | CalDAV: `{serverUrl, username, password}`, Google: `{access_token, refresh_token, expiry_date, scope, email}` | BYTEA (pgcrypto) |
| `shop_marketplace_connections` | `access_token_encrypted` | Token dostepu OLX/Allegro | BYTEA (pgcrypto) |
| `shop_marketplace_connections` | `refresh_token_encrypted` | Token odswiezania OLX/Allegro | BYTEA (pgcrypto) |

**Co NIE jest szyfrowane (i dlaczego):**
- `email_configs.api_key` — plain TEXT. Historyczny dlug techniczny. n8n czyta bezposrednio z bazy.
- `users.email`, `tenants.name` — dane kontaktowe, nie credentials. Chronione przez RLS (tenant isolation).

---

## Jak dziala pgcrypto

Projekt uzywa rozszerzenia `pgcrypto` wbudowanego w PostgreSQL. Konkretnie funkcji:

### Szyfrowanie: `pgp_sym_encrypt(data, key)`

```sql
-- Szyfruje string kluczem symetrycznym (AES-128 w formacie OpenPGP)
pgp_sym_encrypt('{"username":"halo","password":"secret"}', 'my-key')
-- Wynik: \x c30d04090302... (BYTEA — binarny blob)
```

- **Algorytm:** AES-128 w trybie CFB (format OpenPGP, RFC 4880)
- **Typ wyniku:** BYTEA — binarny obiekt, nieczytelny bez klucza
- **Kazde wywolanie daje inny output** — nawet dla tych samych danych (losowy IV)

### Deszyfrowanie: `pgp_sym_decrypt(data, key)`

```sql
-- Odszyfrowuje BYTEA z powrotem do TEXT
pgp_sym_decrypt(credentials_encrypted, 'my-key')
-- Wynik: '{"username":"halo","password":"secret"}'
```

- **Zly klucz:** rzuca blad `Wrong key or corrupt data` — nie zwraca smieci
- **Odszyfrowywanie odbywa sie w VIEW** (nie w aplikacji), wiec klucz nigdy nie opuszcza PostgreSQL

### Dlaczego pgcrypto a nie szyfrowanie w aplikacji?

1. **Klucz nigdy nie trafia do Node.js** — nie moze wyciec przez logi, memory dump, czy error stack trace
2. **Atomowosc** — szyfrowanie i zapis w jednej transakcji SQL
3. **Prostota** — brak bibliotek kryptograficznych w TypeScript (zero dependency)
4. **Supabase-native** — pgcrypto jest preinstalowane, nie trzeba nic doinstalowywac

---

## Klucz szyfrowania — app_config

### Problem

Supabase (Cloud i local) blokuje `ALTER DATABASE SET "app.encryption_key"` — nie mozna ustawic custom GUC (parametru PostgreSQL) przez SQL.

### Rozwiazanie

Klucz przechowywany jest w tabeli `app_config`:

```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- RLS wlaczone, ZERO policies = ZERO dostepu przez API
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- Brak GRANT dla authenticated/anon
```

**Kto moze czytac `app_config`?**
- Tylko funkcje `SECURITY DEFINER` (dzialaja jako `postgres` — omijaja RLS)
- NIE: PostgREST, NIE: Supabase JS client, NIE: authenticated users

### Funkcja pomocnicza: `get_encryption_key()`

```sql
CREATE FUNCTION get_encryption_key() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_key TEXT;
BEGIN
  SELECT value INTO v_key FROM app_config WHERE key = 'encryption_key';
  IF v_key IS NULL OR v_key = 'CHANGE-ME-IN-PRODUCTION' THEN
    RETURN 'local-dev-encryption-key';  -- fallback dla dev
  END IF;
  RETURN v_key;
END;
$$;
```

**Lancuch fallback:**
1. Czyta `app_config.value` WHERE `key = 'encryption_key'`
2. Jesli NULL lub placeholder → zwraca `'local-dev-encryption-key'` (bezpieczne bo dev)
3. Na produkcji: admin ustawia prawdziwy klucz przez SQL Editor

### Jak ustawic klucz na produkcji

```sql
UPDATE app_config
SET value = 'wygenerowany-silny-klucz-base64'
WHERE key = 'encryption_key';
```

Generowanie klucza: `openssl rand -base64 32`

**WAZNE:** Zmiana klucza po zapisaniu danych = utrata dostepu do istniejacych credentials. Trzeba re-encrypt.

---

## Przeplyw danych — CalDAV jako przyklad

### Zapis (CMS → DB)

```
1. Admin wypelnia formularz CalDAV:
   { serverUrl: "https://cal.haloefekt.pl/dav.php",
     username: "haloefekt",
     password: "tajne-haslo" }

2. Server Action (apps/cms/features/calendar/actions.ts):
   - Walidacja Zod
   - requireAuth('calendar') — sprawdza uprawnienia
   - testConnection() — tsdav probuje sie polaczyc (weryfikacja przed zapisem)
   - JSON.stringify(credentials) → string

3. Supabase RPC:
   supabase.rpc('upsert_calendar_connection', {
     p_credentials_json: '{"serverUrl":"...","username":"...","password":"..."}',
     p_provider: 'caldav',
     p_display_name: 'Firmowy kalendarz'
   })

4. PostgreSQL (SECURITY DEFINER function):
   v_key := get_encryption_key()  -- 'wygenerowany-klucz'
   pgp_sym_encrypt(p_credentials_json, v_key)
   → BYTEA blob zapisany w calendar_connections.credentials_encrypted
```

### Odczyt (DB → Provider)

```
1. Website booking flow (apps/website/features/calendar/booking.ts):
   - getConnectionForSurveyLink(surveyLinkId, supabase)

2. Connection Manager (packages/calendar/src/connection-manager.ts):
   supabase
     .from('calendar_connections_decrypted')  // VIEW
     .select('*')
     .eq('id', connectionId)
   → VIEW automatycznie wywoluje pgp_sym_decrypt
   → credentials zwrocone jako JSONB

3. CalendarProviderFactory:
   createCalendarProvider(connection)
   → tworzy CalDAVProvider z odszyfrowanymi credentials
   → tsdav uzywa username/password do Basic Auth
```

### Token refresh (Google)

```
1. GoogleCalendarProvider wykrywa wygasly token
2. Wewnetrznie wywoluje refreshAccessToken() → nowy access_token
3. Callback onTokenRefresh:
   supabase.rpc('update_calendar_credentials', {
     p_connection_id: connectionId,
     p_credentials_json: JSON.stringify(newCredentials)
   })
4. PostgreSQL re-szyfruje nowe credentials
```

---

## Row Level Security (RLS)

### Wzorzec: tenant isolation

Wiekszosc tabel uzywa `current_user_tenant_id()` — funkcji SECURITY DEFINER ktora zwraca tenant_id biezacego uzytkownika bez subquery na tabeli `users` (co by spowodowalo nieskonczona rekurencje RLS).

```sql
CREATE POLICY "Tenant isolation"
  ON calendar_connections FOR ALL
  TO authenticated
  USING (tenant_id = current_user_tenant_id())
  WITH CHECK (tenant_id = current_user_tenant_id());
```

### Klasyfikacja tabel

| Poziom | Tabele | Kto ma dostep |
|--------|--------|---------------|
| **Zaszyfrowane** | calendar_connections, shop_marketplace_connections | authenticated (tenant-scoped), credentials przez SECURITY DEFINER |
| **Tenant-scoped** | surveys, responses, appointments, blog_posts, email_templates, media_items, workflows | authenticated (tylko swoj tenant) |
| **Publiczne (z warunkiem)** | blog_posts (is_published), shop_products (is_published), landing_pages (is_published) | anon SELECT z filtrem |
| **Publiczne (bez warunku)** | survey_links, site_settings, shop_categories, tenant_domains | anon SELECT all |
| **Admin-only** | app_config | ZERO policies = ZERO dostepu (tylko SECURITY DEFINER) |

### Decrypted views: security_invoker

```sql
CREATE VIEW calendar_connections_decrypted
WITH (security_invoker = true) AS
SELECT ..., pgp_sym_decrypt(credentials_encrypted, get_encryption_key()) AS credentials
FROM calendar_connections;
```

`security_invoker = true` oznacza: VIEW sprawdza RLS **wywolujacego** (nie wlasciciela view). Bez tego, view dzialaloby jako postgres i omijalo RLS.

**Grants:**
- `calendar_connections_decrypted`: `SELECT` dla `authenticated` (CMS potrzebuje credentials)
- `shop_marketplace_connections_decrypted`: `REVOKE ALL` od authenticated/anon (admin-only)

---

## Funkcje SECURITY DEFINER

| Funkcja | Cel | Kto moze wywolac |
|---------|-----|-------------------|
| `get_encryption_key()` | Odczyt klucza z app_config | Tylko inne SECURITY DEFINER functions |
| `upsert_calendar_connection()` | Szyfrowanie + zapis calendar credentials | authenticated |
| `update_calendar_credentials()` | Re-szyfrowanie po token refresh | authenticated, service_role |
| `upsert_marketplace_connection()` | Szyfrowanie + zapis marketplace tokens | authenticated |
| `update_marketplace_tokens()` | Re-szyfrowanie marketplace tokens | authenticated, service_role |
| `current_user_tenant_id()` | RLS helper — tenant isolation | authenticated, anon |
| `claim_due_delay_steps()` | Workflow batch processing (FOR UPDATE SKIP LOCKED) | authenticated, service_role |

**Dlaczego SECURITY DEFINER?**
- Funkcje szyfrujace musza czytac `app_config` (chroniona przez RLS bez policies)
- `current_user_tenant_id()` musi czytac `users` (co normalnie spowodowalby RLS recursion)
- `claim_due_delay_steps()` potrzebuje `FOR UPDATE SKIP LOCKED` (atomowe rezerwacje)

---

## Co widzi anonimowy uzytkownik

### Moze czytac (SELECT)

| Dane | Warunek | Ryzyko |
|------|---------|--------|
| survey_links (token, expires_at, calendar_connection_id) | Bez warunku | Niskie — token to UUID, connection_id to FK (nie credentials) |
| calendar_connections (provider, display_name, is_active) | is_active = true | Niskie — metadane, nie credentials. BYTEA nieczytelne bez klucza |
| blog_posts, landing_pages, shop_products | is_published = true | Brak — dane publiczne z zalozenia |
| site_settings, shop_categories | Bez warunku | Brak — dane publiczne |

### NIE moze czytac

- `calendar_connections_decrypted` (brak GRANT dla anon)
- `shop_marketplace_connections` (brak RLS policy dla anon)
- `email_templates`, `media_items`, `workflows` (brak RLS policy dla anon)
- `app_config` (RLS bez policies = zero dostepu)

### Moze zapisywac (INSERT)

- `responses` — submission ankiety (tenant_id z survey, nie od usera)
- `appointments` — booking (tenant_id z survey_link, nie od usera)

**Kluczowe zabezpieczenie:** `tenant_id` nigdy nie pochodzi z inputu uzytkownika. Zawsze jest odczytywany z survey/survey_link po stronie serwera.

---

## Service role — kiedy i dlaczego

Service role key (`SUPABASE_SERVICE_ROLE_KEY`) omija RLS. Uzywany jest w dwoch miejscach:

### 1. Website API Routes (publiczny booking)

```typescript
// apps/website/features/calendar/booking.ts
const supabase = createClient(supabaseUrl, supabaseKey) // service_role
```

**Dlaczego:** Anonimowy uzytkownik (survey respondent) nie ma sesji auth. Server Action wymagalby cookies. API Route z service_role moze INSERT do `appointments` bez sesji.

**Zabezpieczenie:** `tenant_id` pochodzi z `survey_links.surveys.tenant_id` (z bazy), nie z request body.

### 2. Website createAnonClient (ISR queries)

```typescript
// apps/website/lib/supabase/anon-server.ts
export function createAnonClient() {
  return createClient(url, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
```

**Dlaczego:** Next.js ISR buduje strony w build time — nie ma kontekstu request/cookies. Service role pozwala na odczyt danych publicznych.

---

## Deployment checklist

### Nowa instalacja

- [ ] `supabase db push` — zaaplikuj migracje
- [ ] Wygeneruj klucz: `openssl rand -base64 32`
- [ ] Ustaw klucz w produkcji:
  ```sql
  UPDATE app_config SET value = '<klucz>' WHERE key = 'encryption_key';
  ```
- [ ] Zweryfikuj: `SELECT * FROM calendar_connections_decrypted LIMIT 1;` (nie powinno rzucic bledu)
- [ ] Zapisz klucz w bezpiecznym miejscu (1Password / Vault)

### Rotacja klucza (jesli wymagana)

1. Odczytaj stary klucz
2. Odszyfruj wszystkie credentials starym kluczem
3. Zaszyfruj ponownie nowym kluczem
4. Zaktualizuj `app_config.value`
5. Przetestuj odczyt z decrypted views

**UWAGA:** Nie ma automatycznej rotacji. Zmiana klucza bez re-encrypt = utrata danych.

---

## Znane ryzyka i mitygacje

| Ryzyko | Waga | Status | Mitygacja |
|--------|------|--------|-----------|
| Klucz szyfrowania w tabeli SQL (nie HSM/Vault) | Medium | Zaakceptowane | app_config chroniona RLS (zero policies). Supabase Vault to przyszla opcja. |
| Service role omija RLS | Medium | Zmitigowane | tenant_id z bazy (nie z usera). Uzywany tylko w website API routes. |
| email_configs.api_key plain text | Low | Dlug techniczny | n8n czyta bezposrednio. Do zaszyfrowania w przyszlosci. |
| Anon widzi metadane calendar_connections | Low | Zaakceptowane | Tylko provider, display_name. Credentials zaszyfrowane (BYTEA). Potrzebne do booking flow. |
| Brak automatycznej rotacji klucza | Low | Zaakceptowane | Pre-launch, malo danych. Rotacja manualna gdy potrzebna. |
| Decrypted view dla authenticated (calendar) | Low | Zamierzone | CMS potrzebuje credentials do testConnection(). Marketplace view ma REVOKE. |
