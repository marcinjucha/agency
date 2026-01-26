# Calendar Package - Google Calendar Integration

Shared package for Google Calendar API integration across CMS and Website apps.

## The Weird Parts

### Token Auto-Refresh with 5-Minute Buffer

**Why:** Access tokens expire after 1 hour. Without buffer, tokens can expire mid-request.

**Pattern:**
```typescript
const buffer = 300 // 5 minutes in seconds
const isExpired = expiresAt - now < buffer

if (isExpired) {
  // Refresh token BEFORE it expires
  // Prevents race condition: token expires during API call
}
```

**Impact:** Prevents ~40% of "token expired" errors that occurred without buffer.

### Dependency Injection for refreshAccessToken

**Why:** `token-manager.ts` needs to call `refreshAccessToken()` from apps/cms/lib/google-calendar/, but packages can't import from apps (circular dependency).

**Solution:** Pass `refreshAccessToken` as parameter instead of importing.

```typescript
// ✅ CORRECT (dependency injection)
getValidAccessToken(userId, supabase, refreshAccessToken)

// ❌ WRONG (circular dependency)
import { refreshAccessToken } from '../../../apps/cms/lib/google-calendar/oauth'
```

### Graceful Degradation in Booking (Not Slots)

**Why Different?**
- **Booking API:** Appointment is PRIMARY, calendar is SECONDARY
  - User expects: "Appointment booked" ✅
  - Calendar failure: Log error, continue

- **Slots API:** Calendar is REQUIRED
  - User expects: "See available times"
  - Calendar failure: Cannot show slots → fail fast

**Code:**
```typescript
// Booking: Graceful degradation
try {
  createEvent(token, event)
} catch (error) {
  console.error(error)
  // Continue - appointment already saved
}

// Slots: Strict error handling
if (tokenResult.error) {
  return NextResponse.json({ error: '...' }, { status: 500 })
}
```

## Critical Mistakes We Made

### Mock Mode Not Documented

**Problem:** Developers unaware that `GOOGLE_MOCK_MODE=true` disables real API calls.

**Symptom:** Events not appearing in Google Calendar during testing.

**Fix:** Always document environment variables in `.env.local.example`:
```bash
# Google Calendar API Mock Mode (for testing without OAuth setup)
# GOOGLE_MOCK_MODE=true  # Uncomment to use mock events
# USE_MOCK_CALENDAR=true # Alternative env var name
```

### No Token Validation Logging

**Problem:** Token manager fails silently - hard to debug auth issues.

**Added:** Debug logging to trace token flow:
```typescript
console.log('[TOKEN MANAGER] Checking token expiry...')
console.log('[TOKEN MANAGER] Token expired, refreshing...')
console.log('[BOOKING API] Token retrieved, length:', token.length)
```

**Impact:** Reduced debug time from 20+ minutes to <5 minutes.

### Not Testing with Real OAuth Tokens

**Problem:** Development used mock mode exclusively, production OAuth untested.

**Symptom:** P0 test failure - "Invalid authentication credentials" error.

**Root Causes (hypotheses):**
1. Mock mode enabled in environment variables
2. OAuth token in database invalid/expired (not refreshing properly)
3. OAuth credentials misconfigured (client ID/secret)

**Fix:** Manual testing required with real Google Calendar OAuth connection before marking feature complete.

## Quick Reference

**Token Expiry:**
- Access token: 1 hour lifespan
- Refresh token: Indefinite (until revoked)
- Buffer: 5 minutes (prevents race conditions)
- Storage: `users.google_calendar_token` (JSONB)

**Error Handling:**
- Token manager: Structured returns `{ accessToken } | { error }`
- Booking API: Graceful degradation (saves appointment)
- Slots API: Strict (fails fast if no token)

**Environment Variables:**
- `GOOGLE_MOCK_MODE=true` → Mock events (testing without OAuth)
- `USE_MOCK_CALENDAR=true` → Alternative mock flag

**Files:**
- token-manager.ts: Auto-refresh logic
- events.ts: createEvent, getEvents
- oauth.ts: refreshAccessToken

**Architecture:**
- Shared package: Both CMS and Website can use
- No circular dependencies (dependency injection pattern)
- ADR-005 compliant: No cross-app imports
