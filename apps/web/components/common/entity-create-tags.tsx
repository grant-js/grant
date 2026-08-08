'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { SortOrder, Tag, TagSortField } from '@grantjs/schema';
import { Tag as TagIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

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
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useDetailTableColumnVisibility, useScopeFromParams } from '@/hooks/common';
import { useTags } from '@/hooks/tags';
import { type DetailAttachmentFilter, resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { cn } from '@/lib/utils';

import { EntityTagSearch } from './entity-tag-search';

const ENTITY_CREATE_TAGS_PAGE_LIMIT = 10;

type EntityCreateTagsNamespace =
  | 'role.tags'
  | 'group.tags'
  | 'permission.tags'
  | 'user.tags'
  | 'resource.tags'
  | 'projectApp.tags';

type EntityCreateTagFormValues = {
  tagIds?: string[];
  primaryTagId?: string;
};

interface EntityCreateTagsProps {
  tagsNamespace: EntityCreateTagsNamespace;
}

export function EntityCreateTags({ tagsNamespace }: EntityCreateTagsProps) {
  const t = useTranslations(tagsNamespace);
  const scope = useScopeFromParams();
  const form = useFormContext<EntityCreateTagFormValues>();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tagsAttachmentFilter, setTagsAttachmentFilter] = useState<DetailAttachmentFilter>('all');

  const selectedTagIds = form.watch('tagIds') ?? [];
  const primaryTagId = form.watch('primaryTagId');

  const tagQueryIds = useMemo(
    () => resolveDetailQueryIds(tagsAttachmentFilter, selectedTagIds),
    [tagsAttachmentFilter, selectedTagIds]
  );

  const { tags, loading, error, totalCount, refetch } = useTags({
    scope: scope!,
    page,
    limit: ENTITY_CREATE_TAGS_PAGE_LIMIT,
    search,
    sort: {
      field: TagSortField.Name,
      order: SortOrder.Asc,
    },
    ids: tagQueryIds,
  });

  const totalPages = Math.ceil(totalCount / ENTITY_CREATE_TAGS_PAGE_LIMIT);

  const tableTags = tagsAttachmentFilter === 'selected' && tagQueryIds?.length === 0 ? [] : tags;

  const isTagChecked = useCallback(
    (tagId: string) => selectedTagIds.includes(tagId),
    [selectedTagIds]
  );

  const handleTagToggle = useCallback(
    (tagId: string, checked: boolean) => {
      const currentTagIds = form.getValues('tagIds') ?? [];
      const nextTagIds = checked
        ? [...currentTagIds, tagId]
        : currentTagIds.filter((id) => id !== tagId);

      form.setValue('tagIds', nextTagIds, { shouldDirty: true });

      if (!checked && primaryTagId === tagId) {
        form.setValue('primaryTagId', '', { shouldDirty: true });
      }
    },
    [form, primaryTagId]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleAttachmentFilterChange = useCallback((value: DetailAttachmentFilter) => {
    setTagsAttachmentFilter(value);
    setPage(1);
  }, []);

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
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

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
            <RefreshButton key="refresh" onRefresh={() => refetch()} loading={loading} iconOnly />,
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={tagsAttachmentFilter}
              onChange={handleAttachmentFilterChange}
            />,
            toolbarGrow(
              <EntityTagSearch
                key="search"
                search={search}
                onSearchChange={handleSearchChange}
                placeholder={t('search.placeholder')}
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
        data={tableTags}
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
