# Calendar Package - Multi-Provider Calendar Integration

Shared package for calendar integration across CMS and Website apps. Supports multiple calendar providers (Google Calendar, CalDAV) via a unified `CalendarProvider` interface.

## Architecture

```
packages/calendar/src/
├── types.ts              # CalendarProvider interface, credential shapes, CalendarConnection
├── providers/
│   ├── index.ts          # CalendarProviderFactory (strategy pattern)
│   ├── google.ts         # GoogleCalendarProvider (googleapis, token refresh)
│   └── caldav.ts         # CalDAVProvider (tsdav, iCalendar VEVENT parsing)
├── connection-manager.ts # Resolve connections from calendar_connections_decrypted view
├── index.ts              # Public exports
├── oauth.ts              # Google OAuth token refresh (used by GoogleCalendarProvider)
├── events.ts             # Legacy Google events (kept on disk, NOT exported)
├── token-manager.ts      # Legacy token manager (kept on disk, NOT exported)
└── __tests__/            # 30 tests (providers + factory + connection manager)
```

## The Weird Parts

### CalendarProvider returns ResultAsync (not Promise)

All provider methods return `ResultAsync<T, string>` from neverthrow. Callers use `.isOk()` / `.isErr()` instead of try/catch. This makes error handling explicit — you can't accidentally ignore a failed calendar operation.

### CalDAV: Fresh DAVClient per method call

`createCalDAVProvider` creates a new `DAVClient` and calls `login()` for every operation (getEvents, createEvent, etc.). Stateless by design — no session to manage, no connection pooling.

**Why:** CalDAV uses Basic auth (username/password per request). No token lifecycle, no refresh needed. Simplicity > efficiency for low-volume booking calendars.

### Google: Token refresh via callback, not DB

`GoogleCalendarProvider` checks token expiry before each API call. When expired, it refreshes internally using `refreshAccessToken` and reports new credentials via an `onTokenRefresh` callback. The provider itself does zero DB operations.

**Why:** Keeps providers pure (credentials in, events out). The caller (CMS/Website) decides how to persist refreshed tokens — via `update_calendar_credentials` RPC (pgcrypto encrypted).

### Credentials stored encrypted in DB (not in this package)

`calendar_connections.credentials_encrypted` is BYTEA (pgcrypto). This package reads from `calendar_connections_decrypted` view (which decrypts). Writes go through `upsert_calendar_connection` / `update_calendar_credentials` RPC functions.

### connection-manager accepts Supabase client as parameter

Different callers use different clients: CMS uses authenticated server client (tenant-scoped RLS), Website booking uses service_role (no auth context). The connection-manager doesn't create its own client — caller injects it.

### BusyEvent mapping at API boundary

Provider returns flat `CalendarEvent { start: string, end: string }`. The slot calculator expects `BusyEvent { start: { dateTime: string } }`. Mapping happens in the slots API route, not in this package.

## Graceful Degradation (Still Applies)

- **Booking:** Appointment is PRIMARY, calendar event is SECONDARY. Calendar failure = log + continue.
- **Slots:** Calendar is REQUIRED for busy-event filtering. But if connection fails, all work-hour slots are returned (better than no slots).

## Quick Reference

**Provider Types:** `'google'` | `'caldav'` (TEXT, extensible without migration)

**Credential Shapes:**
- Google: `{ access_token, refresh_token, expiry_date, scope, email }`
- CalDAV: `{ serverUrl, username, password, calendarUrl? }`

**Connection Resolution:**
- `getConnectionForSurveyLink(surveyLinkId, supabase)` — survey booking flow
- `getConnectionById(id, supabase)` — direct lookup
- `getConnectionsForTenant(supabase)` — CMS connection list
- `getDefaultConnection(supabase)` — tenant default

**Factory:**
```typescript
import { createCalendarProvider, getConnectionForSurveyLink } from '@agency/calendar'

const connection = await getConnectionForSurveyLink(linkId, supabase)
const provider = createCalendarProvider(connection, { onTokenRefresh })
const events = await provider.getEvents(start, end)
```

**Dependencies:** googleapis (Google), tsdav (CalDAV), neverthrow (ResultAsync), @supabase/supabase-js
