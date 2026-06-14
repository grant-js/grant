'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKeySortableField, SortOrder } from '@grantjs/schema';

import { DataTableColumnToggle, RefreshButton, Toolbar, toolbarGrow } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useApiKeysStore } from '@/stores/api-keys.store';

import { ApiKeyCreateDialog } from './api-key-create-dialog';
import { ApiKeySearch } from './api-key-search';
import { ApiKeySorter } from './api-key-sorter';
import { ApiKeyViewSwitcher } from './api-key-view-switcher';

export interface ApiKeyToolbarProps {
  /** When false, hides the card/table toggle (e.g. embedded user detail view). */
  showViewSwitcher?: boolean;
  /** When false, hides the sort control (e.g. embedded entity detail view). */
  showSorter?: boolean;
}

export function ApiKeyToolbar({ showViewSwitcher = true, showSorter = true }: ApiKeyToolbarProps) {
  const scope = useScopeFromParams();
  const refetch = useApiKeysStore((state) => state.refetch);
  const loading = useApiKeysStore((state) => state.loading);
  const search = useApiKeysStore((state) => state.search);
  const sort = useApiKeysStore((state) => state.sort);
  const totalCount = useApiKeysStore((state) => state.totalCount);
  const setSearch = useApiKeysStore((state) => state.setSearch);
  const setSort = useApiKeysStore((state) => state.setSort);
  const handleApiKeyCreated = useApiKeysStore((state) => state.handleApiKeyCreated);
  const view = useApiKeysStore((state) => state.view);
  const columnToggleItems = useApiKeysStore((state) => state.columnToggleItems);
  const toggleColumnVisibility = useApiKeysStore((state) => state.toggleColumnVisibility);

  const canCreate = useGrant(ResourceSlug.ApiKey, ResourceAction.Create, {
    scope: scope!,
  });

  const handleSortChange = (field: ApiKeySortableField, order: SortOrder) => {
    setSort(field, order);
  };

  const showColumnToggle =
    (!showViewSwitcher || view === 'table') &&
    columnToggleItems.length > 0 &&
    toggleColumnVisibility;

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    toolbarGrow(<ApiKeySearch key="search" search={search} onSearchChange={setSearch} grow />),
    showSorter && totalCount > 0 && (
      <ApiKeySorter key="sorter" sort={sort} onSortChange={handleSortChange} />
    ),
    showColumnToggle && (
      <DataTableColumnToggle
        key="columns"
        columns={columnToggleItems}
        onToggle={toggleColumnVisibility}
      />
    ),
    showViewSwitcher && <ApiKeyViewSwitcher key="view" />,
    ...(canCreate
      ? [<ApiKeyCreateDialog key="create" onApiKeyCreated={handleApiKeyCreated} />]
      : []),
  ].filter(Boolean);

  return <Toolbar fullWidth items={toolbarItems} />;
}
