import type { ProjectOAuthThemeMode } from '@grantjs/schema';

import { GRANT_PRIMARY_COLOR } from '@/lib/oauth-branding';

export const PROJECT_OAUTH_BRANDING_STORAGE_KEY = 'grant.project-oauth-branding';

export type ProjectOAuthBranding = {
  pictureUrl: string | null;
  projectName: string | null;
  primaryColor: string | null;
  showHelpPanel: boolean;
  themeMode: ProjectOAuthThemeMode | null;
};

export type ProjectOAuthBrandingCacheKey = `client:${string}` | `consent:${string}`;

type StoredBranding = {
  cacheKey: ProjectOAuthBrandingCacheKey;
  branding: ProjectOAuthBranding;
};

const memoryCache = new Map<ProjectOAuthBrandingCacheKey, ProjectOAuthBranding>();

export function isProjectOAuthBrandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/)[0] ?? '';
  const match = path.match(/(?:^|\/)auth\/project(?:\/([^/]+))?\/?$/);
  if (!match) return false;
  const sub = match[1];
  return sub == null || sub === 'email' || sub === 'consent';
}

export function projectOAuthBrandingCacheKey(input: {
  clientId?: string | null;
  consentToken?: string | null;
}): ProjectOAuthBrandingCacheKey | null {
  const clientId = input.clientId?.trim();
  if (clientId) return `client:${clientId}`;
  const consentToken = input.consentToken?.trim();
  if (consentToken) return `consent:${consentToken}`;
  return null;
}

export function projectOAuthBrandingCacheKeyFromSearch(
  search: string | URLSearchParams
): ProjectOAuthBrandingCacheKey | null {
  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  return projectOAuthBrandingCacheKey({
    clientId: params.get('client_id'),
    consentToken: params.get('consent_token'),
  });
}

export function projectOAuthBrandingFromPublicInfo(info: {
  pictureUrl?: string | null;
  projectName?: string | null;
  primaryColor?: string | null;
  showHelpPanel: boolean;
  themeMode?: ProjectOAuthThemeMode | null;
}): ProjectOAuthBranding {
  return {
    pictureUrl: info.pictureUrl ?? null,
    projectName: info.projectName ?? null,
    primaryColor: info.primaryColor ?? null,
    showHelpPanel: info.showHelpPanel,
    themeMode: info.themeMode ?? null,
  };
}

export function resolveAuthLayoutChrome(
  branding: ProjectOAuthBranding | null,
  isProjectOAuth: boolean
): { showHelpPanel: boolean; panelColor: string | null } {
  if (isProjectOAuth && branding == null) {
    return { showHelpPanel: false, panelColor: null };
  }
  return {
    showHelpPanel: branding?.showHelpPanel ?? true,
    panelColor: branding?.primaryColor ?? GRANT_PRIMARY_COLOR,
  };
}

function isProjectOAuthBranding(value: unknown): value is ProjectOAuthBranding {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as { showHelpPanel?: unknown }).showHelpPanel === 'boolean';
}

export function readProjectOAuthBrandingCache(
  cacheKey: ProjectOAuthBrandingCacheKey
): ProjectOAuthBranding | null {
  const memory = memoryCache.get(cacheKey);
  if (memory) return memory;
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PROJECT_OAUTH_BRANDING_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredBranding;
    if (stored?.cacheKey !== cacheKey || !isProjectOAuthBranding(stored.branding)) return null;
    memoryCache.set(cacheKey, stored.branding);
    return stored.branding;
  } catch {
    return null;
  }
}

export function writeProjectOAuthBrandingCache(
  cacheKey: ProjectOAuthBrandingCacheKey,
  branding: ProjectOAuthBranding
): void {
  memoryCache.set(cacheKey, branding);
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      PROJECT_OAUTH_BRANDING_STORAGE_KEY,
      JSON.stringify({ cacheKey, branding } satisfies StoredBranding)
    );
  } catch {
    // Private mode / quota should not block sign-in.
  }
}

export function readProjectOAuthBrandingForLocation(href?: string): ProjectOAuthBranding | null {
  if (typeof window === 'undefined' && !href) return null;
  try {
    const url = href ? new URL(href, 'http://localhost') : new URL(window.location.href);
    if (!isProjectOAuthBrandingPath(url.pathname)) return null;
    const key = projectOAuthBrandingCacheKeyFromSearch(url.search);
    return key ? readProjectOAuthBrandingCache(key) : null;
  } catch {
    return null;
  }
}

export function clearProjectOAuthBrandingCacheForTests(): void {
  memoryCache.clear();
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(PROJECT_OAUTH_BRANDING_STORAGE_KEY);
  } catch {
    // ignore
  }
}
