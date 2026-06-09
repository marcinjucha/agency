// Landing page content — Polish, non-technical. Hardcoded (post-pivot: content no
// longer lives in the CMS; only the survey CTA URL stays dynamic).
//
// Source of truth: Claude Design handoff `Halo Efekt - Landing.html` (the `LC` object
// in project/landing/content.jsx). Copy is ported VERBATIM — positioning is
// "usprawnianie pracy za pomocą AI / zrobione za Ciebie", no pricing, no invented
// numbers, no word "procesy", no em-dash inserts (deliberately removed during design).
//
// Icon keys map to lucide-react icons in the section components (see ./components/icons.ts).

export type IconKey =
  | 'users'
  | 'file'
  | 'layers'
  | 'spark'
  | 'brain'
  | 'trend'
  | 'hand'
  | 'heart'
  | 'compass'

export interface CardItem {
  n: string
  icon: IconKey
  area: string
  promise: string
  body: string
  gains: string[]
}

export interface ProcessStep {
  n: string
  label: string
  text: string
}

export interface WhyItem {
  icon: IconKey
  t: string
  d: string
}

export interface FaqItem {
  q: string
  a: string
}

export const landingContent = {
  nav: {
    links: [
      ['#obszary', 'Co usprawniamy'],
      ['#wspolpraca', 'Jak działamy'],
      ['#faq', 'FAQ'],
    ] as const,
    cta: 'Umów bezpłatny audyt',
  },
  hero: {
    eyebrow: 'Halo Efekt',
    headline: 'Usprawniamy pracę w Twojej firmie za pomocą sztucznej inteligencji',
    // The component highlights the "sztucznej inteligencji" fragment in accent color.
    headlineAccent: 'sztucznej inteligencji',
    sub: 'Zamieniamy powtarzalne, czasochłonne czynności w rozwiązania, które działają za Ciebie. Ty i Twój zespół zajmujecie się tym, co naprawdę ważne.',
    cta: 'Umów bezpłatny audyt',
    alt: 'Zobacz, co możemy usprawnić',
  },
  intro: {
    eyebrow: 'Co robimy',
    heading: 'Najpierw znajdujemy, gdzie ucieka Twój czas. Potem to usprawniamy.',
    lead: 'Większość firm traci godziny tygodniowo na te same, ręcznie wykonywane czynności:',
    examples: [
      'przepisywanie danych',
      'odpowiadanie na te same pytania',
      'pilnowanie kontaktu z klientami',
      'składanie ofert',
      'szukanie informacji w kilku miejscach naraz',
    ],
    close: 'My znajdujemy te miejsca i budujemy rozwiązania, które robią to za Ciebie: szybciej, dokładniej i bez Twojego udziału. Ty dostajesz gotowy efekt i więcej czasu.',
  },
  capabilities: {
    eyebrow: 'Co usprawniamy',
    lead: 'Powtarzalne czynności, które możemy zdjąć z Twojej głowy',
    items: [
      'Zbieranie zapytań',
      'Kwalifikacja klientów',
      'Przypomnienia o kontakcie',
      'Przygotowanie ofert',
      'Wysyłka ofert',
      'Podgląd zleceń',
      'Codzienne raporty',
      'Analiza danych',
      'Obsługa zapytań',
      'Pilnowanie kontaktu',
      'Firmowa baza wiedzy',
      'Wizualizacja wyników',
      'Powtarzalne czynności',
      'Odpowiedzi na częste pytania',
    ],
  },
  cards: {
    eyebrow: 'Co możemy usprawnić',
    title: 'Sześć obszarów, w których robimy największą różnicę',
    sub: 'Każdy obszar to konkretne rozwiązanie zbudowane pod to, jak naprawdę pracuje Twoja firma.',
    items: [
      {
        n: '01',
        icon: 'users',
        area: 'Pozyskiwanie i obsługa klientów',
        promise: 'Więcej klientów bez zwiększania budżetu na reklamę',
        body: 'Budujemy rozwiązania, które zbierają zapytania, sprawdzają, którzy klienci są naprawdę zainteresowani, i pilnują kontaktu z każdym z nich. Dzięki temu mniej osób „znika” po wysłaniu formularza, a więcej zostaje Twoimi klientami.',
        gains: [
          'Żaden klient nie ginie między mailami, telefonami i wiadomościami',
          'Wszystkie zapytania w jednym, przejrzystym miejscu',
          'Automatyczne przypomnienia, żeby zawsze odezwać się na czas',
          'Więcej zapytań zamienionych w realnych klientów',
        ],
      },
      {
        n: '02',
        icon: 'file',
        area: 'Oferty i sprzedaż',
        promise: 'Oferta gotowa w minuty, nie w godziny',
        body: 'Tworzymy rozwiązania, które pomagają błyskawicznie przygotować ofertę, wysłać ją klientowi i przypilnować dalszego kontaktu. Masz pełną kontrolę nad tym, co dzieje się w sprzedaży Twojej firmy.',
        gains: [
          'Przygotowanie oferty skrócone z godzin do minut',
          'Spójne, profesjonalne oferty za każdym razem',
          'Automatyczne pilnowanie kontaktu po wysłaniu oferty',
          'Pełny obraz tego, co dzieje się w sprzedaży',
        ],
      },
      {
        n: '03',
        icon: 'layers',
        area: 'Zarządzanie zleceniami',
        promise: 'Wszystko, co dzieje się w firmie, w jednym widoku',
        body: 'Pokazujemy właścicielowi i zespołowi, co dokładnie dzieje się z każdym zleceniem. W jednym miejscu widać wszystkie realizacje i osoby za nie odpowiedzialne, bez dopytywania i szukania w wielu narzędziach.',
        gains: [
          'Podgląd na wszystkie zlecenia w jednym miejscu',
          'Jasność, kto i za co odpowiada',
          'Spokój, bo nic nie umyka i nic nie stoi w miejscu',
          'Sposób pracy dopasowany do tego, jak działa Twoja firma',
        ],
      },
      {
        n: '04',
        icon: 'spark',
        area: 'Szkolenia z AI i narzędzi',
        promise: 'Twój zespół, który umie korzystać z nowych narzędzi',
        body: 'Dobieramy narzędzia najlepiej dopasowane do Twojej firmy i uczymy zespół, jak ich używać w codziennej pracy. Zostajemy na pokładzie, z regularnymi szkoleniami i opieką.',
        gains: [
          'Narzędzia dobrane pod realne potrzeby Twojej firmy',
          'Zespół, który faktycznie z nich korzysta',
          'Regularne szkolenia, gdy pojawia się coś nowego',
          'Stałe wsparcie, a nie jednorazowe wdrożenie i zostawienie samemu sobie',
        ],
      },
      {
        n: '05',
        icon: 'brain',
        area: 'Sztuczna inteligencja w firmie',
        promise: 'AI tam, gdzie naprawdę przynosi oszczędności',
        body: 'Wdrażamy sztuczną inteligencję dokładnie tam, gdzie daje zauważalny zysk, a nie dlatego, że jest modna. Pokazujemy konkretne zastosowania, które realnie zwiększają skuteczność Twojej firmy.',
        gains: [
          'AI wdrożone tam, gdzie naprawdę się opłaca',
          'Konkretne zastosowania, nie obietnice bez pokrycia',
          'Zauważalne oszczędności czasu i pieniędzy',
          'Przewaga nad firmami, które wciąż robią wszystko ręcznie',
        ],
      },
      {
        n: '06',
        icon: 'trend',
        area: 'Analiza i wizualizacja danych',
        promise: 'Jedno spojrzenie i wiesz, na czym stoisz',
        body: 'Jeśli pracujesz z klientami, masz zespół sprzedażowy albo sprzedajesz produkty, to masz dane. Dajemy Ci narzędzia, dzięki którym ich analiza staje się przyjemna. Skupiamy się na tym, co dla Ciebie najważniejsze, i pokazujemy to w czytelnej, wizualnej formie.',
        gains: [
          'Najważniejsze wyniki przedstawione w przejrzystej, graficznej formie',
          'Jedno spojrzenie zamiast godzin grzebania w tabelach',
          'Decyzje oparte na danych, a nie na przeczuciu',
          'Obraz tego, co działa, a co wymaga poprawy',
        ],
      },
    ] satisfies CardItem[],
  },
  process: {
    eyebrow: 'Jak wygląda współpraca',
    title: 'Od pierwszej rozmowy do działającego rozwiązania',
    steps: [
      { n: '1', label: 'Bezpłatny audyt', text: 'Poznajemy Twoją firmę i wspólnie znajdujemy miejsca, które zjadają najwięcej czasu. Bezpłatnie i bez zobowiązań.' },
      { n: '2', label: 'Propozycja', text: 'Pokazujemy konkretne rozwiązanie i to, co dokładnie Ci da, zanim cokolwiek zaczniemy budować.' },
      { n: '3', label: 'Wdrożenie', text: 'Budujemy rozwiązanie i uruchamiamy je w Twojej firmie. Pokazujemy zespołowi, jak z niego korzystać.' },
      { n: '4', label: 'Opieka', text: 'Pilnujemy, żeby wszystko działało, i rozwijamy rozwiązanie w miarę tego, jak rośnie Twoja firma.' },
    ] satisfies ProcessStep[],
  },
  why: {
    eyebrow: 'Dlaczego my',
    title: 'Cztery rzeczy, które robimy inaczej',
    items: [
      { icon: 'hand', t: 'Mówimy po ludzku', d: 'Żadnego technicznego żargonu. Tłumaczymy wszystko tak, żeby było jasne.' },
      { icon: 'trend', t: 'Zaczynamy od Twojego zysku', d: 'Wdrażamy tylko to, co realnie oszczędza czas i pieniądze.' },
      { icon: 'heart', t: 'Zostajemy na dłużej', d: 'Po wdrożeniu nie zostawiamy Cię samego. Dbamy, żeby wszystko działało, i rozwijamy rozwiązanie razem z Twoją firmą.' },
      { icon: 'compass', t: 'Dopasowujemy się do Ciebie', d: 'Pracujemy na narzędziach, których już używasz, zamiast wszystko wywracać.' },
    ] satisfies WhyItem[],
  },
  cta: {
    eyebrow: 'Bezpłatny audyt',
    title: 'Zobaczmy, co da się usprawnić w Twojej firmie',
    desc: 'Umów się na bezpłatny audyt. Bez zobowiązań i bez technicznego żargonu. Przejdziemy przez Twoją firmę, pokażemy, gdzie tracisz czas, i co da się z tym zrobić.',
    cta: 'Umów bezpłatny audyt',
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Najczęstsze pytania',
    items: [
      { q: 'Czy muszę znać się na technologii?', a: 'Nie. Całą techniczną stronę bierzemy na siebie. Ty mówisz, co Cię męczy w codziennej pracy, a my budujemy rozwiązanie i tłumaczymy wszystko prostym językiem.' },
      { q: 'Ile to kosztuje?', a: 'Każda firma jest inna, dlatego nie mamy sztywnego cennika. Po bezpłatnym audycie pokazujemy konkretne rozwiązanie wraz z wyceną, więc dokładnie wiesz, za co płacisz i co Ci to da.' },
      { q: 'Czy moje dane są bezpieczne?', a: 'Tak. Rozwiązania budujemy tak, żeby Twoje dane zostały u Ciebie i pod Twoją kontrolą. Bezpieczeństwo omawiamy na samym początku współpracy.' },
      { q: 'Ile trwa wdrożenie?', a: 'To zależy od tego, co usprawniamy. Pierwsze, prostsze rozwiązania potrafią działać już po kilku dniach. Zawsze mówimy uczciwie, ile zajmie dany element, zanim zaczniemy.' },
      { q: 'Czy będziecie pracować na narzędziach, których już używam?', a: 'Tak. Nie zmuszamy Cię do zmiany wszystkiego. Łączymy się z tym, czego już używasz, i usprawniamy to, co dzieje się wokół.' },
      { q: 'Co jeśli będę potrzebować zmian później?', a: 'Zostajemy na pokładzie. Opiekujemy się rozwiązaniami i rozwijamy je razem z Twoją firmą, nie znikamy po wdrożeniu.' },
      { q: 'Od czego zacząć?', a: 'Od bezpłatnego audytu. Przejdziemy przez Twoją firmę, pokażemy, gdzie tracisz najwięcej czasu, i czy możemy z tym pomóc. Bez zobowiązań.' },
    ] satisfies FaqItem[],
  },
  footer: {
    brand: 'Halo Efekt',
    tagline: 'Usprawniamy pracę w firmach za pomocą sztucznej inteligencji.',
    contactLabel: 'Masz pytania? Napisz lub zadzwoń.',
    email: 'kontakt@haloefekt.pl',
    cta: 'Umów bezpłatny audyt',
  },
} as const
