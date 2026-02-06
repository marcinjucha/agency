# @agency/calendar

Google Calendar integration utilities for Legal-Mind applications.

## Purpose

Shared calendar functionality used by both CMS and Website apps:
- Token management with automatic refresh
- Handles 1-hour token expiry transparently
- Structured error handling (no throws)

## Files

```
packages/calendar/
├── src/
│   ├── index.ts           # Public exports
│   └── token-manager.ts   # Token refresh logic
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

Already available in monorepo workspace:

```typescript
import { getValidAccessToken } from '@agency/calendar'
import type { TokenResult } from '@agency/calendar'
```

## Usage

### Server Actions (CMS/Website)

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@agency/calendar'
import { refreshAccessToken } from '@/lib/google-calendar/oauth'

export async function bookAppointment(userId: string, slot: TimeSlot) {
  const supabase = await createClient() // Server client

  // Get valid token (auto-refreshes if expired)
  const result = await getValidAccessToken(userId, supabase, refreshAccessToken)

  if (result.error) {
    return { success: false, error: result.error }
  }

  // Use result.accessToken for Google Calendar API
  const response = await fetch('https://www.googleapis.com/calendar/v3/events', {
    headers: {
      Authorization: `Bearer ${result.accessToken}`,
    },
    // ...
  })

  return { success: true }
}
```

### TanStack Query (CMS only)

```typescript
'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getValidAccessToken } from '@agency/calendar'
import { refreshAccessToken } from '@/lib/google-calendar/oauth'

export function CalendarSlots() {
  const supabase = createClient() // Browser client

  const { data, error } = useQuery({
    queryKey: ['calendar-slots'],
    queryFn: async () => {
      const result = await getValidAccessToken(userId, supabase, refreshAccessToken)
      if (result.error) throw new Error(result.error)

      // Fetch slots using result.accessToken
      const response = await fetch('...')
      return response.json()
    },
  })

  // ...
}
```

## API

### getValidAccessToken()

```typescript
function getValidAccessToken(
  userId: string,
  supabase: SupabaseClient<Database>,
  refreshAccessToken: (refreshToken: string) => Promise<string>
): Promise<TokenResult>
```

**Parameters:**
- `userId` - User ID to fetch token for
- `supabase` - Supabase client (Browser or Server)
- `refreshAccessToken` - Function to refresh token (from oauth.ts)

**Returns:**
- `{ accessToken: string }` - Valid token ready to use
- `{ error: string }` - Error message (calendar not connected, refresh failed, etc.)

**Behavior:**
1. Fetches token from `users.google_calendar_token`
2. Checks expiry with 5-minute buffer (300 seconds)
3. If expired/expiring soon:
   - Calls `refreshAccessToken(refresh_token)`
   - Updates database with new token
   - Returns new access token
4. If fresh:
   - Returns existing access token

### TokenResult

```typescript
type TokenResult =
  | { accessToken: string; error?: never }
  | { accessToken?: never; error: string }
```

Discriminated union for type-safe error handling.

## Error Handling

All errors return structured results (no throws):

| Error | Description |
|-------|-------------|
| `'No calendar connected'` | User has no Google Calendar token |
| `'Token refresh failed'` | Google API rejected refresh |
| `'Failed to fetch user token'` | Database query failed |
| `'Failed to save refreshed token'` | Database update failed |
| `'Internal error fetching token'` | Unexpected error |

## Database Schema

Token stored in `users.google_calendar_token` (JSONB):

```typescript
{
  access_token: string   // Valid for 1 hour
  refresh_token: string  // Valid indefinitely
  expires_at: number     // Unix timestamp (seconds)
  scope: string          // Granted permissions
}
```

## Design Decisions

### Why Shared Package?

- Used by both CMS (lawyer creates events) and Website (client books slots)
- Production-ready (not temporary cross-app import)
- Single source of truth for token logic

### Why Pass refreshAccessToken as Parameter?

- `oauth.ts` lives in `apps/cms/lib/` (app-specific)
- Packages cannot import from apps (architecture rule)
- Dependency injection pattern avoids circular imports

### Why 5-Minute Buffer?

- Prevents race conditions during API calls
- Google tokens expire at exactly 1 hour
- Buffer ensures token won't expire mid-request

## Next Steps

1. Update booking API to use `getValidAccessToken`
2. Update slots API to use `getValidAccessToken`
3. Remove manual token expiry checks from app code

## Related Files

- `apps/cms/lib/google-calendar/oauth.ts` - OAuth flow and token refresh
- `packages/database/src/types.ts` - Database types including token structure
- `supabase/migrations/*` - Users table with google_calendar_token column
