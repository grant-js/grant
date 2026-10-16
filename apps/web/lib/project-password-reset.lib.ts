/**
 * The "Forgot password?" link of the hosted project password view (ADR 0011 § 5, § 6).
 *
 * The reset view it points at is ADR 0011 slice 5. Until that view exists the link is
 * **hidden**, not left pointing at a page that is not there: slice 5 adds the route at
 * {@link PROJECT_PASSWORD_RESET_PATH} and flips {@link PROJECT_PASSWORD_RESET_AVAILABLE}.
 */
export const PROJECT_PASSWORD_RESET_AVAILABLE = false;

export const PROJECT_PASSWORD_RESET_PATH = '/auth/project/forgot-password';

export interface ProjectPasswordResetHrefInput {
  clientId: string;
  redirectUri: string;
  /** The API's state id from the authorize step. */
  state?: string | null;
  clientState?: string | null;
  scope?: string | null;
}

/** The reset view's path (locale-less, for the i18n `Link`), carrying the same params as the password view. */
export function buildProjectPasswordResetHref(input: ProjectPasswordResetHrefInput): string {
  const query = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
  });
  if (input.state?.trim()) query.set('state', input.state.trim());
  if (input.clientState?.trim()) query.set('client_state', input.clientState.trim());
  if (input.scope?.trim()) query.set('scope', input.scope.trim());
  return `${PROJECT_PASSWORD_RESET_PATH}?${query.toString()}`;
}
