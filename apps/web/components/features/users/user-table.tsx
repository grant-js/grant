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
  ScrollBadges,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import {
  getEntityTagCount,
  getPrimaryTagFromEntity,
  isSyntheticCdmEntity,
} from '@/lib/entity-list';
import { cn, getInitials } from '@/lib/utils';
import { useUsersStore } from '@/stores/users.store';

import { UserActions } from './user-actions';
import { UserAudit } from './user-audit';
import { UserNavigationButton } from './user-navigation-button';

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
      width: '60px',
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
      key: 'roles',
      header: t('table.roles'),
      width: '120px',
      render: (user: User) => (
        <Badge variant="secondary">{t('roleCount', { count: user.roleCount ?? 0 })}</Badge>
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
        <Badge variant="secondary">{tCommon('tagCount', { count: getEntityTagCount(user) })}</Badge>
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
      width: '60px',
      render: (user: User) => <UserNavigationButton user={user} size="sm" round={false} />,
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'roles', type: 'text' },
      { key: 'apiKeys', type: 'text' },
      { key: 'authMethods', type: 'list' },
      { key: 'tags', type: 'text' },
      { key: 'audit', type: 'audit' },
      { key: 'navigation', type: 'icon' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={visibleUsers}
      columns={columns}
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
