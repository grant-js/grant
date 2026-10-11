const PKCE_UNRESERVED = /^[A-Za-z0-9\-._~]{43,128}$/;
const VERIFIER_PREFIX = 'grant:example:pkce:';

export interface ExamplePkceSession {
  verifier: string;
  clientId: string;
  redirectUri: string;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export async function generateExamplePkcePair(): Promise<{ verifier: string; challenge: string }> {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Web Crypto getRandomValues is required to generate a PKCE verifier');
  }
  if (!crypto.subtle) {
    throw new Error('Web Crypto SubtleCrypto is required to create an S256 challenge');
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = toBase64Url(bytes);
  if (!PKCE_UNRESERVED.test(verifier)) {
    throw new Error('PKCE verifier must be 43-128 unreserved characters');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: toBase64Url(new Uint8Array(digest)) };
}

export function createExampleOAuthState(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `state-${Date.now()}`;
}

export function persistExamplePkceSession(state: string, session: ExamplePkceSession): void {
  const storage = getSessionStorage();
  if (!storage || !state) return;
  storage.setItem(VERIFIER_PREFIX + state, JSON.stringify(session));
}

export function loadExamplePkceSession(state: string): ExamplePkceSession | null {
  const storage = getSessionStorage();
  const raw = storage?.getItem(VERIFIER_PREFIX + state);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExamplePkceSession;
    if (!parsed.verifier || !parsed.clientId || !parsed.redirectUri) return null;
    return parsed;
  } catch {
    storage?.removeItem(VERIFIER_PREFIX + state);
    return null;
  }
}

export function clearExamplePkceSession(state: string): void {
  getSessionStorage()?.removeItem(VERIFIER_PREFIX + state);
}

export function getGrantApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_GRANT_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

export async function exchangeExampleAuthorizationCode(input: {
  apiBase: string;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; tokenType: string; expiresIn: number; scope?: string }> {
  const res = await fetch(`${input.apiBase}/api/auth/project/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      code: input.code,
      code_verifier: input.codeVerifier,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: {
      accessToken?: string;
      tokenType?: string;
      expiresIn?: number;
      scope?: string;
    };
    message?: string;
    translationKey?: string;
  };
  if (!res.ok || !body.data?.accessToken) {
    throw new Error(body.message || body.translationKey || `Token exchange failed (${res.status})`);
  }
  return {
    accessToken: body.data.accessToken,
    tokenType: body.data.tokenType || 'Bearer',
    expiresIn: body.data.expiresIn ?? 0,
    scope: body.data.scope,
  };
}
