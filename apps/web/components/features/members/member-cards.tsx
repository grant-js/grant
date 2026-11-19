'use client';

import { type ComponentProps, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { OrganizationInvitationStatus } from '@grantjs/schema';
import { Shield, UserCheck, UserCircle } from 'lucide-react';

import { CardBody, CardGrid, CardHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { usePageCardFields } from '@/hooks/common';
import { MemberWithInvitation } from '@/hooks/members';
import { useMembersStore } from '@/stores/members.store';

import { MemberActions } from './member-actions';
import { MemberAudit } from './member-audit';
import { MemberCardSkeleton } from './member-card-skeleton';

export function MemberCards() {
  const t = useTranslations('members');
  const tRoot = useTranslations();

  const cardFields = useMemo(
    () => [
      { key: 'role', label: t('table.role') },
      { key: 'status', label: t('table.status') },
    ],
    [t]
  );
  const { arrange } = usePageCardFields(cardFields, { listId: 'members.list' });
  const limit = useMembersStore((state) => state.limit);
  const search = useMembersStore((state) => state.search);
  const members = useMembersStore((state) => state.members);
  const loading = useMembersStore((state) => state.loading);

  const getEffectiveStatus = (
    member: MemberWithInvitation
  ): OrganizationInvitationStatus | null => {
    if (member.type === 'member') return null;
    if (!member.status) return null;

    // If status is pending but invitation has expired, show as expired
    if (
      member.status === OrganizationInvitationStatus.Pending &&
      member.expiresAt &&
      new Date(member.expiresAt) < new Date()
    ) {
      return OrganizationInvitationStatus.Expired;
    }

    return member.status;
  };

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
        icon: <UserCheck />,
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
        const items: ComponentProps<typeof CardBody>['items'] = [];

        if (member.role) {
          items.push({
            key: 'role',
            label: {
              icon: <Shield className="h-3 w-3" />,
              text: t('table.role'),
            },
            value: <Badge variant="outline">{tRoot(member.role?.name as string)}</Badge>,
          });
        }

        items.push({
          key: 'status',
          label: {
            icon: <UserCircle className="h-3 w-3" />,
            text: t('table.status'),
          },
          value:
            member.type === 'member' ? (
              <span className="text-sm text-green-600">{t('status.active')}</span>
            ) : (
              getStatusBadge(getEffectiveStatus(member) || undefined)
            ),
        });

        return <CardBody items={arrange(items)} />;
      }}
      renderFooter={(member: MemberWithInvitation) => <MemberAudit member={member} />}
    />
  );
}
