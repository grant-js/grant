const PROJECT_OAUTH_RELAY_PATH = '/auth/project/relay';
const PROJECT_OAUTH_ENTRY_PATH = '/auth/project';
export const PROJECT_OAUTH_MESSAGE_TYPE = 'grant-project-oauth';

export interface ProjectAuthorizeUrlInput {
  apiBase: string;
  clientId: string;
  redirectUri: string;
  state: string;
  provider: string;
  locale: string;
  codeChallenge: string;
  scope?: string | null;
  codeChallengeMethod?: 'S256';
}

export interface ProjectOAuthEntryUrlInput {
  locale: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string | null;
}

export function buildProjectAuthorizeUrl(input: ProjectAuthorizeUrlInput): string {
  const query = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state: input.state,
    provider: input.provider,
    response_type: 'code',
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod ?? 'S256',
    locale: input.locale,
  });
  if (input.scope?.trim()) query.set('scope', input.scope.trim());
  const base = input.apiBase.replace(/\/$/, '');
  return `${base}/api/auth/project/authorize?${query.toString()}`;
}

export function buildProjectOAuthEntryPath(input: ProjectOAuthEntryUrlInput): string {
  const query = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state: input.state,
  });
  if (input.scope?.trim()) query.set('scope', input.scope.trim());
  return `/${input.locale}${PROJECT_OAUTH_ENTRY_PATH}?${query.toString()}`;
}

function getProjectOAuthRelayPath(locale: string): string {
  return `/${locale}${PROJECT_OAUTH_RELAY_PATH}`;
}

export function getProjectOAuthRelayUrl(locale: string, origin?: string): string {
  const path = getProjectOAuthRelayPath(locale);
  const resolvedOrigin =
    origin ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  if (!resolvedOrigin) return path;
  return `${resolvedOrigin.replace(/\/$/, '')}${path}`;
}

export function isProjectOAuthRelayRedirectUri(
  uri: string,
  locale: string,
  origin?: string
): boolean {
  try {
    const resolvedOrigin =
      origin ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const url = new URL(uri, resolvedOrigin);
    const expectedOrigin = new URL(resolvedOrigin).origin;
    return (
      url.origin === expectedOrigin &&
      (url.pathname === getProjectOAuthRelayPath(locale) ||
        url.pathname === PROJECT_OAUTH_RELAY_PATH)
    );
  } catch {
    return false;
  }
}

export function pickProjectOAuthTestRedirectUri(
  redirectUris: string[],
  locale: string,
  origin?: string
): string {
  const relayUrl = getProjectOAuthRelayUrl(locale, origin);
  const relayMatch = redirectUris.find(
    (uri) => uri === relayUrl || isProjectOAuthRelayRedirectUri(uri, locale, origin)
  );
  return relayMatch ?? redirectUris[0] ?? '';
}
