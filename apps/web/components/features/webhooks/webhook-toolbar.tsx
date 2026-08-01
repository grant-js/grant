'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { RefreshButton, Toolbar, toolbarGrow } from '@/components/common';
import { useProjectGrantContext, useScopeFromParams } from '@/hooks/common';
import { useWebhooksStore } from '@/stores/webhooks.store';

import { WebhookCreateDialog } from './webhook-create-dialog';
import { WebhookLimit } from './webhook-limit';
import { WebhookSearch } from './webhook-search';
import { WebhookSorter } from './webhook-sorter';
import { WebhookViewSwitcher } from './webhook-view-switcher';

export function WebhookToolbar() {
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
    ...(canCreate ? [<WebhookCreateDialog key="create" />] : []),
  ].filter(Boolean);

  return <Toolbar fullWidth items={toolbarItems} />;
}
