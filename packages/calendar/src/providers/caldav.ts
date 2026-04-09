/**
 * CalDAVCalendarProvider
 *
 * Implements CalendarProvider using tsdav library.
 * Creates a fresh DAVClient per method call (stateless — no session to manage).
 *
 * iCalendar VEVENT parsing is minimal: extracts UID, SUMMARY, DESCRIPTION,
 * DTSTART, DTEND. Sufficient for the booking availability + event creation flows.
 */

import { DAVClient } from 'tsdav'
import { ok, err, ResultAsync } from 'neverthrow'
import type {
  CalendarProvider,
  CalendarEvent,
  CalendarEventInput,
  CalendarInfo,
  CalDAVCredentials,
} from '../types'

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCalDAVProvider(credentials: CalDAVCredentials): CalendarProvider {
  const { serverUrl, username, password, calendarUrl } = credentials

  // --- Internal helpers ---

  function createClient(): DAVClient {
    return new DAVClient({
      serverUrl,
      credentials: { username, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    })
  }

  async function loginClient(): Promise<DAVClient> {
    const client = createClient()
    await client.login()
    return client
  }

  function mapError(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown CalDAV error'
  }

  function getCalendarUrl(): string {
    if (!calendarUrl) {
      throw new Error('No calendar URL configured. Run discoverCalendars() first.')
    }
    return calendarUrl
  }

  // --- CalendarProvider implementation ---

  const provider: CalendarProvider = {
    getEvents(start: string, end: string) {
      return ResultAsync.fromPromise(
        (async () => {
          const client = await loginClient()

          const objects = await client.fetchCalendarObjects({
            calendar: {
              url: getCalendarUrl(),
            },
            timeRange: {
              start: start,
              end: end,
            },
          })

          return objects
            .map((obj) => parseVEvent(obj.data))
            .filter((event): event is CalendarEvent => event !== null)
        })(),
        mapError
      )
    },

    createEvent(event: CalendarEventInput) {
      return ResultAsync.fromPromise(
        (async () => {
          const client = await loginClient()
          const uid = generateUID()
          const icalData = buildVEvent(uid, event)

          await client.createCalendarObject({
            calendar: { url: getCalendarUrl() },
            filename: `${uid}.ics`,
            iCalString: icalData,
          })

          return { eventId: uid }
        })(),
        mapError
      )
    },

    deleteEvent(eventId: string) {
      return ResultAsync.fromPromise(
        (async () => {
          const client = await loginClient()
          const url = getCalendarUrl()

          // Fetch all objects and find the one with matching UID
          const objects = await client.fetchCalendarObjects({
            calendar: { url },
          })

          const target = objects.find((obj) => {
            const uid = extractField(obj.data, 'UID')
            return uid === eventId
          })

          if (!target || !target.url) {
            throw new Error(`Calendar event with UID ${eventId} not found`)
          }

          await client.deleteCalendarObject({
            calendarObject: { url: target.url, etag: target.etag || '' },
          })
        })(),
        mapError
      )
    },

    testConnection() {
      return ResultAsync.fromPromise(
        (async () => {
          const client = await loginClient()
          const calendars = await client.fetchCalendars()

          if (!calendars || calendars.length === 0) {
            throw new Error('No calendars found on CalDAV server')
          }

          return { success: true as const }
        })(),
        mapError
      )
    },

    discoverCalendars() {
      return ResultAsync.fromPromise(
        (async () => {
          const client = await loginClient()
          const calendars = await client.fetchCalendars()

          return calendars.map(
            (cal): CalendarInfo => ({
              url: cal.url,
              displayName: (typeof cal.displayName === 'string' ? cal.displayName : null) || cal.url,
              color: (typeof cal.calendarColor === 'string' ? cal.calendarColor : undefined),
            })
          )
        })(),
        mapError
      )
    },
  }

  return provider
}

// ---------------------------------------------------------------------------
// iCalendar helpers
// ---------------------------------------------------------------------------

/** Extract a field value from raw iCalendar text */
function extractField(icalData: string, fieldName: string): string | undefined {
  // Handle unfolded lines (RFC 5545: lines starting with space/tab are continuations)
  const unfolded = icalData.replace(/\r?\n[ \t]/g, '')

  const regex = new RegExp(`^${fieldName}[;:](.*)$`, 'm')
  const match = unfolded.match(regex)
  if (!match) return undefined

  // Strip parameters (e.g., DTSTART;TZID=Europe/Warsaw:20260410T100000)
  const value = match[1]
  const colonIndex = value.indexOf(':')

  // If the match already consumed the colon (fieldName matched up to it),
  // the value is the entire match[1]. Otherwise strip parameter prefix.
  if (fieldName === 'UID' || fieldName === 'SUMMARY' || fieldName === 'DESCRIPTION') {
    return value
  }

  return colonIndex >= 0 ? value.substring(colonIndex + 1) : value
}

/** Parse a single VEVENT from iCalendar data into CalendarEvent (or null if unparseable) */
function parseVEvent(icalData: string): CalendarEvent | null {
  if (!icalData || !icalData.includes('VEVENT')) return null

  const uid = extractField(icalData, 'UID')
  if (!uid) return null

  const summary = extractField(icalData, 'SUMMARY') || ''
  const description = extractField(icalData, 'DESCRIPTION')
  const dtstart = extractField(icalData, 'DTSTART')
  const dtend = extractField(icalData, 'DTEND')

  return {
    id: uid,
    summary,
    description: description || undefined,
    start: dtstart ? toISODateTime(dtstart) : '',
    end: dtend ? toISODateTime(dtend) : '',
  }
}

/** Convert iCalendar datetime (20260410T100000Z or 20260410T100000) to ISO 8601 */
function toISODateTime(dt: string): string {
  // Already ISO format
  if (dt.includes('-')) return dt

  // Basic format: 20260410T100000Z → 2026-04-10T10:00:00Z
  const cleaned = dt.trim()
  if (cleaned.length >= 15) {
    const year = cleaned.substring(0, 4)
    const month = cleaned.substring(4, 6)
    const day = cleaned.substring(6, 8)
    const hour = cleaned.substring(9, 11)
    const minute = cleaned.substring(11, 13)
    const second = cleaned.substring(13, 15)
    const suffix = cleaned.endsWith('Z') ? 'Z' : ''
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${suffix}`
  }

  return dt
}

/** Build an iCalendar VEVENT string */
function buildVEvent(uid: string, event: CalendarEventInput): string {
  const now = formatICalDateTime(new Date())
  const dtstart = formatICalDateTime(new Date(event.start))
  const dtend = formatICalDateTime(new Date(event.end))

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HaloEfekt//CalDAV//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICalText(event.summary)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
  }

  if (event.attendees?.length) {
    for (const attendee of event.attendees) {
      const cn = attendee.name ? `;CN=${escapeICalText(attendee.name)}` : ''
      lines.push(`ATTENDEE${cn}:mailto:${attendee.email}`)
    }
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}

/** Format Date to iCalendar basic datetime (UTC) */
function formatICalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Escape special characters in iCalendar text values (RFC 5545 Section 3.3.11) */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/** Generate a unique ID for CalDAV events */
function generateUID(): string {
  const random = Math.random().toString(36).substring(2, 10)
  const timestamp = Date.now()
  return `${timestamp}-${random}@haloefekt.pl`
}
