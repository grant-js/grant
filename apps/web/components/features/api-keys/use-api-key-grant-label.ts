import { useTranslations } from 'next-intl';
import type { ApiKey } from '@grantjs/schema';

/** The role a project key carries, or how many permissions it carries instead. */
export function useApiKeyGrantLabel() {
  const t = useTranslations('user.apiKeys');
  const tRoot = useTranslations();

  return (apiKey: Pick<ApiKey, 'role' | 'permissions'>): string => {
    if (apiKey.permissions) {
      return t('permissionsCount', { count: apiKey.permissions.length });
    }
    return tRoot(apiKey.role?.name ?? '—');
  };
}
