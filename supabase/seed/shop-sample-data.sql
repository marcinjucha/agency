-- Sample data for shop-jacek bookshop
-- Idempotent: uses ON CONFLICT DO NOTHING
-- Tenant: Halo Efekt production

DO $$
DECLARE
  v_tenant_id UUID := '19342448-4e4e-49ba-8bf0-694d5376f953';
  v_cat_powiesci UUID;
  v_cat_poezja UUID;
  v_cat_edu UUID;
BEGIN
  -- Categories
  INSERT INTO shop_categories (id, tenant_id, name, slug, description, sort_order)
  VALUES
    ('a1000000-0000-0000-0000-000000000001', v_tenant_id, 'Powieści', 'powiesci', 'Autorskie powieści i opowiadania', 0),
    ('a1000000-0000-0000-0000-000000000002', v_tenant_id, 'Poezja', 'poezja', 'Zbiory wierszy i refleksji poetyckich', 1),
    ('a1000000-0000-0000-0000-000000000003', v_tenant_id, 'Materiały edukacyjne', 'materialy-edukacyjne', 'Bezpłatne materiały do nauki i rozwoju', 2)
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  v_cat_powiesci := 'a1000000-0000-0000-0000-000000000001';
  v_cat_poezja   := 'a1000000-0000-0000-0000-000000000002';
  v_cat_edu      := 'a1000000-0000-0000-0000-000000000003';

  -- Products
  INSERT INTO shop_products (
    id, tenant_id, title, slug, short_description, html_body,
    listing_type, display_layout, price, currency, external_url,
    is_published, published_at, category_id, tags, seo_metadata
  ) VALUES
  -- 1. Ścieżki Wyobraźni
  (
    'b1000000-0000-0000-0000-000000000001', v_tenant_id,
    'Ścieżki Wyobraźni', 'sciezki-wyobrazni',
    'Powieść o podróży przez krajobraz wspomnień i marzeń, która zmienia sposób patrzenia na codzienność.',
    '<h2>O książce</h2><p>„Ścieżki Wyobraźni" to powieść, która prowadzi czytelnika przez <em>labirynt wspomnień</em> bohatera — nauczyciela z małego miasteczka, który pewnego dnia postanawia porzucić rutynę i wyruszyć w podróż bez mapy.</p><p>Każdy rozdział otwiera nowy krajobraz — zarówno zewnętrzny, jak i wewnętrzny. Książka stawia pytanie: <strong>czy można wrócić do miejsca, które istnieje tylko w pamięci?</strong></p><h3>Dla kogo</h3><p>Dla tych, którzy lubią spokojne, refleksyjne narracje z nutą nostalgii.</p>',
    'external_link', 'gallery', 39.99, 'PLN', 'https://example.com/kup/sciezki-wyobrazni',
    true, now(), v_cat_powiesci,
    ARRAY['powieść', 'podróż', 'refleksja'],
    '{"title": "Ścieżki Wyobraźni — powieść o podróży i wspomnieniach", "description": "Autorska powieść o podróży przez krajobraz wspomnień i marzeń.", "keywords": ["powieść", "podróż", "wyobraźnia", "polska literatura"]}'::jsonb
  ),
  -- 2. Wiersze z Ogrodu
  (
    'b1000000-0000-0000-0000-000000000002', v_tenant_id,
    'Wiersze z Ogrodu', 'wiersze-z-ogrodu',
    'Zbiór wierszy inspirowanych naturą, ciszą i codziennymi rytuałami ogrodnika.',
    '<h2>O zbiorze</h2><p>„Wiersze z Ogrodu" to <em>trzydzieści dwa utwory</em> napisane na przestrzeni trzech lat — każdy zrodził się z porannych spacerów po ogrodzie. Nie są to wiersze o kwiatach, lecz o tym, czego kwiaty nas uczą.</p><p>Zbiór dzieli się na cztery pory roku, a każda z nich przynosi inne <strong>odcienie ciszy</strong>.</p>',
    'external_link', 'editorial', 29.99, 'PLN', 'https://example.com/kup/wiersze-z-ogrodu',
    true, now(), v_cat_poezja,
    ARRAY['poezja', 'natura', 'ogród'],
    '{"title": "Wiersze z Ogrodu — poezja natury i ciszy", "description": "Zbiór 32 wierszy inspirowanych naturą i codziennymi rytuałami.", "keywords": ["poezja", "natura", "wiersze", "ogród"]}'::jsonb
  ),
  -- 3. Opowieści Wieczorne
  (
    'b1000000-0000-0000-0000-000000000003', v_tenant_id,
    'Opowieści Wieczorne', 'opowiesci-wieczorne',
    'Zbiór siedmiu opowiadań, które łączy motyw zmierzchu i rozmów przy świecach.',
    '<h2>O książce</h2><p>Siedem opowiadań, siedem wieczorów, siedem historii opowiedzianych przy gasnącym świetle. Bohaterowie „Opowieści Wieczornych" to <em>zwykli ludzie w niezwykłych momentach</em> — kiedy dzień już się skończył, ale noc jeszcze nie nadeszła.</p><h3>Spis treści</h3><p><strong>Cień na ścianie</strong> · <strong>Zapach deszczu</strong> · <strong>List do nikogo</strong> · <strong>Stary zegar</strong> · <strong>Puste krzesło</strong> · <strong>Trzecie piętro</strong> · <strong>Ostatni tramwaj</strong></p>',
    'external_link', 'gallery', 34.99, 'PLN', 'https://example.com/kup/opowiesci-wieczorne',
    true, now(), v_cat_powiesci,
    ARRAY['opowiadania', 'wieczór', 'atmosfera'],
    '{"title": "Opowieści Wieczorne — siedem opowiadań o zmierzchu", "description": "Zbiór siedmiu opowiadań łączonych motywem zmierzchu i rozmów przy świecach.", "keywords": ["opowiadania", "literatura", "zmierzch"]}'::jsonb
  ),
  -- 4. Notatnik Podróżnika (free, digital_download)
  (
    'b1000000-0000-0000-0000-000000000004', v_tenant_id,
    'Notatnik Podróżnika', 'notatnik-podroznika',
    'Bezpłatny zbiór esejów podróżniczych — zapiski z małych miast, pociągów i przydrożnych kawiarni.',
    '<h2>O publikacji</h2><p>„Notatnik Podróżnika" to bezpłatny zbiór <em>dwunastu esejów</em> napisanych w drodze — w pociągach, na dworcach, w kawiarniach, których nazw już nie pamiętam.</p><p>Nie jest to przewodnik. To raczej <strong>zaproszenie do wolniejszego podróżowania</strong> — takiego, w którym liczy się nie cel, lecz droga.</p>',
    'digital_download', 'editorial', NULL, 'PLN', 'https://example.com/pobierz/notatnik-podroznika',
    true, now(), v_cat_powiesci,
    ARRAY['eseje', 'podróż', 'bezpłatne'],
    '{"title": "Notatnik Podróżnika — bezpłatne eseje podróżnicze", "description": "Bezpłatny zbiór dwunastu esejów podróżniczych.", "keywords": ["eseje", "podróż", "bezpłatne", "ebook"]}'::jsonb
  ),
  -- 5. Zbiór Refleksji
  (
    'b1000000-0000-0000-0000-000000000005', v_tenant_id,
    'Zbiór Refleksji', 'zbior-refleksji',
    'Wiersze o upływie czasu, pamięci i drobnych gestach, które nadają sens codzienności.',
    '<h2>O zbiorze</h2><p>Drugi tom poetycki — bardziej osobisty niż „Wiersze z Ogrodu". <em>Dwadzieścia pięć wierszy</em> o tym, co zostaje, gdy odejdzie to, co wydawało się trwałe.</p><p>Tematy: <strong>upływ czasu</strong>, pamięć, drobne gesty, które nadają sens codzienności.</p><h3>Fragment</h3><p><em>„Nie liczy się ostatnie słowo, lecz cisza, która po nim zostaje."</em></p>',
    'external_link', 'gallery', 24.99, 'PLN', 'https://example.com/kup/zbior-refleksji',
    true, now(), v_cat_poezja,
    ARRAY['poezja', 'refleksja', 'czas'],
    '{"title": "Zbiór Refleksji — wiersze o czasie i pamięci", "description": "Wiersze o upływie czasu, pamięci i drobnych gestach codzienności.", "keywords": ["poezja", "refleksja", "czas", "pamięć"]}'::jsonb
  ),
  -- 6. Przewodnik po Literaturze (free, digital_download)
  (
    'b1000000-0000-0000-0000-000000000006', v_tenant_id,
    'Przewodnik po Literaturze', 'przewodnik-po-literaturze',
    'Bezpłatny materiał edukacyjny — przystępne omówienie kluczowych nurtów literackich XX i XXI wieku.',
    '<h2>O materiale</h2><p>„Przewodnik po Literaturze" to bezpłatny materiał edukacyjny skierowany do <em>wszystkich, którzy chcą lepiej rozumieć współczesną literaturę</em> — bez akademickiego żargonu.</p><p>Omówione nurty: <strong>realizm magiczny</strong>, literatura egzystencjalna, nowa fala polskiej prozy, autofiction.</p><h3>Zawartość</h3><p>48 stron w formacie PDF. Cztery rozdziały, każdy zakończony listą lektur do samodzielnej eksploracji.</p>',
    'digital_download', 'editorial', NULL, 'PLN', 'https://example.com/pobierz/przewodnik-po-literaturze',
    true, now(), v_cat_edu,
    ARRAY['edukacja', 'literatura', 'bezpłatne', 'PDF'],
    '{"title": "Przewodnik po Literaturze — bezpłatny materiał edukacyjny", "description": "Przystępne omówienie kluczowych nurtów literackich XX i XXI wieku.", "keywords": ["edukacja", "literatura", "nurty literackie", "bezpłatne"]}'::jsonb
  )
  ON CONFLICT (tenant_id, slug) DO NOTHING;

END $$;
