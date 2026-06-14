'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { ProjectApp, Tag } from '@grantjs/schema';
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
import { useProjectAppMutations } from '@/hooks/project-apps';
import { useTags } from '@/hooks/tags';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { cn } from '@/lib/utils';
import { useProjectAppStore } from '@/stores/project-app.store';

import { ProjectAppTagSearch } from './project-app-tag-search';

interface ProjectAppTagsProps {
  projectApp: ProjectApp;
}

export function ProjectAppTags({ projectApp }: ProjectAppTagsProps) {
  const t = useTranslations('projectApp.tags');
  const scope = useScopeFromParams();

  const canUpdate = useGrant(ResourceSlug.ProjectApp, ResourceAction.Update, {
    scope: scope!,
  });

  const page = useProjectAppStore((state) => state.tagsPage);
  const limit = useProjectAppStore((state) => state.tagsLimit);
  const search = useProjectAppStore((state) => state.tagsSearch);
  const sort = useProjectAppStore((state) => state.tagsSort);
  const tagsAttachmentFilter = useProjectAppStore((state) => state.tagsAttachmentFilter);
  const updatingTagId = useProjectAppStore((state) => state.updatingTagId);
  const optimisticCheckedTagIds = useProjectAppStore((state) => state.optimisticCheckedTagIds);

  const setPage = useProjectAppStore((state) => state.setTagsPage);
  const setSearch = useProjectAppStore((state) => state.setTagsSearch);
  const setTagsAttachmentFilter = useProjectAppStore((state) => state.setTagsAttachmentFilter);
  const setUpdatingTagId = useProjectAppStore((state) => state.setUpdatingTagId);
  const setOptimisticCheckedTagIds = useProjectAppStore(
    (state) => state.setOptimisticCheckedTagIds
  );
  const addOptimisticTagId = useProjectAppStore((state) => state.addOptimisticTagId);
  const removeOptimisticTagId = useProjectAppStore((state) => state.removeOptimisticTagId);
  const tagsRefetch = useProjectAppStore((state) => state.tagsRefetch);
  const setTagsRefetch = useProjectAppStore((state) => state.setTagsRefetch);

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

  const { updateProjectApp } = useProjectAppMutations();

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setTagsRefetch(handleRefetch);
    return () => setTagsRefetch(null);
  }, [handleRefetch, setTagsRefetch]);

  useEffect(() => {
    setOptimisticCheckedTagIds(new Set(projectApp.tags?.map((tag) => tag.id) || []));
  }, [projectApp.tags, setOptimisticCheckedTagIds]);

  const totalPages = Math.ceil(totalCount / limit);

  const isTagChecked = useCallback(
    (tagId: string) => optimisticCheckedTagIds.has(tagId),
    [optimisticCheckedTagIds]
  );

  const debouncedUpdateProjectAppTags = useDebounce(
    async (tagId: string, shouldAdd: boolean, currentTagIds: string[]) => {
      setUpdatingTagId(tagId);
      try {
        const updatedTagIds = shouldAdd
          ? [...currentTagIds, tagId]
          : currentTagIds.filter((id) => id !== tagId);

        const currentPrimary = projectApp.tags?.find((tag) => tag.isPrimary)?.id;
        const primaryTagId =
          currentPrimary && updatedTagIds.includes(currentPrimary) ? currentPrimary : undefined;

        await updateProjectApp(projectApp.id, {
          scope: scope!,
          tagIds: updatedTagIds,
          primaryTagId,
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

    debouncedUpdateProjectAppTags(tagId, checked, currentTagIds);
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
            className={`h-3 w-3 rounded-full border-2 bg-transparent p-0 ${getTagBorderClasses(tag.color as TagColor)}`}
          />
          <span className="text-sm capitalize text-muted-foreground">{tag.color}</span>
        </div>
      ),
    },
    {
      key: 'loading',
      header: '',
      ...DETAIL_LOADING_COLUMN,
      render: (tag: Tag) =>
        updatingTagId === tag.id ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
      <FeatureModuleCard title={t('title')} collapsible>
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
              <ProjectAppTagSearch key="search" search={search} onSearchChange={setSearch} grow />
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
