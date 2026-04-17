/** Polish UI strings for the Jacek bookshop */
export const messages = {
  common: {
    loading: 'Ładowanie...',
    error: 'Wystąpił błąd',
    notFound: 'Nie znaleziono',
    backToHome: 'Wróć na stronę główną',
  },
  products: {
    title: 'Książki',
    featured: 'Najnowsze publikacje',
    seeAll: 'Zobacz wszystkie książki',
    empty: 'Brak produktów do wyświetlenia',
    noProducts: 'Brak produktów',
    viewDetails: 'Zobacz szczegóły',
    buyBook: 'Kup książkę',
    download: 'Pobierz',
    price: 'Cena',
    free: 'Bezpłatne',
    allCategories: 'Wszystkie',
    backToList: 'Powrót do listy',
    externalLink: 'Kup teraz',
    digitalDownload: 'Pobierz',
    tags: 'Tagi',
  },
  search: {
    placeholder: 'Szukaj książek...',
    noResults: 'Nie znaleziono książek dla zapytania',
  },
  categories: {
    title: 'Kategorie',
    all: 'Wszystkie',
  },
  about: {
    label: 'O Autorze',
    name: 'Jacek Jucha',
    photoAlt: 'Jacek Jucha',
    intro: [
      'Nazywam się Jacek Jucha i chciałbym zachęcić Cię do lektury moich książek wydawanych przez ostatnie dwie dekady.',
      'Napisałem je z myślą o\u00a0„ocaleniu od zapomnienia” – jak to ładnie nazwała moja Koleżanka Magdalena Kątnik-Kowalska – ludzi i\u00a0zdarzeń, które odbyły się w\u00a0minionym XX wieku.',
    ],
    booksIntro: 'Chronologicznie wygląda to następująco:',
    books: [
      'jako autor: Sport szkolny w\u00a0mieście i\u00a0gminie Leżajsk (1998r.), Sąd w\u00a0Leżajsku (2021r.)',
      'i\u00a0współautor: 100 lat sportu w\u00a0Leżajsku (2002), Dzieje sportu w\u00a0Leżajsku (2009r.), LKS Błękit Żołynia na tle rozwoju sportu w\u00a0gminie (2011r.)',
    ],
    closing: [
      'Z\u00a0wykształcenia nauczyciel dyplomowany, z\u00a0zamiłowania regionalista, amator – historyk i\u00a0ornitolog.',
      'Moja praca ornitologa\u00a0– amatora została nagrodzona odznaką „Pomurnik” Małopolskiego Towarzystwa Ornitologicznego w\u00a0Krakowie.',
    ],
    mottoLabel: 'Motto mojej codzienności:',
    mottoQuote: '„Panie pomóż mi być takim człowiekiem, za jakiego bierze mnie mój pies”',
    mottoSource: '(słowa pochodzą z\u00a0książki „S@motność w\u00a0Sieci” – J.\u00a0L.\u00a0Wiśniewskiego)',
  },
  cookie: {
    message: 'Ta strona używa plików cookies w celach analitycznych.',
    accept: 'Rozumiem',
    moreInfo: 'Więcej informacji',
    privacyLink: 'Polityce prywatności',
  },
  notFound: {
    title: 'Nie znaleziono strony',
    description: 'Strona, której szukasz, nie istnieje lub została przeniesiona.',
  },
  footer: {
    copyright: '© {year} Jacek Jucha. Wszelkie prawa zastrzeżone.',
    rights: 'Wszelkie prawa zastrzeżone.',
    privacyPolicy: 'Polityka prywatności',
  },
} as const
