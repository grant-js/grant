'use client';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Tag, User } from '@grantjs/schema';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  ScrollBadges,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag';
import { cn, getInitials } from '@/lib/utils';
import { useUsersStore } from '@/stores/users.store';

import { UserActions } from './user-actions';
import { UserAudit } from './user-audit';
import { UserCreateDialog } from './user-create-dialog';
import { UserNavigationButton } from './user-navigation-button';

export function UserTable() {
  const t = useTranslations('users');

  const limit = useUsersStore((state) => state.limit);
  const search = useUsersStore((state) => state.search);
  const users = useUsersStore((state) => state.users);
  const loading = useUsersStore((state) => state.loading);

  const transformRolesToBadges = (user: User) => {
    return (user.roles || []).map((role) => ({
      id: role.id,
      label: role.name,
      className: role.tags?.find((tag: Tag) => tag.isPrimary)?.color
        ? getTagBorderClasses(role.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor)
        : undefined,
    }));
  };

  const columns: DataTableColumnConfig<User>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (user: User) => (
        <Avatar
          initial={getInitials(user.name)}
          imageUrl={user.pictureUrl || undefined}
          cacheBuster={user.updatedAt}
          size="md"
          className={
            user.tags?.find((tag: Tag) => tag.isPrimary)?.color
              ? cn(
                  'border-2',
                  getTagBorderClasses(
                    user.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor
                  )
                )
              : undefined
          }
        />
      ),
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
      width: '200px',
      render: (user: User) => <ScrollBadges items={transformRolesToBadges(user)} height={60} />,
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (user: User) => (
        <ScrollBadges items={transformTagsToBadges(user.tags)} height={60} showAsRound={true} />
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
      { key: 'roles', type: 'list' },
      { key: 'tags', type: 'list' },
      { key: 'audit', type: 'audit' },
      { key: 'navigation', type: 'icon' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={users}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <UserPlus />,
        title: search ? t('noSearchResults.title') : t('noUsers.title'),
        description: search ? t('noSearchResults.description') : t('noUsers.description'),
        action: search ? undefined : <UserCreateDialog />,
      }}
      actionsColumn={{
        render: (user) => <UserActions user={user} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
