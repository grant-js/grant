import type { ProjectOAuthThemeMode } from '@grantjs/schema';

import { GRANT_PRIMARY_COLOR } from '@/lib/oauth-branding';

export type ProjectOAuthBranding = {
  pictureUrl: string | null;
  projectName: string | null;
  primaryColor: string | null;
  showHelpPanel: boolean;
  themeMode: ProjectOAuthThemeMode | null;
};

export type ProjectOAuthBrandingCacheKey = `client:${string}` | `consent:${string}`;

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

export function readProjectOAuthBrandingCache(
  cacheKey: ProjectOAuthBrandingCacheKey
): ProjectOAuthBranding | null {
  return memoryCache.get(cacheKey) ?? null;
}

export function writeProjectOAuthBrandingCache(
  cacheKey: ProjectOAuthBrandingCacheKey,
  branding: ProjectOAuthBranding
): void {
  if (!cacheKey.startsWith('client:')) return;
  memoryCache.set(cacheKey, branding);
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
}
