'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { User } from '@grantjs/schema';
import { UserPlus } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  EntityCreateNavigateButton,
  RelationCountChip,
  ScrollBadges,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { usePageTableColumnVisibility } from '@/hooks/common';
import {
  DATA_TABLE_AVATAR_COLUMN_WIDTH,
  DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
} from '@/lib/detail-table-column-width';
import {
  getEntityTagCount,
  getPrimaryTagFromEntity,
  isSyntheticCdmEntity,
} from '@/lib/entity-list';
import { getUserEmail } from '@/lib/user-email';
import { cn, getInitials } from '@/lib/utils';
import { useUsersStore } from '@/stores/users.store';

import { UserActions } from './user-actions';
import { UserAudit } from './user-audit';
import { UserNavigationButton } from './user-navigation-button';

const TABLE_ID = 'users.list';

export function UserTable() {
  const t = useTranslations('users');
  const tCommon = useTranslations('common');
  const tProjectApps = useTranslations('projectApps');

  const limit = useUsersStore((state) => state.limit);
  const search = useUsersStore((state) => state.search);
  const users = useUsersStore((state) => state.users);
  const loading = useUsersStore((state) => state.loading);
  const hideSynthetic = useUsersStore((state) => state.hideSyntheticEntities);

  const transformAuthMethodsToBadges = (user: User) =>
    (user.authenticationMethods ?? []).map((m) => ({
      id: `${m.provider}:${m.providerId}`,
      label: tProjectApps(`providers.${m.provider}` as 'providers.email' | 'providers.github'),
      title: m.providerId,
    }));

  const visibleUsers = hideSynthetic
    ? users.filter((user) => !isSyntheticCdmEntity(user.metadata as Record<string, unknown>))
    : users;

  const columns: DataTableColumnConfig<User>[] = [
    {
      key: 'avatar',
      header: '',
      width: DATA_TABLE_AVATAR_COLUMN_WIDTH,
      className: 'pl-4',
      render: (user: User) => {
        const primaryTag = getPrimaryTagFromEntity(user);
        return (
          <Avatar
            initial={getInitials(user.name)}
            imageUrl={user.pictureUrl || undefined}
            cacheBuster={user.updatedAt}
            size="md"
            className={
              primaryTag?.color
                ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                : undefined
            }
          />
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (user: User) => <span className="text-sm font-medium">{user.name}</span>,
    },
    {
      key: 'email',
      header: t('table.email'),
      width: '240px',
      render: (user: User) => {
        const email = getUserEmail(user);
        return email ? (
          <span className="block truncate text-sm text-muted-foreground" title={email}>
            {email}
          </span>
        ) : null;
      },
    },
    {
      key: 'roles',
      header: t('table.roles'),
      width: '120px',
      render: (user: User) => (
        <RelationCountChip
          entity="user"
          relation="roles"
          entityId={user.id}
          count={user.roleCount ?? 0}
        >
          {t('roleCount', { count: user.roleCount ?? 0 })}
        </RelationCountChip>
      ),
    },
    {
      key: 'groups',
      header: t('table.groups'),
      width: '120px',
      render: (user: User) => (
        <RelationCountChip
          entity="user"
          relation="groups"
          entityId={user.id}
          count={user.groupCount ?? 0}
        >
          {t('groupCount', { count: user.groupCount ?? 0 })}
        </RelationCountChip>
      ),
    },
    {
      key: 'permissions',
      header: t('table.permissions'),
      width: '120px',
      render: (user: User) => (
        <RelationCountChip
          entity="user"
          relation="permissions"
          entityId={user.id}
          count={user.permissionCount ?? 0}
        >
          {t('permissionCount', { count: user.permissionCount ?? 0 })}
        </RelationCountChip>
      ),
    },
    {
      key: 'apiKeys',
      header: t('table.apiKeys'),
      width: '120px',
      render: (user: User) => (
        <Badge variant="secondary">
          {t('apiKeyCount', { count: user.projectUserApiKeyCount ?? 0 })}
        </Badge>
      ),
    },
    {
      key: 'authMethods',
      header: t('table.authMethods'),
      width: '140px',
      render: (user: User) => (
        <ScrollBadges items={transformAuthMethodsToBadges(user)} height={60} />
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '120px',
      render: (user: User) => (
        <RelationCountChip
          entity="user"
          relation="tags"
          entityId={user.id}
          count={getEntityTagCount(user)}
        >
          {tCommon('tagCount', { count: getEntityTagCount(user) })}
        </RelationCountChip>
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (user: User) => <UserAudit user={user} />,
    },
    {
      key: 'navigation',
      header: '',
      width: DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
      render: (user: User) => <UserNavigationButton user={user} size="sm" round={false} />,
    },
  ];

  const { visibleColumns, filterSkeletonColumns } = usePageTableColumnVisibility(columns, {
    tableId: TABLE_ID,
  });

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'email', type: 'text' },
      { key: 'roles', type: 'text' },
      { key: 'groups', type: 'text' },
      { key: 'permissions', type: 'text' },
      { key: 'apiKeys', type: 'text' },
      { key: 'authMethods', type: 'list' },
      { key: 'tags', type: 'text' },
      { key: 'audit', type: 'audit' },
      { key: 'navigation', type: 'icon' },
    ]),
    rowCount: limit,
  };

  return (
    <DataTable
      tableId={TABLE_ID}
      data={visibleUsers}
      columns={visibleColumns}
      loading={loading}
      emptyState={{
        icon: <UserPlus />,
        title: search ? t('noSearchResults.title') : t('noUsers.title'),
        description: search ? t('noSearchResults.description') : t('noUsers.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="users"
            label={t('createDialog.trigger')}
            icon={UserPlus}
            alwaysShowLabel
          />
        ),
      }}
      actionsColumn={{
        render: (user) => <UserActions user={user} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
