'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Plus } from 'lucide-react';

import {
  EntityCreateNavigateButton,
  RefreshButton,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { useProjectGrantContext, useScopeFromParams } from '@/hooks/common';
import { useWebhooksStore } from '@/stores/webhooks.store';

import { WebhookLimit } from './webhook-limit';
import { WebhookSearch } from './webhook-search';
import { WebhookSorter } from './webhook-sorter';
import { WebhookViewSwitcher } from './webhook-view-switcher';

export function WebhookToolbar() {
  const t = useTranslations('webhooks.createDialog');
  const scope = useScopeFromParams();
  const projectGrantContext = useProjectGrantContext();
  const refetch = useWebhooksStore((state) => state.refetch);
  const loading = useWebhooksStore((state) => state.loading);
  const totalCount = useWebhooksStore((state) => state.totalCount);

  const canCreate = useGrant(ResourceSlug.Project, ResourceAction.Create, {
    scope: scope!,
    context: projectGrantContext,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    toolbarGrow(<WebhookSearch key="search" />),
    totalCount > 0 && <WebhookSorter key="sorter" />,
    <WebhookLimit key="limit" />,
    <WebhookViewSwitcher key="view" />,
    ...(canCreate
      ? [
          <EntityCreateNavigateButton
            key="create"
            entitySegment="webhooks"
            label={t('trigger')}
            icon={Plus}
          />,
        ]
      : []),
  ].filter(Boolean);

  return <Toolbar fullWidth items={toolbarItems} />;
}
