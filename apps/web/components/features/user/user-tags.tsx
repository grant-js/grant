'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { SortOrder, Tag, TagSortField, User } from '@grantjs/schema';
import { Loader2, Tag as TagIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  Pagination,
  RefreshButton,
  Toolbar,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce, useScopeFromParams } from '@/hooks/common';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';

import { UserTagSearch } from './user-tag-search';
import { UserTagSorter } from './user-tag-sorter';

interface UserTagsProps {
  user: User;
}

export function UserTags({ user }: UserTagsProps) {
  const t = useTranslations('user.tags');
  const scope = useScopeFromParams();

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useUserStore((state) => state.tagsPage);
  const limit = useUserStore((state) => state.tagsLimit);
  const search = useUserStore((state) => state.tagsSearch);
  const sort = useUserStore((state) => state.tagsSort);
  const updatingTagId = useUserStore((state) => state.updatingTagId);
  const optimisticCheckedTagIds = useUserStore((state) => state.optimisticCheckedTagIds);

  const setPage = useUserStore((state) => state.setTagsPage);
  const setSearch = useUserStore((state) => state.setTagsSearch);
  const setSort = useUserStore((state) => state.setTagsSort);
  const setUpdatingTagId = useUserStore((state) => state.setUpdatingTagId);
  const setOptimisticCheckedTagIds = useUserStore((state) => state.setOptimisticCheckedTagIds);
  const addOptimisticTagId = useUserStore((state) => state.addOptimisticTagId);
  const removeOptimisticTagId = useUserStore((state) => state.removeOptimisticTagId);
  const tagsRefetch = useUserStore((state) => state.tagsRefetch);
  const setTagsRefetch = useUserStore((state) => state.setTagsRefetch);

  const { tags, loading, error, totalCount, refetch } = useTags({
    scope: scope!,
    page,
    limit,
    search,
    sort: {
      field: sort.field,
      order: sort.order,
    },
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setTagsRefetch(handleRefetch);
    return () => setTagsRefetch(null);
  }, [handleRefetch, setTagsRefetch]);

  const { updateUser } = useUserMutations();

  useEffect(() => {
    setOptimisticCheckedTagIds(new Set(user.tags?.map((t) => t.id) || []));
  }, [user.tags, setOptimisticCheckedTagIds]);

  const totalPages = Math.ceil(totalCount / limit);

  const isTagChecked = useCallback(
    (tagId: string) => {
      return optimisticCheckedTagIds.has(tagId);
    },
    [optimisticCheckedTagIds]
  );

  const debouncedUpdateUserTags = useDebounce(
    async (tagId: string, shouldAdd: boolean, currentTagIds: string[]) => {
      if (!user) return;

      setUpdatingTagId(tagId);
      try {
        const updatedTagIds = shouldAdd
          ? [...currentTagIds, tagId]
          : currentTagIds.filter((id) => id !== tagId);

        await updateUser(user.id, {
          scope: scope!,
          tagIds: updatedTagIds,
        });
      } finally {
        setUpdatingTagId(null);
      }
    },
    300
  );

  const handleTagToggle = (tagId: string, checked: boolean) => {
    const currentTagIds = Array.from(optimisticCheckedTagIds);

    if (checked) {
      addOptimisticTagId(tagId);
    } else {
      removeOptimisticTagId(tagId);
    }

    debouncedUpdateUserTags(tagId, checked, currentTagIds);
  };

  const handleSortChange = (field: TagSortField, order: SortOrder) => {
    setSort(field, order);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
  };

  const columns: DataTableColumnConfig<Tag>[] = [
    {
      key: 'checkbox',
      header: '',
      width: '50px',
      className: 'pl-4',
      render: (tag: Tag) => (
        <Checkbox
          checked={isTagChecked(tag.id)}
          onCheckedChange={(checked) => handleTagToggle(tag.id, checked === true)}
          disabled={!canUpdate}
        />
      ),
    },
    {
      key: 'icon',
      header: '',
      width: '50px',
      render: (tag: Tag) => (
        <div className="flex items-center justify-center">
          <Avatar
            initial={tag.name.charAt(0)}
            size="sm"
            icon={<TagIcon className="h-3 w-3 text-muted-foreground" />}
            className={cn('border-2', getTagBorderClasses(tag.color as TagColor))}
          />
        </div>
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (tag: Tag) => <span className="text-sm font-medium">{tag.name}</span>,
    },
    {
      key: 'color',
      header: t('table.color'),
      width: '150px',
      render: (tag: Tag) => (
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className={`w-3 h-3 rounded-full p-0 border-2 bg-transparent ${getTagBorderClasses(tag.color as TagColor)}`}
          />
          <span className="text-sm text-muted-foreground capitalize">{tag.color}</span>
        </div>
      ),
    },
    {
      key: 'loading',
      header: '',
      width: '50px',
      render: (tag: Tag) =>
        updatingTagId === tag.id ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null,
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'checkbox', type: 'text' },
      { key: 'icon', type: 'text' },
      { key: 'name', type: 'text' },
      { key: 'color', type: 'text' },
      { key: 'loading', type: 'text' },
    ],
    rowCount: 5,
  };

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <p className="text-sm text-destructive">{t('error')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('title')}</h3>
          <Toolbar
            items={[
              <RefreshButton
                key="refresh"
                onRefresh={tagsRefetch ?? undefined}
                loading={loading}
              />,
              (totalPages > 1 || search.length > 0) && (
                <UserTagSearch key="search" search={search} onSearchChange={handleSearchChange} />
              ),
              totalCount > 0 && (
                <UserTagSorter key="sorter" sort={sort} onSortChange={handleSortChange} />
              ),
            ]}
          />
        </div>
        <DataTable
          data={tags}
          columns={columns}
          loading={loading}
          emptyState={{
            icon: <TagIcon />,
            title: t('empty'),
            description: t('emptyDescription'),
          }}
          skeletonConfig={skeletonConfig}
        />
        {totalPages > 1 && (
          <div className="mt-4 border-t">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </>
  );
}
