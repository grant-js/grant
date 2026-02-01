'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKeySortableField, SortOrder } from '@grantjs/schema';

import { RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useUserStore } from '@/stores/user.store';

import { ApiKeyCreateDialog } from './api-key-create-dialog';
import { ApiKeySearch } from './api-key-search';
import { ApiKeySorter } from './api-key-sorter';

export function ApiKeyToolbar() {
  const scope = useScopeFromParams();
  const apiKeysRefetch = useUserStore((state) => state.apiKeysRefetch);
  const loading = useUserStore((state) => state.apiKeysLoading);
  const search = useUserStore((state) => state.apiKeysSearch);
  const sort = useUserStore((state) => state.apiKeysSort);
  const totalCount = useUserStore((state) => state.apiKeysTotalCount);
  const setSearch = useUserStore((state) => state.setApiKeysSearch);
  const setSort = useUserStore((state) => state.setApiKeysSort);
  const handleApiKeyCreated = useUserStore((state) => state.handleApiKeyCreated);

  const canCreate = useGrant(ResourceSlug.ApiKey, ResourceAction.Create, {
    scope: scope!,
  });

  const limit = useUserStore((state) => state.apiKeysLimit);
  const totalPages = Math.ceil(totalCount / limit);
  const handleSortChange = (field: ApiKeySortableField, order: SortOrder) => {
    setSort(field, order);
  };

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={apiKeysRefetch ?? undefined} loading={loading} />,
    (totalPages > 1 || search.length > 0) && (
      <ApiKeySearch key="search" search={search} onSearchChange={setSearch} />
    ),
    totalCount > 0 && <ApiKeySorter key="sorter" sort={sort} onSortChange={handleSortChange} />,
    ...(canCreate
      ? [<ApiKeyCreateDialog key="create" onApiKeyCreated={handleApiKeyCreated} />]
      : []),
  ].filter(Boolean);

  return <Toolbar items={toolbarItems} />;
}
