/**
 * Project OAuth (authorization code + S256 PKCE) for the Integration Guide.
 *
 * The guide starts the flow with `GrantClient.signInWithProjectApp`, which navigates this tab to
 * the Grant web app. After consent Grant redirects to the docs callback page
 * (`/integration/oauth-callback.html`) with `?code=&state=`. The verifier never leaves this
 * origin: it is kept in sessionStorage under the OAuth `state` and removed once it is used.
 */
import { withBase } from 'vitepress';

const PKCE_UNRESERVED = /^[A-Za-z0-9\-._~]{43,128}$/;
const PKCE_PREFIX = 'grant-docs:pkce:';

/** Page that receives the Project OAuth redirect. A real `.html` file, so redirect_uri matches exactly on any static host. */
export const OAUTH_CALLBACK_PATH = '/integration/oauth-callback.html';
export const GUIDE_PATH = '/integration/guide.html';

export interface PkceSession {
  verifier: string;
  clientId: string;
  redirectUri: string;
}

export interface ProjectOAuthTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

/** Absolute callback URL for the current docs origin (empty during SSR). */
export function getOAuthCallbackUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${withBase(OAUTH_CALLBACK_PATH)}`;
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
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export async function generatePkcePair(): Promise<{ verifier: string; challenge: string }> {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Web Crypto getRandomValues is required to generate a PKCE verifier');
  }
  if (!crypto.subtle) {
    throw new Error('Web Crypto SubtleCrypto (a secure context) is required for an S256 challenge');
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

export function createOAuthState(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `state-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function persistPkceSession(state: string, session: PkceSession): void {
  getSessionStorage()?.setItem(PKCE_PREFIX + state, JSON.stringify(session));
}

export function loadPkceSession(state: string): PkceSession | null {
  const storage = getSessionStorage();
  const raw = storage?.getItem(PKCE_PREFIX + state);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PkceSession;
    if (!parsed.verifier || !parsed.clientId || !parsed.redirectUri) return null;
    return parsed;
  } catch {
    storage?.removeItem(PKCE_PREFIX + state);
    return null;
  }
}

export function clearPkceSession(state: string): void {
  getSessionStorage()?.removeItem(PKCE_PREFIX + state);
}

/**
 * POST /api/auth/project/token with grant_type=authorization_code and the stored verifier.
 *
 * Project apps are confidential clients: the endpoint also requires `client_secret`. The guide
 * sends it from the browser because the reader's own tutorial app is the only thing at stake; a
 * real application does this exchange on its backend and never ships the secret to a browser.
 */
export async function exchangeAuthorizationCode(input: {
  apiBase: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<ProjectOAuthTokens> {
  const res = await fetch(`${input.apiBase.replace(/\/+$/, '')}/api/auth/project/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: input.clientId,
      ...(input.clientSecret ? { client_secret: input.clientSecret } : {}),
      redirect_uri: input.redirectUri,
      code: input.code,
      code_verifier: input.codeVerifier,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { accessToken?: string; tokenType?: string; expiresIn?: number; scope?: string };
    message?: string;
    error?: string;
    details?: string;
  };
  if (!res.ok || !body.data?.accessToken) {
    if (body.details === 'invalid_client') {
      throw new Error(
        'The token endpoint rejected the client credentials (invalid_client). Run Step 9 again so the guide captures this app’s client secret, then sign in again.'
      );
    }
    const reason = body.message || body.error || `Token exchange failed (${res.status})`;
    throw new Error(body.details ? `${reason}: ${body.details}` : reason);
  }
  return {
    accessToken: body.data.accessToken,
    tokenType: body.data.tokenType || 'Bearer',
    expiresIn: body.data.expiresIn ?? 0,
    scope: body.data.scope,
  };
}

/** Decode a JWT payload for display only (no signature check). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      Array.from(atob(padded), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    );
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
