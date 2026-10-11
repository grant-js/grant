import { describe, expect, it } from 'vitest';

import {
  createS256Challenge,
  generateAuthorizationCode,
  generateProjectOAuthRefreshToken,
  hashProjectOAuthRefreshToken,
  isValidPkceVerifier,
  verifyPkceS256,
} from '@/lib/project-oauth-pkce.lib';

const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('project-oauth-pkce.lib', () => {
  it('creates the RFC 7636 S256 challenge', () => {
    expect(createS256Challenge(RFC_VERIFIER)).toBe(RFC_CHALLENGE);
  });

  it('verifies a matching S256 verifier', () => {
    expect(verifyPkceS256(RFC_VERIFIER, RFC_CHALLENGE)).toBe(true);
  });

  it('rejects a wrong verifier', () => {
    expect(verifyPkceS256('a'.repeat(43), RFC_CHALLENGE)).toBe(false);
  });

  it('rejects a verifier outside 43-128 unreserved characters', () => {
    expect(isValidPkceVerifier('too-short')).toBe(false);
    expect(verifyPkceS256('too-short', RFC_CHALLENGE)).toBe(false);
    expect(verifyPkceS256(`${RFC_VERIFIER}!`, RFC_CHALLENGE)).toBe(false);
  });

  it('hashes refresh tokens with SHA-256 hex and does not store plaintext', () => {
    const token = generateProjectOAuthRefreshToken();
    const hash = hashProjectOAuthRefreshToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashProjectOAuthRefreshToken(token)).toBe(hash);
    expect(hashProjectOAuthRefreshToken(`${token}x`)).not.toBe(hash);
  });

  it('generates unpadded base64url secrets', () => {
    const refresh = generateProjectOAuthRefreshToken();
    const code = generateAuthorizationCode();
    expect(refresh).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(refresh).not.toBe(code);
  });
});
