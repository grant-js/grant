const PKCE_UNRESERVED = /^[A-Za-z0-9\-._~]{43,128}$/;

export const PROJECT_OAUTH_PKCE_CURRENT_KEY = 'grant:project-oauth:pkce:current';
export const PROJECT_OAUTH_PKCE_STATE_PREFIX = 'grant:project-oauth:pkce:';
export const PROJECT_OAUTH_EMAIL_VIA_AUTHORIZE_KEY = 'grant:project-oauth:email-via-authorize';
export const PROJECT_OAUTH_TEST_TOKENS_PREFIX = 'grant:project-oauth:tokens:';

export interface ProjectOAuthPkcePair {
  verifier: string;
  challenge: string;
}

export interface ProjectOAuthPkceSession extends ProjectOAuthPkcePair {
  clientId: string;
  redirectUri: string;
  state: string;
}

export interface ProjectOAuthTokenSnapshot {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
  state?: string;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export function createProjectOAuthState(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return createPkceVerifier();
}

export function createPkceVerifier(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Web Crypto getRandomValues is required to generate a PKCE verifier');
  }
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function createS256Challenge(verifier: string): Promise<string> {
  if (!PKCE_UNRESERVED.test(verifier)) {
    throw new Error('PKCE verifier must be 43-128 unreserved characters');
  }
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto SubtleCrypto is required to create an S256 challenge');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}

export async function generatePkcePair(): Promise<ProjectOAuthPkcePair> {
  const verifier = createPkceVerifier();
  const challenge = await createS256Challenge(verifier);
  return { verifier, challenge };
}

export function pkceStateStorageKey(state: string): string {
  return `${PROJECT_OAUTH_PKCE_STATE_PREFIX}${state}`;
}

function readJson<T>(key: string): T | null {
  const storage = getSessionStorage();
  const raw = storage?.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    storage?.removeItem(key);
    return null;
  }
}

export function persistProjectOAuthPkceSession(session: ProjectOAuthPkceSession): void {
  const storage = getSessionStorage();
  if (!storage) return;
  const serialized = JSON.stringify(session);
  storage.setItem(pkceStateStorageKey(session.state), serialized);
  storage.setItem(PROJECT_OAUTH_PKCE_CURRENT_KEY, serialized);
}

export function loadProjectOAuthPkceSession(state?: string | null): ProjectOAuthPkceSession | null {
  if (state?.trim()) {
    const byState = readJson<ProjectOAuthPkceSession>(pkceStateStorageKey(state.trim()));
    if (byState?.verifier) return byState;
  }
  return readJson<ProjectOAuthPkceSession>(PROJECT_OAUTH_PKCE_CURRENT_KEY);
}

export function clearProjectOAuthPkceSession(state?: string | null): void {
  const storage = getSessionStorage();
  if (!storage) return;
  if (state?.trim()) storage.removeItem(pkceStateStorageKey(state.trim()));
  storage.removeItem(PROJECT_OAUTH_PKCE_CURRENT_KEY);
}

export async function ensureProjectOAuthPkceSession(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): Promise<ProjectOAuthPkceSession> {
  const existing = loadProjectOAuthPkceSession(input.state);
  if (
    existing &&
    existing.clientId === input.clientId &&
    existing.redirectUri === input.redirectUri &&
    existing.state === input.state &&
    PKCE_UNRESERVED.test(existing.verifier) &&
    existing.challenge
  ) {
    persistProjectOAuthPkceSession(existing);
    return existing;
  }

  const pair = await generatePkcePair();
  const session: ProjectOAuthPkceSession = {
    ...pair,
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    state: input.state,
  };
  persistProjectOAuthPkceSession(session);
  return session;
}

export function markProjectOAuthEmailViaAuthorize(): void {
  getSessionStorage()?.setItem(PROJECT_OAUTH_EMAIL_VIA_AUTHORIZE_KEY, '1');
}

export function isProjectOAuthEmailViaAuthorize(): boolean {
  return getSessionStorage()?.getItem(PROJECT_OAUTH_EMAIL_VIA_AUTHORIZE_KEY) === '1';
}

export function persistProjectOAuthTestTokens(
  state: string,
  tokens: ProjectOAuthTokenSnapshot
): void {
  const storage = getSessionStorage();
  if (!storage || !state) return;
  storage.setItem(PROJECT_OAUTH_TEST_TOKENS_PREFIX + state, JSON.stringify(tokens));
}

export function loadProjectOAuthTestTokens(state: string): ProjectOAuthTokenSnapshot | null {
  return readJson<ProjectOAuthTokenSnapshot>(PROJECT_OAUTH_TEST_TOKENS_PREFIX + state);
}

export function clearProjectOAuthPkceStorageForTests(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (
      key === PROJECT_OAUTH_PKCE_CURRENT_KEY ||
      key === PROJECT_OAUTH_EMAIL_VIA_AUTHORIZE_KEY ||
      key?.startsWith(PROJECT_OAUTH_PKCE_STATE_PREFIX) ||
      key?.startsWith(PROJECT_OAUTH_TEST_TOKENS_PREFIX)
    ) {
      keys.push(key);
    }
  }
  for (const key of keys) storage.removeItem(key);
}
