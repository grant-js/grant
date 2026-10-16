import type {
  ProjectAppPublicInfo,
  ProjectConsentInfo,
  ProjectConsentRedirectResult,
  ProjectPasswordSignInResult,
} from '@grantjs/schema';

import { getApiBaseUrl } from '@/lib/constants';

// Re-export for consumers that need the types
export type {
  ProjectAppPublicInfo,
  ProjectAppScopeInfo,
  ProjectConsentInfo,
  ProjectPasswordSignInResult,
} from '@grantjs/schema';

/** Response body shape from project OAuth API error responses. */
interface ProjectOAuthApiErrorBody {
  code?: string;
  details?: string;
  error?: string;
  message?: string;
}

/**
 * Error thrown by project OAuth API calls (app-info, consent-info, approve, deny).
 * Carries status and body so the web layer can map HTTP status/codes to user-facing messages.
 */
export class ProjectOAuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: ProjectOAuthApiErrorBody = {}
  ) {
    super(message);
    this.name = 'ProjectOAuthApiError';
  }
}

/** @deprecated Use ProjectOAuthApiError. Kept for backward compatibility. */
export const ProjectAppInfoError = ProjectOAuthApiError;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody;
    throw new ProjectOAuthApiError(
      body.error ?? body.details ?? body.message ?? res.statusText,
      res.status,
      body
    );
  }
  const data = await res.json();
  return (data.success && data.data ? data.data : data) as T;
}

const appInfoResolved = new Map<string, ProjectAppPublicInfo>();
const appInfoInflight = new Map<string, Promise<ProjectAppPublicInfo>>();
const consentInfoResolved = new Map<string, ProjectConsentInfo>();
const consentInfoInflight = new Map<string, Promise<ProjectConsentInfo>>();

function appInfoCacheKey(
  clientId: string,
  scope?: string | null,
  redirectUri?: string | null
): string {
  return `${clientId}\0${scope?.trim() ?? ''}\0${redirectUri?.trim() ?? ''}`;
}

function remember<T>(
  resolved: Map<string, T>,
  inflight: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const cached = resolved.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = load().then(
    (value) => {
      resolved.set(key, value);
      inflight.delete(key);
      return value;
    },
    (error: unknown) => {
      inflight.delete(key);
      throw error;
    }
  );
  inflight.set(key, promise);
  return promise;
}

export function peekProjectAppPublicInfo(
  clientId: string,
  scope?: string | null,
  redirectUri?: string | null
): ProjectAppPublicInfo | null {
  return appInfoResolved.get(appInfoCacheKey(clientId, scope, redirectUri)) ?? null;
}

export function peekProjectConsentInfo(consentToken: string): ProjectConsentInfo | null {
  return consentInfoResolved.get(consentToken) ?? null;
}

export async function getProjectAppPublicInfo(
  clientId: string,
  scope?: string | null,
  redirectUri?: string | null
): Promise<ProjectAppPublicInfo> {
  return remember(
    appInfoResolved,
    appInfoInflight,
    appInfoCacheKey(clientId, scope, redirectUri),
    () => {
      const apiBase = getApiBaseUrl();
      const params = new URLSearchParams({ client_id: clientId });
      if (scope?.trim()) params.set('scope', scope.trim());
      if (redirectUri?.trim()) params.set('redirect_uri', redirectUri.trim());
      const url = `${apiBase}/api/auth/project/app-info?${params.toString()}`;
      return fetchJson<ProjectAppPublicInfo>(url);
    }
  );
}

export async function getProjectConsentInfo(consentToken: string): Promise<ProjectConsentInfo> {
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}/api/auth/project/consent-info?consent_token=${encodeURIComponent(consentToken)}`;
  return remember(consentInfoResolved, consentInfoInflight, consentToken, () =>
    fetchJson<ProjectConsentInfo>(url)
  );
}

export function clearProjectOAuthPublicInfoCacheForTests(): void {
  appInfoResolved.clear();
  appInfoInflight.clear();
  consentInfoResolved.clear();
  consentInfoInflight.clear();
}

export async function approveProjectConsent(
  consentToken: string
): Promise<ProjectConsentRedirectResult> {
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/auth/project/consent/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent_token: consentToken }),
  });
  const data = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody & {
    success?: boolean;
    data?: ProjectConsentRedirectResult;
  };
  if (!res.ok) {
    throw new ProjectOAuthApiError(
      data.error ?? data.details ?? data.message ?? 'Approve failed',
      res.status,
      data
    );
  }
  return (data.success && data.data ? data.data : data) as ProjectConsentRedirectResult;
}

export async function denyProjectConsent(
  consentToken: string
): Promise<ProjectConsentRedirectResult> {
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/auth/project/consent/deny`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent_token: consentToken }),
  });
  const data = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody & {
    success?: boolean;
    data?: ProjectConsentRedirectResult;
  };
  if (!res.ok) {
    throw new ProjectOAuthApiError(
      data.error ?? data.details ?? data.message ?? 'Deny failed',
      res.status,
      data
    );
  }
  return (data.success && data.data ? data.data : data) as ProjectConsentRedirectResult;
}

export interface ProjectOAuthTokenResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  scope?: string;
}

export interface ExchangeProjectOAuthCodeInput {
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}

export interface ProjectEmailLinkRequestInput {
  clientId: string;
  redirectUri: string;
  email: string;
  locale: string;
  state?: string | null;
  clientState?: string | null;
  scope?: string | null;
}

export async function exchangeProjectOAuthCode(
  input: ExchangeProjectOAuthCodeInput
): Promise<ProjectOAuthTokenResult> {
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/auth/project/token`, {
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
  const data = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody & {
    success?: boolean;
    data?: ProjectOAuthTokenResult;
  };
  if (!res.ok) {
    throw new ProjectOAuthApiError(
      data.error ?? data.details ?? data.message ?? 'Token exchange failed',
      res.status,
      data
    );
  }
  return (data.success && data.data ? data.data : data) as ProjectOAuthTokenResult;
}

/** Requests a project-scoped magic-link email for the OAuth email-first login flow. */
export async function requestProjectEmailLink(input: ProjectEmailLinkRequestInput): Promise<void> {
  const apiBase = getApiBaseUrl();
  const trimmedState = input.state?.trim();
  const trimmedScope = input.scope?.trim();
  const res = await fetch(`${apiBase}/api/auth/project/email/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      ...(trimmedState && { state: trimmedState }),
      email: input.email,
      ...(input.clientState && { client_state: input.clientState }),
      ...(trimmedScope && { scope: trimmedScope }),
      locale: input.locale,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody;
    throw new ProjectOAuthApiError(
      data.details ?? data.error ?? data.message ?? 'Request failed',
      res.status,
      data
    );
  }
}

export interface ProjectPasswordSignInInput {
  clientId: string;
  redirectUri: string;
  /** The API's state id from the authorize step (it carries the PKCE challenge). */
  state: string;
  email: string;
  password: string;
  locale: string;
}

/**
 * Signs in to a project app with email and password. `401` is the one generic answer for
 * every identifier or password failure; `429` is the per-address limiter; `400` means the
 * authorize step's state is missing or expired (start the sign-in again).
 */
export async function signInProjectWithPassword(
  input: ProjectPasswordSignInInput
): Promise<ProjectPasswordSignInResult> {
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/auth/project/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      state: input.state,
      email: input.email,
      password: input.password,
      locale: input.locale,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody & {
    success?: boolean;
    data?: ProjectPasswordSignInResult;
  };
  if (!res.ok || !data.data) {
    throw new ProjectOAuthApiError(
      data.details ?? data.error ?? data.message ?? 'Sign-in failed',
      res.status,
      data
    );
  }
  return data.data;
}

export interface ProjectPasswordMfaInput {
  mfaToken: string;
  code: string;
  method: 'totp' | 'recovery';
}

/** Second step of a project password sign-in: a TOTP or recovery code for the pending challenge. */
export async function verifyProjectPasswordMfa(
  input: ProjectPasswordMfaInput
): Promise<ProjectConsentRedirectResult> {
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/auth/project/password/mfa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfa_token: input.mfaToken, code: input.code, method: input.method }),
  });
  const data = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody & {
    success?: boolean;
    data?: ProjectConsentRedirectResult;
  };
  if (!res.ok || !data.data?.redirectUrl) {
    throw new ProjectOAuthApiError(
      data.details ?? data.error ?? data.message ?? 'MFA verification failed',
      res.status,
      data
    );
  }
  return { redirectUrl: data.data.redirectUrl };
}

export interface ProjectPasswordResetRequestInput {
  clientId: string;
  redirectUri: string;
  email: string;
  locale: string;
  /** The API's state id of the sign-in the person came from; only carried into the emailed link. */
  state?: string | null;
}

/**
 * Asks for a project-app password reset link. Every address gets the same answer, so a
 * resolved promise says nothing about whether an email was sent; `429` is the limiter and
 * `400` a client or redirect URI the API does not accept.
 */
export async function requestProjectPasswordReset(
  input: ProjectPasswordResetRequestInput
): Promise<void> {
  const apiBase = getApiBaseUrl();
  const trimmedState = input.state?.trim();
  const res = await fetch(`${apiBase}/api/auth/project/password/forgot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      email: input.email,
      locale: input.locale,
      ...(trimmedState && { state: trimmedState }),
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody;
    throw new ProjectOAuthApiError(
      data.details ?? data.error ?? data.message ?? 'Request failed',
      res.status,
      data
    );
  }
}

export interface ProjectPasswordResetCompleteInput {
  clientId: string;
  redirectUri: string;
  token: string;
  password: string;
}

/**
 * Sets the project password from a reset token. `400` with code `BAD_USER_INPUT` is a
 * password the policy rejects (the token is not used up); any other `400` is an invalid,
 * expired or already used link; `429` is the limiter.
 */
export async function completeProjectPasswordReset(
  input: ProjectPasswordResetCompleteInput
): Promise<void> {
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/auth/project/password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      token: input.token,
      password: input.password,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ProjectOAuthApiErrorBody;
    throw new ProjectOAuthApiError(
      data.details ?? data.error ?? data.message ?? 'Reset failed',
      res.status,
      data
    );
  }
}
