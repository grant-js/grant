'use client';

import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { Ban, Mail, MailCheck, UserCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { MemberWithInvitation } from '@/hooks/members';
import { useMembersStore } from '@/stores/members.store';

import { MemberActions } from './MemberActions';
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
      renderBody={(member: MemberWithInvitation) => (
        <div className="space-y-3">
          {member.role && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('table.role')}:</span>
              <Badge variant="outline">{member.role.name}</Badge>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('table.status')}:</span>
            {member.type === 'member' ? (
              <Badge variant="default">
                <UserCheck className="mr-1 h-3 w-3" />
                {t('status.active')}
              </Badge>
            ) : (
              getStatusBadge(member.status)
            )}
          </div>
        </div>
      )}
    />
  );
}
