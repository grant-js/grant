import type { ProjectAppPublicInfo } from '@grantjs/schema';

export interface ProjectOAuthProviderVisibility {
  showGithub: boolean;
  showGoogle: boolean;
  showEmail: boolean;
}

/** Hosted project sign-in buttons: configuredProviders ∩ enabledProviders (email only checks enabled). */
export function getProjectOAuthProviderVisibility(
  appInfo: ProjectAppPublicInfo | null | undefined
): ProjectOAuthProviderVisibility {
  const configuredSocial = (appInfo?.configuredProviders ?? []).map((p) => p.toLowerCase());
  const appAllows = (provider: string) =>
    !appInfo?.enabledProviders?.length ||
    appInfo.enabledProviders.some((p) => p.toLowerCase() === provider);
  return {
    showGithub: appAllows('github') && configuredSocial.includes('github'),
    showGoogle: appAllows('google') && configuredSocial.includes('google'),
    showEmail: appAllows('email'),
  };
}
