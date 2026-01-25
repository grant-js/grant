'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useTagsStore } from '@/stores/tags.store';

import { TagCreateDialog } from './tag-create-dialog';
import { TagLimit } from './tag-limit';
import { TagSearch } from './tag-search';
import { TagSorter } from './tag-sorter';
import { TagViewSwitcher } from './tag-view-switcher';

export function TagToolbar() {
  const refetch = useTagsStore((state) => state.refetch);
  const loading = useTagsStore((state) => state.loading);
  const scope = useScopeFromParams();

  const canCreate = useGrant(ResourceSlug.Tag, ResourceAction.Create, {
    scope: scope!,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <TagSearch key="search" />,
    <TagSorter key="sorter" />,
    <TagLimit key="limit" />,
    <TagViewSwitcher key="view" />,
    ...(canCreate ? [<TagCreateDialog key="create" />] : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
