'use client';

import { useTranslations } from 'next-intl';
import type { ApiKey } from '@grantjs/schema';
import type { LucideIcon } from 'lucide-react';
import { Calendar, Fingerprint, KeyRound, Shield, User } from 'lucide-react';
import type { ReactNode } from 'react';

import { CopyToClipboard, EntityDetailInfoTable, FeatureModuleCard } from '@/components/common';
import { useApiKeyGrantLabel } from '@/components/features/api-keys/use-api-key-grant-label';
import { formatLocalizedDateTime } from '@/lib/utils';

function infoIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

interface ApiKeyGeneralCardProps {
  apiKey: ApiKey;
}

export function ApiKeyGeneralCard({ apiKey }: ApiKeyGeneralCardProps) {
  const t = useTranslations('user.apiKeys');
  const tDetail = useTranslations('user.apiKeys.detail');
  const grantLabel = useApiKeyGrantLabel();

  const isExpired = Boolean(apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date());
  const status = apiKey.isRevoked
    ? t('status.revoked')
    : isExpired
      ? t('status.expired')
      : t('status.active');
  const never = t('never');

  const rows = [
    {
      id: 'clientId',
      icon: infoIcon(Fingerprint),
      label: t('table.clientId'),
      value: (
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-semibold">{apiKey.clientId}</span>
          <CopyToClipboard text={apiKey.clientId} size="sm" variant="ghost" className="shrink-0" />
        </div>
      ),
    },
    {
      id: 'status',
      icon: infoIcon(KeyRound),
      label: t('table.status'),
      value: <span className="font-semibold">{status}</span>,
    },
    {
      id: 'grant',
      icon: infoIcon(Shield),
      label: tDetail('authorization'),
      value: <span className="font-semibold">{grantLabel(apiKey)}</span>,
    },
    {
      id: 'expiresAt',
      icon: infoIcon(Calendar),
      label: t('table.expiresAt'),
      value: (
        <span className="font-semibold">
          {apiKey.expiresAt ? formatLocalizedDateTime(apiKey.expiresAt) : never}
        </span>
      ),
    },
    {
      id: 'lastUsedAt',
      icon: infoIcon(Calendar),
      label: t('table.lastUsedAt'),
      value: (
        <span className="font-semibold">
          {apiKey.lastUsedAt ? formatLocalizedDateTime(apiKey.lastUsedAt) : never}
        </span>
      ),
    },
    {
      id: 'createdAt',
      icon: infoIcon(Calendar),
      label: tDetail('created'),
      value: <span className="font-semibold">{formatLocalizedDateTime(apiKey.createdAt)}</span>,
    },
    {
      id: 'createdBy',
      icon: infoIcon(User),
      label: tDetail('createdBy'),
      value: <span className="font-semibold">{apiKey.createdByUser?.name ?? '—'}</span>,
    },
  ];

  return (
    <FeatureModuleCard
      title={apiKey.name || apiKey.clientId}
      description={apiKey.description || t('noDescription')}
      collapsible
    >
      <EntityDetailInfoTable
        rows={rows}
        fieldColumnHeader={tDetail('tableField')}
        valueColumnHeader={tDetail('tableValue')}
        withTopSeparator={false}
      />
    </FeatureModuleCard>
  );
}
