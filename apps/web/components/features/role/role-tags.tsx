'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Role, Tag } from '@grantjs/schema';
import { Loader2, Tag as TagIcon } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  DataTableColumnToggle,
  DETAIL_CHECKBOX_COLUMN,
  DETAIL_CHECKBOX_SKELETON,
  DETAIL_CONTENT_COLUMN_CLASS,
  DETAIL_ICON_COLUMN,
  DETAIL_ICON_SKELETON,
  DETAIL_LOADING_COLUMN,
  DETAIL_LOADING_SKELETON,
  DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
  DETAIL_TEXT_COLUMN,
  DetailAttachmentFilterToggle,
  DetailTableCheckboxCell,
  DetailTableIconCell,
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
import { useScopeFromParams } from '@/hooks/common';
import { useRoleMutations } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { cn } from '@/lib/utils';
import { useRoleStore } from '@/stores/role.store';

import { RoleTagSearch } from './role-tag-search';

interface RoleTagsProps {
  role: Role;
}

export function RoleTags({ role }: RoleTagsProps) {
  const t = useTranslations('role.tags');
  const scope = useScopeFromParams();

  const canUpdate = useGrant(ResourceSlug.Role, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useRoleStore((state) => state.tagsPage);
  const limit = useRoleStore((state) => state.tagsLimit);
  const search = useRoleStore((state) => state.tagsSearch);
  const sort = useRoleStore((state) => state.tagsSort);
  const tagsAttachmentFilter = useRoleStore((state) => state.tagsAttachmentFilter);
  const updatingTagId = useRoleStore((state) => state.updatingTagId);
  const optimisticCheckedTagIds = useRoleStore((state) => state.optimisticCheckedTagIds);

  const setPage = useRoleStore((state) => state.setTagsPage);
  const setSearch = useRoleStore((state) => state.setTagsSearch);
  const setTagsAttachmentFilter = useRoleStore((state) => state.setTagsAttachmentFilter);
  const setUpdatingTagId = useRoleStore((state) => state.setUpdatingTagId);
  const setOptimisticCheckedTagIds = useRoleStore((state) => state.setOptimisticCheckedTagIds);
  const addOptimisticTagId = useRoleStore((state) => state.addOptimisticTagId);
  const removeOptimisticTagId = useRoleStore((state) => state.removeOptimisticTagId);
  const tagsRefetch = useRoleStore((state) => state.tagsRefetch);
  const setTagsRefetch = useRoleStore((state) => state.setTagsRefetch);

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

  const { updateRole } = useRoleMutations();

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setTagsRefetch(handleRefetch);
    return () => setTagsRefetch(null);
  }, [handleRefetch, setTagsRefetch]);

  useEffect(() => {
    setOptimisticCheckedTagIds(new Set(role.tags?.map((tag) => tag.id) || []));
  }, [role.tags, setOptimisticCheckedTagIds]);

  const totalPages = Math.ceil(totalCount / limit);

  const isTagChecked = useCallback(
    (tagId: string) => optimisticCheckedTagIds.has(tagId),
    [optimisticCheckedTagIds]
  );

  const debouncedUpdateRoleTags = useDebounce(
    async (tagId: string, shouldAdd: boolean, currentTagIds: string[]) => {
      setUpdatingTagId(tagId);
      try {
        const updatedTagIds = shouldAdd
          ? [...currentTagIds, tagId]
          : currentTagIds.filter((id) => id !== tagId);

        const primaryTagId = role.tags?.find((tag) => tag.isPrimary)?.id;
        await updateRole(role.id, {
          scope: scope!,
          tagIds: updatedTagIds,
          primaryTagId: primaryTagId || undefined,
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

    debouncedUpdateRoleTags(tagId, checked, currentTagIds);
  };

  const columns: DataTableColumnConfig<Tag>[] = [
    {
      key: 'checkbox',
      header: '',
      ...DETAIL_CHECKBOX_COLUMN,
      render: (tag: Tag) => (
        <DetailTableCheckboxCell>
          <Checkbox
            checked={isTagChecked(tag.id)}
            onCheckedChange={(checked) => handleTagToggle(tag.id, checked === true)}
            disabled={!canUpdate}
          />
        </DetailTableCheckboxCell>
      ),
    },
    {
      key: 'icon',
      header: '',
      ...DETAIL_ICON_COLUMN,
      render: (tag: Tag) => (
        <DetailTableIconCell>
          <Avatar
            initial={tag.name.charAt(0)}
            size="sm"
            icon={<TagIcon className="h-3 w-3 text-muted-foreground" />}
            className={cn('border-2', getTagBorderClasses(tag.color as TagColor))}
          />
        </DetailTableIconCell>
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (tag: Tag) => <span className="text-sm font-medium">{tag.name}</span>,
    },
    {
      key: 'color',
      header: t('table.color'),
      width: '150px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
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
      ...DETAIL_LOADING_COLUMN,
      render: (tag: Tag) =>
        updatingTagId === tag.id ? (
          <DetailTableIconCell>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </DetailTableIconCell>
        ) : null,
    },
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      DETAIL_CHECKBOX_SKELETON,
      DETAIL_ICON_SKELETON,
      { key: 'name', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'color', type: 'text', ...DETAIL_TEXT_COLUMN },
      DETAIL_LOADING_SKELETON,
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
              <RoleTagSearch key="search" search={search} onSearchChange={setSearch} grow />
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
