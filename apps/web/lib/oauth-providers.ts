import { getApiBaseUrl } from '@/lib/constants';

export type SocialOAuthProviderId = 'github' | 'google';

export interface SocialOAuthProvider {
  id: SocialOAuthProviderId;
  configured: boolean;
}

interface AuthProvidersResponse {
  success?: boolean;
  data?: { providers: SocialOAuthProvider[] };
  providers?: SocialOAuthProvider[];
}

export async function getSocialOAuthProviders(): Promise<SocialOAuthProvider[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/providers`, { cache: 'no-store' });
  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as AuthProvidersResponse;
  const providers = json.data?.providers ?? json.providers ?? [];
  return providers.filter((p) => p.configured);
}
