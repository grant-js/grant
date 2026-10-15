/**
 * A user can be signed in without owning any account: on a closed install
 * (`AUTH_PUBLIC_SIGNUP_ENABLED=false`) an identity that reached the platform without one
 * (a CDM import, a project-app user) is not given a Personal account at login. They keep
 * the user-scoped settings; everything account-scoped is refused by the API, and the
 * console does not offer it.
 */

/** Where an account-less user lands: the one settings page that is about them and the projects they belong to. */
export const ACCOUNTLESS_HOME = '/dashboard/settings/projects';

/** Settings pages that only make sense with an account. */
const ACCOUNT_SCOPED_SETTINGS_PATHS = ['/dashboard/settings/account'];

/** Dashboard areas that are about the signed-in user rather than an account. */
const USER_SCOPED_PATHS = ['/dashboard/settings', '/dashboard/notifications'];

interface AccountlessState {
  accessToken: string | null;
  accountsLoaded: boolean;
  accounts: readonly unknown[];
}

/**
 * Signed in, and the server has said the user owns no account. Before the server has
 * answered an empty list means "not known yet", which must not redirect anyone.
 */
export function isAccountlessState(state: AccountlessState): boolean {
  return !!state.accessToken && state.accountsLoaded && state.accounts.length === 0;
}

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Whether an account-less user may stay on this dashboard path. Takes the locale-less
 * pathname (`usePathname` from `@/i18n/navigation`).
 */
export function isAccountlessAllowedPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (ACCOUNT_SCOPED_SETTINGS_PATHS.some((base) => isUnder(path, base))) {
    return false;
  }
  return USER_SCOPED_PATHS.some((base) => isUnder(path, base));
}
