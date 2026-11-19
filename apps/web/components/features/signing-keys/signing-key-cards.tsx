'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { GetSigningKeysQuery } from '@grantjs/schema';
import { Calendar, Fingerprint } from 'lucide-react';

import { CardBody, CardGrid, CardHeader, CopyToClipboard } from '@/components/common';
import { Button } from '@/components/ui/button';
import { usePageCardFields } from '@/hooks/common';
import { useSigningKeysStore } from '@/stores/signing-keys.store';

import { SigningKeyAudit } from './signing-key-audit';
import { SigningKeyCardSkeleton } from './signing-key-card-skeleton';

type SigningKeyRow = GetSigningKeysQuery['signingKeys'][number];

export function SigningKeyCards() {
  const t = useTranslations('signingKeys.viewer');

  const cardFields = useMemo(
    () => [
      { key: 'rotatedAt', label: t('rotatedAt') },
      { key: 'publicKey', label: t('publicKey') },
    ],
    [t]
  );
  const { arrange } = usePageCardFields(cardFields, { listId: 'signingKeys.list' });
  const signingKeys = useSigningKeysStore((state) => state.signingKeys);
  const loading = useSigningKeysStore((state) => state.loading);
  const setRotateDialogOpen = useSigningKeysStore((state) => state.setRotateDialogOpen);

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return t('never');
    try {
      const dateObj = date instanceof Date ? date : new Date(date as string);
      if (Number.isNaN(dateObj.getTime())) return t('never');
      return dateObj.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return t('never');
    }
  };

  return (
    <CardGrid<SigningKeyRow>
      entities={signingKeys}
      loading={loading}
      emptyState={{
        icon: <Fingerprint />,
        title: t('empty'),
        description: t('emptyDescription'),
        action: (
          <Button onClick={() => setRotateDialogOpen(true)}>
            <Fingerprint className="mr-2 h-4 w-4" />
            {t('emptyAction')}
          </Button>
        ),
      }}
      skeleton={{
        component: <SigningKeyCardSkeleton />,
        count: 3,
      }}
      renderHeader={(row: SigningKeyRow) => (
        <CardHeader
          avatar={{
            initial: row.kid?.charAt(0) ?? 'K',
            size: 'lg',
            icon: <Fingerprint className="h-3 w-3 text-muted-foreground" />,
          }}
          title={row.kid}
          description={row.active ? t('activeYes') : t('activeNo')}
          descriptionClassName={row.active ? 'text-green-600' : 'text-destructive'}
        />
      )}
      renderBody={(row: SigningKeyRow) => (
        <CardBody
          items={arrange([
            {
              key: 'rotatedAt',
              label: {
                icon: <Calendar className="h-3 w-3" />,
                text: t('rotatedAt'),
              },
              value: (
                <span className="text-sm text-muted-foreground">
                  {formatDate(row.rotatedAt ?? null)}
                </span>
              ),
            },
            {
              key: 'publicKey',
              label: {
                icon: <Fingerprint className="h-3 w-3" />,
                text: t('publicKey'),
              },
              value: row.publicKeyPem ? (
                <CopyToClipboard
                  text={row.publicKeyPem}
                  size="sm"
                  variant="ghost"
                  showText={false}
                />
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
            },
          ])}
        />
      )}
      renderFooter={(row: SigningKeyRow) => <SigningKeyAudit signingKey={row} />}
    />
  );
}
