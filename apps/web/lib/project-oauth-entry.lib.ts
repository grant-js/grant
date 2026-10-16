import type { ProjectAppPublicInfo } from '@grantjs/schema';

export interface ProjectOAuthProviderVisibility {
  showGithub: boolean;
  showGoogle: boolean;
  showEmail: boolean;
  showPassword: boolean;
}

/**
 * Hosted project sign-in buttons: configuredProviders ∩ enabledProviders (email only checks
 * enabled). An empty or null `enabledProviders` means every provider **except** password:
 * password sign-in is opt-in and shows only when the list names it (ADR 0011 § 5).
 */
export function getProjectOAuthProviderVisibility(
  appInfo: ProjectAppPublicInfo | null | undefined
): ProjectOAuthProviderVisibility {
  const configuredSocial = (appInfo?.configuredProviders ?? []).map((p) => p.toLowerCase());
  const enabled = (appInfo?.enabledProviders ?? []).map((p) => p.toLowerCase());
  const appAllows = (provider: string) => enabled.length === 0 || enabled.includes(provider);
  return {
    showGithub: appAllows('github') && configuredSocial.includes('github'),
    showGoogle: appAllows('google') && configuredSocial.includes('google'),
    showEmail: appAllows('email'),
    showPassword: enabled.includes('password'),
  };
}
