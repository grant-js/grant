import { afterEach, describe, expect, it } from 'vitest';

import {
  clearProjectOAuthPkceStorageForTests,
  createS256Challenge,
  ensureProjectOAuthPkceSession,
  generatePkcePair,
  loadProjectOAuthPkceSession,
  loadProjectOAuthTestTokens,
  persistProjectOAuthPkceSession,
  persistProjectOAuthTestTokens,
  toBase64Url,
} from './project-oauth-pkce.lib';

const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

afterEach(() => {
  clearProjectOAuthPkceStorageForTests();
});

describe('toBase64Url', () => {
  it('encodes without padding and uses URL-safe alphabet', () => {
    expect(toBase64Url(new Uint8Array([0xfb, 0xff, 0xef]))).toBe('-__v');
  });
});

describe('createS256Challenge', () => {
  it('matches the RFC 7636 appendix B vector', async () => {
    await expect(createS256Challenge(RFC_VERIFIER)).resolves.toBe(RFC_CHALLENGE);
  });

  it('rejects a verifier outside 43-128 unreserved characters', async () => {
    await expect(createS256Challenge('too-short')).rejects.toThrow(/43-128/);
  });
});

describe('generatePkcePair', () => {
  it('creates an unreserved verifier and matching S256 challenge', async () => {
    const pair = await generatePkcePair();
    expect(pair.verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
    await expect(createS256Challenge(pair.verifier)).resolves.toBe(pair.challenge);
  });
});

describe('project OAuth PKCE session storage', () => {
  it('persists by state and as the current session', async () => {
    const session = await ensureProjectOAuthPkceSession({
      clientId: 'app_1',
      redirectUri: 'https://app.example/cb',
      state: 'state-1',
    });
    expect(loadProjectOAuthPkceSession('state-1')).toEqual(session);
    expect(loadProjectOAuthPkceSession()).toEqual(session);
  });

  it('stores a tenant-supplied code_challenge without rotating a local verifier', async () => {
    const session = await ensureProjectOAuthPkceSession({
      clientId: 'app_1',
      redirectUri: 'https://app.example/cb',
      state: 'state-ext',
      challenge: RFC_CHALLENGE,
    });
    expect(session.challenge).toBe(RFC_CHALLENGE);
    expect(session.verifier).toBe('');
    expect(loadProjectOAuthPkceSession('state-ext')?.challenge).toBe(RFC_CHALLENGE);
  });

  it('reuses a matching stored session instead of rotating the verifier', async () => {
    persistProjectOAuthPkceSession({
      verifier: RFC_VERIFIER,
      challenge: RFC_CHALLENGE,
      clientId: 'app_1',
      redirectUri: 'https://app.example/cb',
      state: 'state-1',
    });
    const session = await ensureProjectOAuthPkceSession({
      clientId: 'app_1',
      redirectUri: 'https://app.example/cb',
      state: 'state-1',
    });
    expect(session.verifier).toBe(RFC_VERIFIER);
  });

  it('stores Test OAuth token snapshots by state', () => {
    persistProjectOAuthTestTokens('state-1', {
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
    expect(loadProjectOAuthTestTokens('state-1')).toMatchObject({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });
});
