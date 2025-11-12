'use client';

import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { Calendar, Clock, Fingerprint, Mail, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common/Audit';
import { MemberWithInvitation } from '@/hooks/members';
import { formatTimestamp } from '@/lib/utils';

interface MemberAuditProps {
  member: MemberWithInvitation;
  className?: string;
}

export function MemberAudit({ member, className }: MemberAuditProps) {
  const t = useTranslations('common.audit');
  const tMembers = useTranslations('members.audit');

  const auditFields: AuditField[] = [];

  // ID field - always show
  auditFields.push({
    key: 'id',
    icon: <Fingerprint className="h-3 w-3" />,
    label: t('id'),
    getValue: (member: MemberWithInvitation) => member.id,
  });

  // For active members: show join date
  if (member.type === 'member') {
    auditFields.push({
      key: 'joinedAt',
      icon: <Calendar className="h-3 w-3" />,
      label: tMembers('joined'),
      getValue: (member: MemberWithInvitation) => formatTimestamp(member.createdAt),
    });
  }

  // For invitations: show inviter, sent date, and expiration
  if (member.type === 'invitation') {
    // Invited by - always show, even if inviter is null
    auditFields.push({
      key: 'invitedBy',
      icon: <User className="h-3 w-3" />,
      label: tMembers('invitedBy'),
      getValue: (member: MemberWithInvitation) => member.inviter?.name || '-',
    });

    // When sent (createdAt)
    auditFields.push({
      key: 'sentAt',
      icon: <Mail className="h-3 w-3" />,
      label: tMembers('sent'),
      getValue: (member: MemberWithInvitation) =>
        member.invitedAt ? formatTimestamp(member.invitedAt) : formatTimestamp(member.createdAt),
    });

    // Expires at (only for pending invitations)
    if (member.status === OrganizationInvitationStatus.Pending && member.expiresAt) {
      auditFields.push({
        key: 'expiresAt',
        icon: <Clock className="h-3 w-3" />,
        label: tMembers('expires'),
        getValue: (member: MemberWithInvitation) =>
          member.expiresAt ? formatTimestamp(member.expiresAt) : '-',
      });
    }
  }

  return <Audit fields={auditFields} item={member} className={className} />;
}
