'use client';

import { useTranslations } from 'next-intl';
import type { ApiKey } from '@grantjs/schema';

import { LoadedCountChip } from '@/components/common';

interface ApiKeyGrantProps {
  apiKey: Pick<ApiKey, 'role' | 'permissions'>;
  className?: string;
}

/**
 * What a project key is granted: its role, or a "Permissions (n)" chip whose preview lists
 * those permissions, each a link to its page.
 */
export function ApiKeyGrant({ apiKey, className }: ApiKeyGrantProps) {
  const t = useTranslations('user.apiKeys');
  const tRoot = useTranslations();

  if (apiKey.permissions) {
    const count = apiKey.permissions.length;
    return (
      <LoadedCountChip items={apiKey.permissions} count={count} linkTo="permissions">
        {t('permissionsCount', { count })}
      </LoadedCountChip>
    );
  }
  return <span className={className}>{tRoot(apiKey.role?.name ?? '—')}</span>;
}
