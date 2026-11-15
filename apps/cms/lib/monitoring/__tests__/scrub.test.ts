// Ported with lib/monitoring/scrub.ts from course-platform (same rules, same cases).
import { describe, expect, it } from 'vitest'
import { scrubBreadcrumb, scrubEvent, withoutQuery } from '../scrub'

describe('scrubEvent', () => {
  it('drops request headers, cookies, body and query, keeps the path', () => {
    const out = scrubEvent({
      request: {
        url: 'https://cms.example/auth/confirm?token_hash=abc&email=jan@x.pl',
        headers: { authorization: 'Bearer secret', cookie: 'sb=1' },
        cookies: { sb: '1' },
        data: { email: 'jan@x.pl', nip: '5260250274' },
        query_string: 'email=jan@x.pl',
        method: 'POST',
      },
    })
    expect(out).toEqual({ request: { url: 'https://cms.example/auth/confirm', method: 'POST' } })
  })

  it('keeps only the user id', () => {
    expect(scrubEvent({ user: { id: 'u-1', email: 'jan@x.pl', ip_address: '1.2.3.4', username: 'Jan' } })).toEqual({ user: { id: 'u-1' } })
    expect(scrubEvent({ user: { email: 'jan@x.pl' } })).toEqual({})
  })

  it('removes emails from exception messages and stack-frame variables entirely', () => {
    const out = scrubEvent({
      exception: { values: [{ value: 'duplicate key (email)=(jan@x.pl)', stacktrace: { frames: [{ function: 'f', vars: { email: 'jan@x.pl' } }] } }] },
      tags: { requestId: 'r-1' },
    })
    expect(out).toEqual({ exception: { values: [{ value: 'duplicate key (email)=(<email>)', stacktrace: { frames: [{ function: 'f' }] } }] }, tags: { requestId: 'r-1' } })
  })
})

describe('scrubBreadcrumb', () => {
  it('strips the query from navigation and request breadcrumbs and drops their data', () => {
    expect(scrubBreadcrumb({ category: 'navigation', from: '/a?x=1', to: '/account?email=a@b.pl' })).toEqual({ category: 'navigation', from: '/a', to: '/account' })
    expect(scrubBreadcrumb({ category: 'fetch', message: 'GET /x for a@b.pl', data: { url: '/x?y=1', status_code: 200 } })).toEqual({ category: 'fetch', message: 'GET /x for <email>' })
  })
})

describe('withoutQuery', () => {
  it('cuts the query and the fragment', () => {
    expect(withoutQuery('/p?a=1#b')).toBe('/p')
    expect(withoutQuery('/p#b')).toBe('/p')
  })
})
