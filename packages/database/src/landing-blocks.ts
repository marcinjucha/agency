import type { Tables } from './types'

export type NavbarBlock = {
  type: 'navbar'
  ctaText: string
  ctaHref: string
}

export type HeroBlock = {
  type: 'hero'
  metric1Value: string
  metric1Label: string
  metric2Value: string
  metric2Label: string
  qualifiers: string[]
  badNews: string
  goodNews: string
  valueProp: string
  guarantee: string
  cta: string
}

export type ProblemsBlock = {
  type: 'problems'
  title: string
  stat: string
  items: string[]
  framing: string
  hook: string
}

export type GuaranteeBlock = {
  type: 'guarantee'
  badge: string
  headline: string
  headline2: string
  description: string
  steps: string[]
  proof: string
}

export type RiskReversalBlock = {
  type: 'riskReversal'
  title: string
  step1Label: string
  step1Text: string
  step2Label: string
  step2Text: string
  closing: string
  bold: string
  transparency: string
}

export type BenefitsBlock = {
  type: 'benefits'
  title: string
  items: string[]
  closing: string
}

export type QualificationBlock = {
  type: 'qualification'
  title: string
  items: string[]
  separator: string
  techItem: string
}

export type CtaBlock = {
  type: 'cta'
  headline: string
  description: string
  button: string
  subtext: string
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
  | ProblemsBlock
  | GuaranteeBlock
  | RiskReversalBlock
  | BenefitsBlock
  | QualificationBlock
  | CtaBlock
  | FooterBlock

export type LandingBlockType = LandingBlock['type']

export type LandingPage = Omit<Tables<'landing_pages'>, 'blocks'> & { blocks: LandingBlock[] }

export const BLOCK_TYPE_LABELS: Record<LandingBlockType, string> = {
  navbar: 'Nawigacja',
  hero: 'Sekcja Hero',
  problems: 'Problemy',
  guarantee: 'Gwarancja',
  riskReversal: 'Odwrócenie ryzyka',
  benefits: 'Korzyści',
  qualification: 'Kwalifikacja',
  cta: 'Wezwanie do działania',
  footer: 'Stopka',
}

export const DEFAULT_BLOCKS: LandingBlock[] = [
  {
    type: 'navbar',
    ctaText: 'Umów rozmowę',
    ctaHref: '#cta',
  },
  {
    type: 'hero',
    metric1Value: '150 000 zł',
    metric1Label: 'średnia roczna oszczędność',
    metric2Value: '0%',
    metric2Label: 'Twoje ryzyko',
    qualifiers: [
      'Jeśli masz firmę, którą chcesz rozwijać,',
      'Zatrudniasz pracowników',
      'Czujesz, że powinieneś więcej zarabiać, ale coś Ci umyka',
      'Słyszałeś o AI, rozwoju technologii, ale zastanawiasz się — Jak to niby ma u Ciebie zadziałać?',
    ],
    badNews: 'to mamy złą wiadomość. Jesteś jak większość.',
    goodNews:
      'Mamy też dobrą. Prawdopodobnie możemy Ci pomóc. Bez ryzyka, że zapłacisz za coś, co nie będzie działać.',
    valueProp:
      'Automatyzujemy procesy operacyjne w firmach zatrudniających od kilku do 100 osób i zwiększamy ich dochód bez zatrudniania nowych ludzi.',
    guarantee:
      'Jeśli nie zobaczymy u Ciebie realnego potencjału oszczędności — nie zaczniemy współpracy, a Ty nic nie płacisz.',
    cta: 'Umów bezpłatną rozmowę',
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
    framing:
      'To nie są \'drobne zadania\'. To stały koszt, który rośnie wraz z firmą i bezpośrednio obniża marżę.',
    hook: 'Im szybciej rośniesz, tym większy chaos operacyjny i tym mniej kontrolujesz — brzmi znajomo?',
  },
  {
    type: 'guarantee',
    badge: 'Dajemy gwarancję — nie zarobisz, nie płacisz.',
    headline: 'Nie wdrażamy AI dla efektu.',
    headline2: 'Wdrażamy je, żebyś zarabiał od pierwszego dnia.',
    description: 'Nie sprzedajemy narzędzi ani technologii...',
    steps: [
      'Analizujemy jeden konkretny proces',
      'Upraszczamy go',
      'Automatyzujemy',
      'Mierzymy realną oszczędność czasu i kosztów',
    ],
    proof: 'Firmy zatrudniające kilku pracowników, które wdrażają z nami automatyzację, redukują koszty operacyjne średnio o 180 000 zł rocznie w ciągu pierwszych 8–12 miesięcy.',
  },
  {
    type: 'riskReversal',
    title: 'Dlaczego Twoje ryzyko wynosi 0%?',
    step1Label: 'Krok 1',
    step1Text: 'Zaczynamy od bezpłatnej analizy...',
    step2Label: 'Krok 2',
    step2Text: 'Pokazujemy, gdzie realnie uciekają pieniądze...',
    closing: 'Jeśli nie jesteśmy w stanie wygenerować mierzalnej wartości — nie podejmujemy współpracy.',
    bold: 'Nie sprzedajemy wdrożeń!',
    transparency:
      'Sprzedajemy wynik finansowy, który sam obliczysz. Wszystko transparentne. Bez niedomówień.',
  },
  {
    type: 'benefits',
    title: 'Co zyskujesz?',
    items: [
      'Ten sam zespół',
      'Niższe koszty operacyjne',
      'Wyższą marżę',
      'Większą kontrolę nad procesami',
      'Możliwość skalowania firmy bez zwiększania zatrudnienia i kosztów',
      'Kontrolę nad swoim biznesem',
    ],
    closing: 'Automatyzacja nie zastępuje ludzi, ale zastąpi nudną, powtarzalną pracę.',
  },
  {
    type: 'qualification',
    title: 'Czy się kwalifikujesz?',
    items: [
      'Zatrudniasz do 100 osób',
      'Chcesz rozwijać firmę, ale masz obawy...',
      'Masz powtarzalne procesy administracyjne, sprzedażowe lub raportowe',
      'Nie chcesz budować osobnego działu IT',
      'Chcesz zwiększyć zysk bez zatrudniania dodatkowych ludzi i zwiększania kosztów',
    ],
    separator: 'oraz',
    techItem:
      'Jeśli Twoja firma działa w oparciu o maile, dokumenty, CRM i powtarzalne zadania...',
  },
  {
    type: 'cta',
    headline: 'Ten sam zespół. Większa skala. Wyższy wynik finansowy.',
    description: 'Jeśli ludzie w Twojej firmie są stale zajęci...',
    button: 'Umów bezpłatną rozmowę',
    subtext: 'Sprawdź, ile realnie możesz odzyskać w ciągu najbliższych 12 miesięcy',
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
