'use client';

import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { Shield, UserCheck, UserCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardBody, CardGrid, CardHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { MemberWithInvitation } from '@/hooks/members';
import { useMembersStore } from '@/stores/members.store';

import { MemberActions } from './MemberActions';
import { MemberAudit } from './MemberAudit';
import { MemberCardSkeleton } from './MemberCardSkeleton';

export function MemberCards() {
  const t = useTranslations('members');

  const limit = useMembersStore((state) => state.limit);
  const search = useMembersStore((state) => state.search);
  const members = useMembersStore((state) => state.members);
  const loading = useMembersStore((state) => state.loading);

  const getStatusBadge = (status?: OrganizationInvitationStatus) => {
    if (!status) return null;

    const config = {
      [OrganizationInvitationStatus.Pending]: {
        color: 'text-muted-foreground',
        label: t('status.pending'),
      },
      [OrganizationInvitationStatus.Accepted]: {
        color: 'text-green-600',
        label: t('status.accepted'),
      },
      [OrganizationInvitationStatus.Expired]: {
        color: 'text-orange-500',
        label: t('status.expired'),
      },
      [OrganizationInvitationStatus.Revoked]: {
        color: 'text-destructive',
        label: t('status.revoked'),
      },
    };

    const { color, label } = config[status];

    return <span className={`text-sm ${color} flex items-center gap-1`}>{label}</span>;
  };

  return (
    <CardGrid<MemberWithInvitation>
      entities={members}
      loading={loading}
      emptyState={{
        icon: UserCheck,
        title: search ? t('noSearchResults.title') : t('empty.title'),
        description: search ? t('noSearchResults.description') : t('empty.description'),
      }}
      skeleton={{
        component: <MemberCardSkeleton />,
        count: limit,
      }}
      renderHeader={(member: MemberWithInvitation) => (
        <CardHeader
          avatar={{
            initial: member.name.charAt(0),
            size: 'lg',
          }}
          title={member.name}
          description={member.email}
          actions={<MemberActions member={member} />}
        />
      )}
      renderBody={(member: MemberWithInvitation) => {
        const items = [];

        if (member.role) {
          items.push({
            label: {
              icon: <Shield className="h-3 w-3" />,
              text: t('table.role'),
            },
            value: <Badge variant="outline">{t(member.role?.name as string)}</Badge>,
          });
        }

        items.push({
          label: {
            icon: <UserCircle className="h-3 w-3" />,
            text: t('table.status'),
          },
          value:
            member.type === 'member' ? (
              <span className="text-sm text-green-600">{t('status.active')}</span>
            ) : (
              getStatusBadge(member.status)
            ),
        });

        return <CardBody items={items} />;
      }}
      renderFooter={(member: MemberWithInvitation) => <MemberAudit member={member} />}
    />
  );
}
