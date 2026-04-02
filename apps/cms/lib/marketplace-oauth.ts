import { SignJWT, jwtVerify } from 'jose'

/** Marketplace identifier — defined inline to avoid lib/ → features/ import (ADR-005) */
type MarketplaceId = 'olx' | 'allegro'

type OAuthState = {
  tenantId: string
  marketplace: MarketplaceId
  nonce: string
}

function getOAuthSecret(): Uint8Array {
  const secret = process.env.MARKETPLACE_OAUTH_STATE_SECRET
  if (!secret) throw new Error('MARKETPLACE_OAUTH_STATE_SECRET not configured')
  return new TextEncoder().encode(secret)
}

export async function createOAuthState(
  tenantId: string,
  marketplace: MarketplaceId
): Promise<string> {
  return new SignJWT({ tenantId, marketplace, nonce: crypto.randomUUID() })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .setIssuedAt()
    .sign(getOAuthSecret())
}

export async function verifyOAuthState(state: string): Promise<OAuthState> {
  const { payload } = await jwtVerify(state, getOAuthSecret())
  return {
    tenantId: payload.tenantId as string,
    marketplace: payload.marketplace as MarketplaceId,
    nonce: payload.nonce as string,
  }
}

export function getCallbackRedirectUri(): string {
  const host = process.env.HOST_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!host) throw new Error('HOST_URL or NEXT_PUBLIC_APP_URL not configured')
  return `${host}/api/marketplace/callback`
}
