'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tag, User } from '@grantjs/schema';
import { Loader2, Tag as TagIcon } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  DataTableColumnToggle,
  DetailAttachmentFilterToggle,
  FeatureModuleCard,
  Pagination,
  RefreshButton,
  type TableSkeletonColumnConfig,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce, useDetailTableColumnVisibility } from '@/hooks/common';
import { useProjectUserScope } from '@/hooks/common/use-project-user-scope';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/user.store';

import {
  USER_DETAIL_CHECKBOX_COLUMN,
  USER_DETAIL_CHECKBOX_SKELETON,
  USER_DETAIL_CONTENT_COLUMN_CLASS,
  USER_DETAIL_ICON_COLUMN,
  USER_DETAIL_ICON_SKELETON,
  USER_DETAIL_LOADING_COLUMN,
  USER_DETAIL_LOADING_SKELETON,
  USER_DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
  USER_DETAIL_TEXT_COLUMN,
  UserDetailTableCheckboxCell,
  UserDetailTableIconCell,
} from './user-detail-table-layout';
import { UserTagSearch } from './user-tag-search';

interface UserTagsProps {
  user: User;
}

export function UserTags({ user }: UserTagsProps) {
  const t = useTranslations('user.tags');
  const scope = useProjectUserScope();

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useUserStore((state) => state.tagsPage);
  const limit = useUserStore((state) => state.tagsLimit);
  const search = useUserStore((state) => state.tagsSearch);
  const sort = useUserStore((state) => state.tagsSort);
  const tagsAttachmentFilter = useUserStore((state) => state.tagsAttachmentFilter);
  const updatingTagId = useUserStore((state) => state.updatingTagId);
  const optimisticCheckedTagIds = useUserStore((state) => state.optimisticCheckedTagIds);

  const setPage = useUserStore((state) => state.setTagsPage);
  const setSearch = useUserStore((state) => state.setTagsSearch);
  const setTagsAttachmentFilter = useUserStore((state) => state.setTagsAttachmentFilter);
  const setUpdatingTagId = useUserStore((state) => state.setUpdatingTagId);
  const setOptimisticCheckedTagIds = useUserStore((state) => state.setOptimisticCheckedTagIds);
  const addOptimisticTagId = useUserStore((state) => state.addOptimisticTagId);
  const removeOptimisticTagId = useUserStore((state) => state.removeOptimisticTagId);
  const tagsRefetch = useUserStore((state) => state.tagsRefetch);
  const setTagsRefetch = useUserStore((state) => state.setTagsRefetch);

  const selectedTagIds = useMemo(
    () => Array.from(optimisticCheckedTagIds),
    [optimisticCheckedTagIds]
  );

  const tagQueryIds = useMemo(
    () => resolveDetailQueryIds(tagsAttachmentFilter, selectedTagIds),
    [tagsAttachmentFilter, selectedTagIds]
  );

  const { tags, loading, error, totalCount, refetch } = useTags({
    scope: scope!,
    page,
    limit,
    search,
    sort: {
      field: sort.field,
      order: sort.order,
    },
    ids: tagQueryIds,
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

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
  };

  const columns: DataTableColumnConfig<Tag>[] = [
    {
      key: 'checkbox',
      header: '',
      ...USER_DETAIL_CHECKBOX_COLUMN,
      render: (tag: Tag) => (
        <UserDetailTableCheckboxCell>
          <Checkbox
            checked={isTagChecked(tag.id)}
            onCheckedChange={(checked) => handleTagToggle(tag.id, checked === true)}
            disabled={!canUpdate}
          />
        </UserDetailTableCheckboxCell>
      ),
    },
    {
      key: 'icon',
      header: '',
      ...USER_DETAIL_ICON_COLUMN,
      render: (tag: Tag) => (
        <UserDetailTableIconCell>
          <Avatar
            initial={tag.name.charAt(0)}
            size="sm"
            icon={<TagIcon className="h-3 w-3 text-muted-foreground" />}
            className={cn('border-2', getTagBorderClasses(tag.color as TagColor))}
          />
        </UserDetailTableIconCell>
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (tag: Tag) => <span className="text-sm font-medium">{tag.name}</span>,
    },
    {
      key: 'color',
      header: t('table.color'),
      width: '150px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
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
      ...USER_DETAIL_LOADING_COLUMN,
      render: (tag: Tag) =>
        updatingTagId === tag.id ? (
          <UserDetailTableIconCell>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </UserDetailTableIconCell>
        ) : null,
    },
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      USER_DETAIL_CHECKBOX_SKELETON,
      USER_DETAIL_ICON_SKELETON,
      { key: 'name', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'color', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      USER_DETAIL_LOADING_SKELETON,
    ]),
    rowCount: 5,
  };

  if (error) {
    return (
      <FeatureModuleCard title={t('title')}>
        <p className="text-sm text-destructive">{t('error')}</p>
      </FeatureModuleCard>
    );
  }

  return (
    <FeatureModuleCard
      title={t('title')}
      description={t('description')}
      collapsible
      toolbar={
        <Toolbar
          fullWidth
          alwaysRow
          items={[
            <RefreshButton
              key="refresh"
              onRefresh={tagsRefetch ?? undefined}
              loading={loading}
              iconOnly
            />,
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={tagsAttachmentFilter}
              onChange={setTagsAttachmentFilter}
            />,
            toolbarGrow(
              <UserTagSearch
                key="search"
                search={search}
                onSearchChange={handleSearchChange}
                grow
              />
            ),
            <DataTableColumnToggle
              key="columns"
              columns={columnToggleItems}
              onToggle={toggleColumn}
            />,
          ]}
        />
      }
      footer={
        totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        ) : undefined
      }
    >
      <DataTable
        data={tags}
        columns={visibleColumns}
        loading={loading}
        emptyState={{
          icon: <TagIcon />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </FeatureModuleCard>
  );
}
