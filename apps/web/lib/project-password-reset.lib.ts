/**
 * The project-app password reset views (ADR 0011 § 5, § 6): "Forgot password?" on the hosted
 * password view, the request view it opens, and the view the emailed link opens.
 *
 * The slice that added the password view (slice 4) kept its "Forgot password?" link hidden
 * behind {@link PROJECT_PASSWORD_RESET_AVAILABLE} until these views existed; they do now.
 */
export const PROJECT_PASSWORD_RESET_AVAILABLE = true;

/** The request view: an email field, answered the same for every address. */
export const PROJECT_PASSWORD_RESET_PATH = '/auth/project/forgot-password';

// The view the emailed link opens, `/auth/project/reset-password`, is not linked to from the
// web app: the API builds the link (`PROJECT_PASSWORD_RESET_PATH` in its reset handler).

export const PROJECT_PASSWORD_SIGN_IN_PATH = '/auth/project/password';

export interface ProjectPasswordResetHrefInput {
  clientId: string;
  redirectUri: string;
  /** The API's state id from the authorize step. */
  state?: string | null;
  clientState?: string | null;
  scope?: string | null;
}

export interface ProjectPasswordSignInHrefInput extends ProjectPasswordResetHrefInput {
  /** The client's own PKCE challenge, so a fresh authorize step keeps it. */
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
}

function buildQuery(input: ProjectPasswordSignInHrefInput): string {
  const query = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
  });
  if (input.state?.trim()) query.set('state', input.state.trim());
  if (input.clientState?.trim()) query.set('client_state', input.clientState.trim());
  if (input.scope?.trim()) query.set('scope', input.scope.trim());
  if (input.codeChallenge?.trim()) {
    query.set('code_challenge', input.codeChallenge.trim());
    if (input.codeChallengeMethod?.trim()) {
      query.set('code_challenge_method', input.codeChallengeMethod.trim());
    }
  }
  return query.toString();
}

/** The reset request view's path (locale-less, for the i18n `Link`), carrying the same params as the password view. */
export function buildProjectPasswordResetHref(input: ProjectPasswordResetHrefInput): string {
  return `${PROJECT_PASSWORD_RESET_PATH}?${buildQuery(input)}`;
}

/**
 * The password sign-in view's path, for "Back to sign in" and "Continue to sign in". Without
 * `state` the view starts the authorize step again, which is what a person who followed an
 * emailed link in another tab or browser needs.
 */
export function buildProjectPasswordSignInHref(input: ProjectPasswordSignInHrefInput): string {
  return `${PROJECT_PASSWORD_SIGN_IN_PATH}?${buildQuery(input)}`;
}

/**
 * The reset token from the URL fragment of the emailed link (`#token=...`). It is in the
 * fragment so that it is sent to no server, logged by no proxy and put in no `Referer`.
 */
export function readProjectPasswordResetToken(hash: string): string | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  const token = new URLSearchParams(fragment).get('token')?.trim();
  return token ? token : null;
}
