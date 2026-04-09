/**
 * Centralized user-facing strings for Website application.
 * All strings are in Polish (default language).
 *
 * Rules:
 * - console.error messages stay in English (developer-facing)
 * - API route HTTP error messages stay in English (technical)
 * - All user-facing strings must use correct Polish diacritics
 */

export const messages = {
  survey: {
    // submit.ts / actions.ts
    surveyNotFound: 'Nie znaleziono ankiety. Spróbuj ponownie.',
    saveFailed: 'Nie udało się zapisać odpowiedzi. Spróbuj ponownie.',
    unexpectedError: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
    // SurveyForm
    submitFailed: 'Nie udało się wysłać ankiety. Spróbuj ponownie.',
    submissionError: 'Błąd wysyłania',
    submitting: 'Wysyłanie…',
    submitSurvey: 'Wyślij ankietę',
    questionProgress: (filled: number, total: number) =>
      `Wypełniono ${filled} z ${total} wymaganych pól`,
    datePickerPlaceholder: 'Wybierz datę',
    // SurveyError
    surveyUnavailable: 'Ankieta niedostępna',
    // queries.ts — validation error messages
    errorNotFound: 'Link do ankiety jest nieprawidłowy lub nie istnieje.',
    errorInactive: 'Ta ankieta nie przyjmuje już odpowiedzi.',
    errorExpired: 'Link do tej ankiety wygasł.',
    errorMaxSubmissions: 'Ta ankieta osiągnęła limit wypełnień.',
    errorSurveyNotFound: 'Nie znaleziono ankiety.',
    privacyPolicyLinkText: 'Polityka Prywatności',
  },

  calendar: {
    // CalendarBooking
    bookAppointment: 'Zarezerwuj wizytę',
    selectConvenientTime: 'Wybierz dogodny termin konsultacji',
    selectDate: 'Wybierz datę',
    selectDateHelp: 'Wybierz datę co najmniej jeden dzień od dziś',
    selectTime: 'Wybierz godzinę',
    calendarNotConnected: 'Kalendarz nie jest połączony dla tego prawnika. Skontaktuj się z obsługą.',
    loadTimesFailed: 'Nie udało się załadować dostępnych godzin. Spróbuj ponownie.',
    noTimesAvailable: 'Brak dostępnych godzin w tym dniu. Wybierz inną datę.',
    connectionError: 'Nie można załadować godzin. Sprawdź połączenie.',
    noSlotsForDate: 'Brak dostępnych terminów w tym dniu. Spróbuj inną datę.',
    calendarError: 'Błąd kalendarza',
    selectedAppointment: 'Wybrany termin:',
    at: 'o',
    yourName: 'Twoje imię i nazwisko',
    yourNamePlaceholder: 'Jan Kowalski',
    emailAddress: 'Adres email',
    emailPlaceholder: 'jan@przyklad.pl',
    additionalNotes: 'Dodatkowe uwagi (opcjonalne)',
    notesPlaceholder: 'Opisz swoją sprawę lub szczególne wymagania…',
    selectTimeSlot: 'Wybierz termin',
    bookingError: 'Błąd rezerwacji',
    bookingFailed: 'Rezerwacja nie powiodła się. Spróbuj ponownie.',
    confirming: 'Potwierdzanie wizyty…',
    confirmAppointment: 'Potwierdź wizytę',
    unexpectedError: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
    // Success
    appointmentConfirmed: 'Wizyta potwierdzona!',
    appointmentBookedSuccess: 'Twoja wizyta została pomyślnie zarezerwowana.',
    dateLabel: 'Data',
    timeLabel: 'Godzina',
    // booking.ts errors (user-visible, codes stay in English)
    surveyNotFound: 'Nie znaleziono ankiety',
    responseNotFound: 'Nie znaleziono odpowiedzi lub nie pasuje do ankiety',
    availabilityCheckFailed: 'Nie udało się sprawdzić dostępności',
    slotUnavailable: 'Wybrany termin nie jest już dostępny',
    appointmentCreationFailed: 'Nie udało się utworzyć wizyty',
  },

  success: {
    thankYou: 'Dziękujemy za wypełnienie ankiety!',
    surveySubmitted:
      'Twoje odpowiedzi zostały zapisane. Oto co wydarzy się dalej:',
    surveySubmittedWithBooking:
      'Twoje odpowiedzi zostały zapisane. Wybierz teraz termin konsultacji — to najszybszy sposób, by omówić Twoje potrzeby.',
    whatsNext: 'Co dalej?',
    whatsNextStep1: 'Analiza odpowiedzi',
    whatsNextStep1Description:
      'Nasz zespół zapozna się z przesłanymi informacjami w ciągu 24 godzin.',
    whatsNextStep2: 'Email z podsumowaniem',
    whatsNextStep2Description:
      'Na Twój adres email wyślemy potwierdzenie wraz z dalszymi krokami.',
    whatsNextStep3: 'Kontakt w sprawie oferty',
    whatsNextStep3Description:
      'Umówimy się na rozmowę, by omówić szczegóły i dopasować ofertę do Twoich potrzeb.',
    noCalendarReassurance:
      'Nie musisz nic więcej robić — odezwiemy się do Ciebie.',
    metaTitle: 'Ankieta wysłana - Halo Efekt',
    metaDescription: 'Twoja ankieta została pomyślnie wysłana.',
  },

  metadata: {
    surveyUnavailableTitle: 'Ankieta niedostępna - Halo Efekt',
    surveyUnavailableDescription: 'Ta ankieta nie jest już dostępna.',
    defaultSurveyDescription: 'Wypełnij ankietę, aby przekazać swoje dane.',
  },

  legal: {
    notFoundTitle: 'Strona nie znaleziona | Halo Efekt',
  },

  cookie: {
    message:
      'Używamy plików cookies niezbędnych do działania strony oraz narzędzi analitycznych — za Twoją zgodą. ' +
      'Korzystając ze strony, akceptujesz te zasady.',
    privacyLink: 'Polityka prywatności',
    accept: 'Rozumiem',
    moreInfo: 'Więcej info',
  },

  validation: {
    fieldRequired: 'To pole jest wymagane',
    invalidEmail: 'Podaj prawidłowy adres email',
    emailRequired: 'Email jest wymagany',
    invalidPhone: 'Podaj prawidłowy numer telefonu',
    phoneRequired: 'Numer telefonu jest wymagany',
    selectOption: 'Wybierz opcję',
    selectAtLeastOne: 'Wybierz co najmniej jedną opcję',
    consentRequired: 'Musisz wyrazić zgodę, aby wysłać formularz',
    nameTooShort: 'Imię musi mieć co najmniej 2 znaki',
    nameTooLong: 'Imię jest za długie',
    notesTooLong: 'Notatki nie mogą przekraczać 500 znaków',
    selectPlaceholder: 'Wybierz opcję…',
  },
} as const
