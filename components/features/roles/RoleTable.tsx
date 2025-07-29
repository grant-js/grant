'use client';

import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/Avatar';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { ScrollBadges } from '@/components/ui/scroll-badges';
import { Role } from '@/graphql/generated/types';
import { getTagColorClasses, getAvatarBorderColorClasses } from '@/lib/tag-colors';

import { CreateRoleDialog } from './CreateRoleDialog';
import { RoleActions } from './RoleActions';
import { RoleAudit } from './RoleAudit';

interface RoleTableProps {
  limit: number;
  roles: Role[];
  loading: boolean;
  search: string;
  onEditClick: (role: Role) => void;
  onDeleteClick: (role: Role) => void;
}

export function RoleTable({
  limit,
  roles,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: RoleTableProps) {
  const t = useTranslations('roles');

  const transformGroupsToBadges = (role: Role) => {
    return (role.groups || []).map((group) => ({
      id: group.id,
      label: group.name,
      className: group.tags?.length ? getTagColorClasses(group.tags[0].color) : undefined,
    }));
  };

  const columns: ColumnConfig<Role>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (role: Role) => (
        <Avatar
          initial={role.name.charAt(0)}
          size="md"
          className={
            role.tags?.[0]?.color
              ? `border-2 ${getAvatarBorderColorClasses(role.tags[0].color)}`
              : undefined
          }
        />
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (role: Role) => <span className="text-sm font-medium">{role.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      render: (role: Role) => (
        <span className="text-sm text-muted-foreground">
          {role.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'groups',
      header: t('form.groups'),
      width: '200px',
      render: (role: Role) => (
        <ScrollBadges
          items={transformGroupsToBadges(role)}
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
      render: (role: Role) => <RoleAudit role={role} />,
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'groups', type: 'list' },
      { key: 'audit', type: 'audit' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={roles}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Shield className="h-12 w-12" />,
        title: search ? t('noSearchResults.title') : t('noRoles.title'),
        description: search ? t('noSearchResults.description') : t('noRoles.description'),
        action: search ? undefined : <CreateRoleDialog />,
      }}
      actionsColumn={{
        render: (role) => (
          <RoleActions role={role} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
        ),
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
