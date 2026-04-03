import type { Tables } from './types'

// Canonical SEO metadata type — all fields optional (safe for JSONB storage).
// Required fields enforced via Zod validation in each app, not here.
export type SeoMetadata = {
  title?: string
  description?: string
  ogImage?: string
  keywords?: string[]
}

export type NavbarBlock = {
  type: 'navbar'
  ctaText: string
  ctaHref: string
}

export type HeroBlock = {
  type: 'hero'
  headline: string
  subheadline: string
  cta: { text: string; href: string }
  trustLine: string
}

export type IdentificationBlock = {
  type: 'identification'
  eyebrow: string
  items: { icon: string; text: string }[]
  transition: string
}

export type ProblemsBlock = {
  type: 'problems'
  title: string
  stat: string
  items: string[]
}

export type ProcessBlock = {
  type: 'process'
  badge: string
  headline: string
  headline2: string
  steps: { icon: string; label: string; text: string }[]
  riskTitle: string
  riskDescription: string
  proof: string
}

export type ResultsBlock = {
  type: 'results'
  title: string
  metrics: { value: string; label: string }[]
  outcomes: { title: string; detail: string }[]
  qualificationTitle: string
  qualificationItems: string[]
}

export type CtaBlock = {
  type: 'cta'
  headline: string
  description: string
  button: { text: string; href: string }
  trustLine: string
}

export type FooterBlock = {
  type: 'footer'
  description: string
  privacy: string
  terms: string
  copyright: string
}

export type LandingBlock =
  | NavbarBlock
  | HeroBlock
  | IdentificationBlock
  | ProblemsBlock
  | ProcessBlock
  | ResultsBlock
  | CtaBlock
  | FooterBlock

export type LandingBlockType = LandingBlock['type']

export type LandingPage = Omit<Tables<'landing_pages'>, 'blocks' | 'seo_metadata'> & {
  blocks: LandingBlock[]
  seo_metadata: SeoMetadata | null
}

// Supabase returns blocks/seo_metadata as generic Json (JSONB) — cast to typed LandingPage once here
export function toLandingPage(raw: unknown): LandingPage {
  const row = raw as Tables<'landing_pages'>
  return {
    ...row,
    blocks: Array.isArray(row.blocks) ? (row.blocks as unknown as LandingBlock[]) : [],
    seo_metadata: row.seo_metadata as unknown as SeoMetadata | null,
  }
}

export const BLOCK_TYPE_LABELS: Record<LandingBlockType, string> = {
  navbar: 'Nawigacja',
  hero: 'Sekcja Hero',
  identification: 'Identyfikacja',
  problems: 'Problemy',
  process: 'Proces',
  results: 'Rezultaty',
  cta: 'Wezwanie do działania',
  footer: 'Stopka',
}

export const DEFAULT_BLOCKS: LandingBlock[] = [
  {
    type: 'navbar',
    ctaText: 'Umów rozmowę',
    ctaHref: '/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4',
  },
  {
    type: 'hero',
    headline: 'Automatyzujemy procesy. Zwiększamy zysk.',
    subheadline: 'Dla firm od 5 do 100 osób. Średnia oszczędność: do 150 000 zł rocznie.',
    cta: { text: 'Umów bezpłatną rozmowę', href: '/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4' },
    trustLine: 'Jeśli nie znajdziemy potencjału oszczędności — nic nie płacisz.',
  },
  {
    type: 'identification',
    eyebrow: 'Czy to brzmi znajomo?',
    items: [
      { icon: 'TrendingUp', text: 'Czujesz, że powinieneś więcej zarabiać, ale coś Ci umyka' },
      { icon: 'AlertTriangle', text: 'Rośniesz, ale chaos operacyjny rośnie szybciej' },
      { icon: 'Brain', text: 'Słyszałeś o AI, ale nie wiesz, jak to ma u Ciebie zadziałać' },
      { icon: 'User', text: 'Procesy zależą od jednej osoby — i to Ciebie' },
    ],
    transition: 'Mamy złą wiadomość: jesteś jak większość. Mamy też dobrą: możemy Ci pomóc.',
  },
  {
    type: 'problems',
    title: 'Gdzie uciekają pieniądze?',
    stat: 'W większości firm 20–60% czasu pracy jest marnowane na czynności, które można zautomatyzować.',
    items: [
      'Ręczne przepisywanie danych między systemami',
      'Raporty tworzone w Excelu',
      'Powtarzalne maile',
      'Procesy zależne od jednej osoby',
    ],
  },
  {
    type: 'process',
    badge: 'Dajemy gwarancję — nie zarobisz, nie płacisz.',
    headline: 'Nie wdrażamy AI dla efektu.',
    headline2: 'Wdrażamy je, żebyś zarabiał od pierwszego dnia.',
    steps: [
      { icon: 'Search', label: 'Analizujemy', text: 'Mapujemy Twoje procesy i szukamy miejsc, gdzie tracisz pieniądze.' },
      { icon: 'Scissors', label: 'Upraszczamy', text: 'Usuwamy zbędne kroki, zanim cokolwiek automatyzujemy.' },
      { icon: 'Zap', label: 'Automatyzujemy', text: 'Wdrażamy rozwiązania AI tam, gdzie przyniosą największy zwrot.' },
      { icon: 'BarChart3', label: 'Mierzymy', text: 'Monitorujemy wyniki i optymalizujemy na bieżąco.' },
    ],
    riskTitle: 'Twoje ryzyko: 0%',
    riskDescription: 'Jeśli w ciągu pierwszych 90 dni nie zobaczysz mierzalnych oszczędności — zwracamy 100% inwestycji. Bez pytań, bez gwiazdek.',
    proof: 'Firmy wdrażające z nami automatyzację redukują koszty operacyjne średnio o 30%.',
  },
  {
    type: 'results',
    title: 'Konkretne rezultaty, nie obietnice',
    metrics: [
      { value: 'do 150 000 zł', label: 'rocznych oszczędności' },
      { value: '0%', label: 'ryzyko' },
      { value: '90 dni', label: 'do pierwszych wyników' },
    ],
    outcomes: [
      { title: 'Niższe koszty operacyjne', detail: 'Automatyzacja powtarzalnych procesów redukuje potrzebę ręcznej pracy.' },
      { title: 'Skalowanie bez zatrudniania', detail: 'Rośnij szybciej bez proporcjonalnego wzrostu zespołu.' },
      { title: 'Pełna kontrola nad procesami', detail: 'Przejrzyste dashboardy i alerty zamiast chaosu w arkuszach.' },
    ],
    qualificationTitle: 'Pracujemy z firmami, które:',
    qualificationItems: [
      'Zatrudniają 5–100 osób',
      'Mają powtarzalne procesy (administracja, sprzedaż, raporty)',
      'Chcą rosnąć bez budowania działu IT',
    ],
  },
  {
    type: 'cta',
    headline: 'Gotowy na zmianę?',
    description: 'Umów bezpłatną rozmowę i sprawdź, ile możesz zaoszczędzić.',
    button: { text: 'Zacznij teraz', href: '/survey/89d6d1e9-82a0-4ff7-ac85-0ed4bd6462b4' },
    trustLine: 'Bezpłatna analiza. Bez zobowiązań.',
  },
  {
    type: 'footer',
    description:
      'Automatyzujemy procesy operacyjne w firmach i zwiększamy ich dochód bez zatrudniania nowych ludzi.',
    privacy: 'Polityka prywatności',
    terms: 'Regulamin',
    copyright: '© 2026 Halo Efekt. Wszelkie prawa zastrzeżone.',
  },
]
