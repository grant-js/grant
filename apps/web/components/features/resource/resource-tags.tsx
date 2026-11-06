'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Resource, Tag } from '@grantjs/schema';
import { Tag as TagIcon } from 'lucide-react';

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
  withCheckboxSavingState,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataTableColumnState, useDebounce } from '@/hooks/common';
import { useScopeFromParams } from '@/hooks/common';
import { useResourceMutations } from '@/hooks/resources';
import { useTags } from '@/hooks/tags';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { cn } from '@/lib/utils';
import { useResourceStore } from '@/stores/resource.store';

import { ResourceTagSearch } from './resource-tag-search';

const TABLE_ID = 'resource.tags';

interface ResourceTagsProps {
  resource: Resource;
}

export function ResourceTags({ resource }: ResourceTagsProps) {
  const t = useTranslations('resource.tags');
  const scope = useScopeFromParams();

  const canUpdate = useGrant(ResourceSlug.Resource, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useResourceStore((state) => state.tagsPage);
  const limit = useResourceStore((state) => state.tagsLimit);
  const search = useResourceStore((state) => state.tagsSearch);
  const sort = useResourceStore((state) => state.tagsSort);
  const tagsAttachmentFilter = useResourceStore((state) => state.tagsAttachmentFilter);
  const updatingTagId = useResourceStore((state) => state.updatingTagId);
  const optimisticCheckedTagIds = useResourceStore((state) => state.optimisticCheckedTagIds);

  const setPage = useResourceStore((state) => state.setTagsPage);
  const setSearch = useResourceStore((state) => state.setTagsSearch);
  const setTagsAttachmentFilter = useResourceStore((state) => state.setTagsAttachmentFilter);
  const setUpdatingTagId = useResourceStore((state) => state.setUpdatingTagId);
  const setOptimisticCheckedTagIds = useResourceStore((state) => state.setOptimisticCheckedTagIds);
  const addOptimisticTagId = useResourceStore((state) => state.addOptimisticTagId);
  const removeOptimisticTagId = useResourceStore((state) => state.removeOptimisticTagId);
  const tagsRefetch = useResourceStore((state) => state.tagsRefetch);
  const setTagsRefetch = useResourceStore((state) => state.setTagsRefetch);

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

  const { updateResource } = useResourceMutations();

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setTagsRefetch(handleRefetch);
    return () => setTagsRefetch(null);
  }, [handleRefetch, setTagsRefetch]);

  useEffect(() => {
    setOptimisticCheckedTagIds(new Set(resource.tags?.map((tag) => tag.id) || []));
  }, [resource.tags, setOptimisticCheckedTagIds]);

  const totalPages = Math.ceil(totalCount / limit);

  const isTagChecked = useCallback(
    (tagId: string) => optimisticCheckedTagIds.has(tagId),
    [optimisticCheckedTagIds]
  );

  const debouncedUpdateResourceTags = useDebounce(
    async (tagId: string, shouldAdd: boolean, currentTagIds: string[]) => {
      setUpdatingTagId(tagId);
      try {
        const updatedTagIds = shouldAdd
          ? [...currentTagIds, tagId]
          : currentTagIds.filter((id) => id !== tagId);

        const primaryTagId = resource.tags?.find((tag) => tag.isPrimary)?.id;
        await updateResource({
          id: resource.id,
          input: {
            scope: scope!,
            tagIds: updatedTagIds,
            primaryTagId: primaryTagId || undefined,
          },
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

    debouncedUpdateResourceTags(tagId, checked, currentTagIds);
  };

  const columns: DataTableColumnConfig<Tag>[] = [
    withCheckboxSavingState(
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
      (tag: Tag) => updatingTagId === tag.id
    ),
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
  ];

  const {
    visibleColumns,
    columnToggleItems,
    toggleColumn,
    resetColumns,
    moveColumn,
    filterSkeletonColumns,
  } = useDataTableColumnState(columns, { tableId: TABLE_ID });

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      DETAIL_CHECKBOX_SKELETON,
      DETAIL_ICON_SKELETON,
      { key: 'name', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'color', type: 'text', ...DETAIL_TEXT_COLUMN },
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
              <ResourceTagSearch key="search" search={search} onSearchChange={setSearch} grow />
            ),
            <DataTableColumnToggle
              key="columns"
              columns={columnToggleItems}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onMove={moveColumn}
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
        tableId={TABLE_ID}
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
