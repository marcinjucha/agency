import type { BlockTypography, BlockBorder } from '@agency/email'

/**
 * applySectionPatch — scala partial z sekcji Inspectora (Typography/Border)
 * z blokiem tak, żeby USUNIĘCIE klucza w sekcji faktycznie usuwało go z bloku.
 *
 * Sekcje (TypographySection/BorderSection) czyszczą wartości przez
 * `delete merged[key]` na swoim lokalnym partialu — klucz usunięty z partiala
 * po prostu NIE ISTNIEJE w `patch`. Zwykły spread `{ ...block, ...patch }`
 * zachowuje wtedy starą wartość z bloku (bug: raz wybrany token koloru,
 * np. borderColorToken, był nieusuwalny — "wieczna biała ramka").
 *
 * Semantyka: usuń WSZYSTKIE `sectionKeys` z bloku, potem nałóż klucze obecne
 * w `patch`. Klucz nieobecny w patchu = naprawdę usunięty z wyniku.
 *
 * Klucze usuwamy przez `delete` (nie ustawiamy na undefined) — bloki trafiają
 * do JSONB, a kod wszędzie robi presence-checki (`Boolean(value.borderColorToken)`,
 * `value.textColorToken ? ... : ...`).
 */
export function applySectionPatch<T extends object>(
  block: T,
  sectionKeys: readonly string[],
  patch: Readonly<Record<string, unknown>>,
): T {
  // Spread kopiuje T do luźnego rekordu — potrzebne, bo generyczne T nie ma
  // sygnatury indeksowej, a helper operuje na kluczach dynamicznych.
  const result = { ...block } as Record<string, unknown>
  for (const key of sectionKeys) {
    delete result[key]
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result as T
}

// ---------------------------------------------------------------------------
// Listy kluczy sekcji — `satisfies` przypina je do mixinów BlockTypography /
// BlockBorder z @agency/email, więc literówka lub dryf względem interfejsów
// nie przejdzie kompilacji.
//
// UWAGA (legacy textColor): HeaderBlock/CtaBlock deklarują wymagane legacy
// `textColor: string` pod TYM SAMYM kluczem co mixin. Usunięcie go jest
// ZAMIERZONE — runtime'owa walidacja (block-registry.ts, blockTypographyShape)
// ma `textColor` opcjonalny (Phase 3 AAA-T-221: "editor leaves it unset"),
// a renderer robi fallback `style?.color ?? block.textColor` → defaults.
// ---------------------------------------------------------------------------

export const TYPOGRAPHY_SECTION_KEYS = [
  'textAlign',
  'textColor',
  'textColorToken',
] as const satisfies readonly (keyof BlockTypography)[]

export const BORDER_SECTION_KEYS = [
  'borderColor',
  'borderRadius',
  'backgroundColor',
  'borderColorToken',
  'backgroundColorToken',
] as const satisfies readonly (keyof BlockBorder)[]

// Dwukierunkowe przypięcie (walidacja MED-1): `satisfies` powyżej odrzuca klucz
// NADMIAROWY/literówkę, ale NIE brakujący. Gdy mixin zyska nowe pole (dokładnie
// tak dodano borderColorToken/backgroundColorToken), poniższe asercje przestaną
// się kompilować, zamiast cicho wskrzesić bug "nieusuwalnej wartości" dla nowego
// klucza.
type AssertExhaustive<Missing> = [Missing] extends [never] ? true : never
const _typographyKeysExhaustive: AssertExhaustive<
  Exclude<keyof BlockTypography, (typeof TYPOGRAPHY_SECTION_KEYS)[number]>
> = true
const _borderKeysExhaustive: AssertExhaustive<
  Exclude<keyof BlockBorder, (typeof BORDER_SECTION_KEYS)[number]>
> = true
void _typographyKeysExhaustive
void _borderKeysExhaustive
