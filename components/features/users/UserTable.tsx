'use client';

import { Shield, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/Avatar';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { ScrollBadges } from '@/components/ui/scroll-badges';
import { User } from '@/graphql/generated/types';
import { getTagColorClasses, getAvatarBorderColorClasses } from '@/lib/tag-colors';

import { CreateUserDialog } from './CreateUserDialog';
import { UserActions } from './UserActions';
import { UserAudit } from './UserAudit';

interface UserTableProps {
  limit: number;
  users: User[];
  loading: boolean;
  search: string;
  onEditClick: (user: User) => void;
  onDeleteClick: (user: User) => void;
}

export function UserTable({
  limit,
  users,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: UserTableProps) {
  const t = useTranslations('users');

  const transformRolesToBadges = (user: User) => {
    return (user.roles || []).map((role) => ({
      id: role.id,
      label: role.name,
      className: role.tags?.length ? getTagColorClasses(role.tags[0].color) : undefined,
    }));
  };

  const columns: ColumnConfig<User>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (user: User) => (
        <Avatar
          initial={user.name.charAt(0)}
          size="md"
          className={
            user.tags?.[0]?.color
              ? `border-2 ${getAvatarBorderColorClasses(user.tags[0].color)}`
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
      key: 'email',
      header: t('table.email'),
      width: '250px',
      render: (user: User) => (
        <a href={`mailto:${user.email}`} className="text-sm text-primary hover:underline">
          {user.email}
        </a>
      ),
    },
    {
      key: 'roles',
      header: t('table.roles'),
      width: '200px',
      render: (user: User) => (
        <ScrollBadges
          items={transformRolesToBadges(user)}
          title=""
          icon={<Shield className="h-3 w-3" />}
          height={60}
        />
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (user: User) => <UserAudit user={user} />,
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'email', type: 'text' },
      { key: 'roles', type: 'list' },
      { key: 'audit', type: 'audit' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={users}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <UserPlus className="h-12 w-12" />,
        title: search ? t('noSearchResults.title') : t('noUsers.title'),
        description: search ? t('noSearchResults.description') : t('noUsers.description'),
        action: search ? undefined : <CreateUserDialog />,
      }}
      actionsColumn={{
        render: (user) => (
          <UserActions user={user} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
        ),
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
