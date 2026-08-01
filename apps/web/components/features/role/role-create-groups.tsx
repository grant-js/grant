'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Group, GroupSortableField, SortOrder, Tag } from '@grantjs/schema';
import { Group as GroupIcon } from 'lucide-react';
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
  ScrollBadges,
  type TableSkeletonColumnConfig,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { Checkbox } from '@/components/ui/checkbox';
import { useDetailTableColumnVisibility, useScopeFromParams } from '@/hooks/common';
import { useGroupsList } from '@/hooks/groups';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';

import type { RoleCreateFormValues } from '../roles/role-types';
import { RoleGroupSearch } from './role-group-search';

const CREATE_ROLE_ATTACHMENT_PAGE_LIMIT = 10;

export function RoleCreateGroups() {
  const t = useTranslations('role.groups');
  const scope = useScopeFromParams();
  const form = useFormContext<RoleCreateFormValues>();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [groupsAttachmentFilter, setGroupsAttachmentFilter] = useState<'all' | 'selected'>('all');

  const selectedGroupIds = form.watch('groupIds') ?? [];

  const groupQueryIds = useMemo(
    () => resolveDetailQueryIds(groupsAttachmentFilter, selectedGroupIds),
    [groupsAttachmentFilter, selectedGroupIds]
  );

  const { groups, loading, error, totalCount, refetch } = useGroupsList({
    scope: scope!,
    page,
    limit: CREATE_ROLE_ATTACHMENT_PAGE_LIMIT,
    search,
    sort: { field: GroupSortableField.Name, order: SortOrder.Asc },
    ids: groupQueryIds,
  });

  const totalPages = Math.ceil(totalCount / CREATE_ROLE_ATTACHMENT_PAGE_LIMIT);

  const isGroupChecked = useCallback(
    (groupId: string) => selectedGroupIds.includes(groupId),
    [selectedGroupIds]
  );

  const handleGroupToggle = useCallback(
    (groupId: string, checked: boolean) => {
      const currentGroupIds = form.getValues('groupIds') ?? [];
      const nextGroupIds = checked
        ? [...currentGroupIds, groupId]
        : currentGroupIds.filter((id) => id !== groupId);

      form.setValue('groupIds', nextGroupIds, { shouldDirty: true });
    },
    [form]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: DataTableColumnConfig<Group>[] = [
    {
      key: 'checkbox',
      header: '',
      ...DETAIL_CHECKBOX_COLUMN,
      render: (group: Group) => (
        <DetailTableCheckboxCell>
          <Checkbox
            checked={isGroupChecked(group.id)}
            onCheckedChange={(checked) => handleGroupToggle(group.id, checked === true)}
          />
        </DetailTableCheckboxCell>
      ),
    },
    {
      key: 'icon',
      header: '',
      ...DETAIL_ICON_COLUMN,
      render: (group: Group) => {
        const primaryTag = group.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <DetailTableIconCell>
            <Avatar
              initial={group.name.charAt(0)}
              size="sm"
              icon={<GroupIcon className="h-3 w-3 text-muted-foreground" />}
              className={
                primaryTag
                  ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                  : undefined
              }
            />
          </DetailTableIconCell>
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (group: Group) => <span className="text-sm font-medium">{group.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (group: Group) => (
        <span className="text-sm text-muted-foreground">
          {group.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '180px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (group: Group) => (
        <ScrollBadges items={transformTagsToBadges(group.tags)} height={60} />
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
      { key: 'description', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'tags', type: 'text', ...DETAIL_TEXT_COLUMN },
    ]),
    rowCount: 5,
  };

  if (!scope) {
    return null;
  }

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
              value={groupsAttachmentFilter}
              onChange={setGroupsAttachmentFilter}
            />,
            toolbarGrow(
              <RoleGroupSearch
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
        data={groups}
        columns={visibleColumns}
        loading={loading}
        emptyState={{
          icon: <GroupIcon />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </FeatureModuleCard>
  );
}
