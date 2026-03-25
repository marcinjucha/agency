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
    // SurveyError
    surveyUnavailable: 'Ankieta niedostępna',
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
    // Success
    appointmentConfirmed: 'Wizyta potwierdzona!',
    appointmentBookedSuccess: 'Twoja wizyta została pomyślnie zarezerwowana.',
    dateLabel: 'Data',
    timeLabel: 'Godzina',
    // booking.ts errors (technical, keep in English for API responses)
  },

  validation: {
    fieldRequired: 'To pole jest wymagane',
    invalidEmail: 'Podaj prawidłowy adres email',
    emailRequired: 'Email jest wymagany',
    invalidPhone: 'Podaj prawidłowy numer telefonu',
    phoneRequired: 'Numer telefonu jest wymagany',
    selectOption: 'Wybierz opcję',
    selectAtLeastOne: 'Wybierz co najmniej jedną opcję',
    nameTooShort: 'Imię musi mieć co najmniej 2 znaki',
    nameTooLong: 'Imię jest za długie',
    notesTooLong: 'Notatki nie mogą przekraczać 500 znaków',
  },
} as const
