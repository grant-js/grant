/**
 * Project OAuth (REST) response types.
 * Used by project app-info and consent REST endpoints; shared by API and web client.
 */

/** Forced appearance on hosted OAuth pages. Null keeps the visitor's Grant theme. */
export const PROJECT_OAUTH_THEME_MODES = ['light', 'dark', 'system'] as const;
export type ProjectOAuthThemeMode = (typeof PROJECT_OAUTH_THEME_MODES)[number];

export function isProjectOAuthThemeMode(value: unknown): value is ProjectOAuthThemeMode {
  return (
    typeof value === 'string' && (PROJECT_OAUTH_THEME_MODES as readonly string[]).includes(value)
  );
}

/** Scope label returned by project app-info and consent-info endpoints. */
export interface ProjectAppScopeInfo {
  slug: string;
  name: string;
  description: string | null;
}

/** Response from GET /api/auth/project/app-info (public app metadata and scopes). */
export interface ProjectAppPublicInfo {
  name: string | null;
  projectName: string | null;
  pictureUrl: string | null;
  primaryColor: string | null;
  showHelpPanel: boolean;
  themeMode: ProjectOAuthThemeMode | null;
  enabledProviders: string[] | null;
  /**
   * Social providers this project can offer (BYO connection and/or platform fallback).
   * Hosted sign-in uses this instead of GET /api/auth/providers.
   */
  configuredProviders?: string[];
  scopes: ProjectAppScopeInfo[];
}

/** User display info on the consent screen. */
export interface ProjectConsentInfoUser {
  displayName: string;
  email: string | null;
  pictureUrl: string | null;
  /** Provider used for this sign-in (email, github, google). */
  provider: string | null;
}

/** Response from GET /api/auth/project/consent-info (app name, granted scopes, user). */
export interface ProjectConsentInfo {
  name: string | null;
  projectName: string | null;
  pictureUrl: string | null;
  primaryColor: string | null;
  showHelpPanel: boolean;
  themeMode: ProjectOAuthThemeMode | null;
  scopes: ProjectAppScopeInfo[];
  user: ProjectConsentInfoUser | null;
}

/** Response from POST /api/auth/project/consent/approve and /deny (redirect URL). */
export interface ProjectConsentRedirectResult {
  redirectUrl: string;
}
