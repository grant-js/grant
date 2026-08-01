'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { DashboardLayout } from '@/components/layout';
import { usePageTitle } from '@/hooks';

import { WebhookDeleteDialog } from '../webhooks/webhook-delete-dialog';
import { WebhookSecretDialog } from '../webhooks/webhook-secret-dialog';
import { WebhookDetailToolbar } from './webhook-detail-toolbar';
import { WebhookDetailViewer } from './webhook-detail-viewer';

export interface WebhookDetailPageProps {
  sidebar: ReactNode;
}

export function WebhookDetailPage({ sidebar }: WebhookDetailPageProps) {
  const t = useTranslations('webhooks');
  usePageTitle('webhooks.detail');

  return (
    <DashboardLayout title={t('detail.title')} sidebar={sidebar} actions={<WebhookDetailToolbar />}>
      <div className="p-4">
        <WebhookDetailViewer />
      </div>
      <WebhookDeleteDialog />
      <WebhookSecretDialog />
    </DashboardLayout>
  );
}
