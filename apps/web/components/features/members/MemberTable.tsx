'use client';

import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { Ban, Mail, MailCheck, UserCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/Avatar';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { MemberWithInvitation } from '@/hooks/members';
import { useMembersStore } from '@/stores/members.store';

import { MemberActions } from './MemberActions';

export function MemberTable() {
  const t = useTranslations('members');

  const limit = useMembersStore((state) => state.limit);
  const search = useMembersStore((state) => state.search);
  const members = useMembersStore((state) => state.members);
  const loading = useMembersStore((state) => state.loading);

  const getStatusBadge = (status?: OrganizationInvitationStatus) => {
    if (!status) return null;

    const config = {
      [OrganizationInvitationStatus.Pending]: {
        variant: 'secondary' as const,
        icon: Mail,
        label: t('status.pending'),
      },
      [OrganizationInvitationStatus.Accepted]: {
        variant: 'default' as const,
        icon: MailCheck,
        label: t('status.accepted'),
      },
      [OrganizationInvitationStatus.Expired]: {
        variant: 'destructive' as const,
        icon: Ban,
        label: t('status.expired'),
      },
      [OrganizationInvitationStatus.Revoked]: {
        variant: 'outline' as const,
        icon: Ban,
        label: t('status.revoked'),
      },
    };

    const { variant, icon: Icon, label } = config[status];

    return (
      <Badge variant={variant}>
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const columns: ColumnConfig<MemberWithInvitation>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (member: MemberWithInvitation) => (
        <Avatar initial={member.name.charAt(0)} size="md" />
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (member: MemberWithInvitation) => (
        <span className="text-sm font-medium">{member.name}</span>
      ),
    },
    {
      key: 'email',
      header: t('table.email'),
      width: '240px',
      render: (member: MemberWithInvitation) =>
        member.email ? (
          <span className="text-sm text-muted-foreground">{member.email}</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'role',
      header: t('table.role'),
      width: '200px',
      render: (member: MemberWithInvitation) =>
        member.role ? (
          <Badge variant="outline">{member.role.name}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'status',
      header: t('table.status'),
      width: '150px',
      render: (member: MemberWithInvitation) =>
        member.type === 'member' ? (
          <Badge variant="default">
            <UserCheck className="mr-1 h-3 w-3" />
            {t('status.active')}
          </Badge>
        ) : (
          getStatusBadge(member.status)
        ),
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'email', type: 'text' },
      { key: 'role', type: 'badge' },
      { key: 'status', type: 'badge' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={members}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <UserCheck className="h-12 w-12" />,
        title: search ? t('noSearchResults.title') : t('empty.title'),
        description: search ? t('noSearchResults.description') : t('empty.description'),
      }}
      actionsColumn={{
        render: (member) => <MemberActions member={member} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
