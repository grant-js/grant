import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const PKCE_UNRESERVED = /^[A-Za-z0-9\-._~]{43,128}$/;

export function isValidPkceVerifier(verifier: string): boolean {
  return PKCE_UNRESERVED.test(verifier);
}

export function isValidPkceChallenge(challenge: string): boolean {
  return PKCE_UNRESERVED.test(challenge);
}

export function createS256Challenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!isValidPkceVerifier(verifier) || typeof challenge !== 'string' || challenge.length === 0) {
    return false;
  }
  const computed = Buffer.from(createS256Challenge(verifier));
  const expected = Buffer.from(challenge);
  if (computed.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(computed, expected);
}

export function hashProjectOAuthRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateProjectOAuthRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateAuthorizationCode(): string {
  return randomBytes(32).toString('base64url');
}
