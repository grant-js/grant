'use client';

import { useMemo } from 'react';

import { useParams } from 'next/navigation';

import { Tenant } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { useApiKeys } from '@/hooks/api-keys';

interface UserApiKeysProps {
  userId: string;
}

export function UserApiKeys({ userId }: UserApiKeysProps) {
  const t = useTranslations('user.apiKeys');
  const params = useParams();
  const projectId = params.projectId as string;

  const scope = useMemo(
    () => ({
      tenant: Tenant.ProjectUser,
      id: `${projectId}:${userId}`,
    }),
    [projectId, userId]
  );

  const { apiKeys, loading, error } = useApiKeys({ scope });

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <p className="text-sm text-destructive">{t('error')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
      {apiKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">{apiKey.name || apiKey.clientId}</p>
                <p className="text-sm text-muted-foreground">
                  {apiKey.isRevoked ? t('revoked') : t('active')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
