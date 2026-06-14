'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Role, RoleSortableField, SortOrder, Tag } from '@grantjs/schema';
import { Shield } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  DataTableColumnToggle,
  DetailAttachmentFilterToggle,
  FeatureModuleCard,
  FieldInfoPopover,
  Pagination,
  RefreshButton,
  ScrollBadges,
  type TableSkeletonColumnConfig,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { Checkbox } from '@/components/ui/checkbox';
import { useDetailTableColumnVisibility } from '@/hooks/common';
import { useProjectUserScope } from '@/hooks/common/use-project-user-scope';
import { useRoles } from '@/hooks/roles';
import { resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';

import type { UserCreateFormValues } from '../users/user-types';
import {
  USER_DETAIL_CHECKBOX_COLUMN,
  USER_DETAIL_CHECKBOX_SKELETON,
  USER_DETAIL_CONTENT_COLUMN_CLASS,
  USER_DETAIL_ICON_COLUMN,
  USER_DETAIL_ICON_SKELETON,
  USER_DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
  USER_DETAIL_TEXT_COLUMN,
  UserDetailTableCheckboxCell,
  UserDetailTableIconCell,
} from './user-detail-table-layout';
import { UserRoleSearch } from './user-role-search';

const CREATE_USER_ATTACHMENT_PAGE_LIMIT = 10;

export function UserCreateRoles() {
  const t = useTranslations('user.roles');
  const scope = useProjectUserScope();
  const form = useFormContext<UserCreateFormValues>();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rolesAttachmentFilter, setRolesAttachmentFilter] = useState<'all' | 'selected'>('all');

  const selectedRoleIds = form.watch('roleIds') ?? [];

  const roleQueryIds = useMemo(
    () => resolveDetailQueryIds(rolesAttachmentFilter, selectedRoleIds),
    [rolesAttachmentFilter, selectedRoleIds]
  );

  const { roles, loading, error, totalCount, refetch } = useRoles({
    scope: scope!,
    page,
    limit: CREATE_USER_ATTACHMENT_PAGE_LIMIT,
    search,
    sort: { field: RoleSortableField.Name, order: SortOrder.Asc },
    ids: roleQueryIds,
  });

  const totalPages = Math.ceil(totalCount / CREATE_USER_ATTACHMENT_PAGE_LIMIT);

  const isRoleChecked = useCallback(
    (roleId: string) => selectedRoleIds.includes(roleId),
    [selectedRoleIds]
  );

  const handleRoleToggle = useCallback(
    (roleId: string, checked: boolean) => {
      const currentRoleIds = form.getValues('roleIds') ?? [];
      const nextRoleIds = checked
        ? [...currentRoleIds, roleId]
        : currentRoleIds.filter((id) => id !== roleId);

      form.setValue('roleIds', nextRoleIds, { shouldDirty: true });
    },
    [form]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: DataTableColumnConfig<Role>[] = [
    {
      key: 'checkbox',
      header: '',
      ...USER_DETAIL_CHECKBOX_COLUMN,
      render: (role: Role) => (
        <UserDetailTableCheckboxCell>
          <Checkbox
            checked={isRoleChecked(role.id)}
            onCheckedChange={(checked) => handleRoleToggle(role.id, checked === true)}
          />
        </UserDetailTableCheckboxCell>
      ),
    },
    {
      key: 'icon',
      header: '',
      ...USER_DETAIL_ICON_COLUMN,
      render: (role: Role) => {
        const primaryTag = role.tags?.find((tag: Tag) => tag.isPrimary);
        return (
          <UserDetailTableIconCell>
            <Avatar
              initial={role.name.charAt(0)}
              size="sm"
              icon={<Shield className="h-3 w-3 text-muted-foreground" />}
              className={
                primaryTag
                  ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                  : undefined
              }
            />
          </UserDetailTableIconCell>
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (role: Role) => <span className="text-sm font-medium">{role.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (role: Role) => (
        <span className="text-sm text-muted-foreground">
          {role.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '180px',
      ...USER_DETAIL_TEXT_COLUMN,
      className: USER_DETAIL_CONTENT_COLUMN_CLASS,
      render: (role: Role) => <ScrollBadges items={transformTagsToBadges(role.tags)} height={60} />,
    },
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      USER_DETAIL_CHECKBOX_SKELETON,
      USER_DETAIL_ICON_SKELETON,
      { key: 'name', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'description', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
      { key: 'tags', type: 'text', ...USER_DETAIL_TEXT_COLUMN },
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
      titleAdornment={
        <FieldInfoPopover
          description={t('descriptionInfo')}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
      collapsible
      toolbar={
        <Toolbar
          fullWidth
          alwaysRow
          items={[
            <RefreshButton key="refresh" onRefresh={() => refetch()} loading={loading} iconOnly />,
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={rolesAttachmentFilter}
              onChange={setRolesAttachmentFilter}
            />,
            toolbarGrow(
              <UserRoleSearch
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
        data={roles}
        columns={visibleColumns}
        loading={loading}
        emptyState={{
          icon: <Shield />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </FeatureModuleCard>
  );
}
