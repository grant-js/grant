'use client';

import { useState } from 'react';

import { useParams } from 'next/navigation';

import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { Ban, Mail, Trash2, UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionItem, Actions } from '@/components/common';
import { MemberWithInvitation } from '@/hooks/members';

import { RemoveMemberDialog } from './RemoveMemberDialog';
import { ResendInvitationDialog } from './ResendInvitationDialog';
import { RevokeInvitationDialog } from './RevokeInvitationDialog';
import { UpdateMemberRoleDialog } from './UpdateMemberRoleDialog';

interface MemberActionsProps {
  member: MemberWithInvitation;
}

export function MemberActions({ member }: MemberActionsProps) {
  const t = useTranslations('members.actions');
  const params = useParams();
  const organizationId = params.organizationId as string;
  const [isUpdateRoleDialogOpen, setIsUpdateRoleDialogOpen] = useState(false);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const [isResendInvitationDialogOpen, setIsResendInvitationDialogOpen] = useState(false);
  const [isRevokeInvitationDialogOpen, setIsRevokeInvitationDialogOpen] = useState(false);

  const actions: ActionItem<MemberWithInvitation>[] = [];

  // Actions for active members
  if (member.type === 'member' && member.user) {
    // Update role action
    if (member.role) {
      actions.push({
        key: 'updateRole',
        label: t('updateRole'),
        icon: <UserCog className="mr-2 h-4 w-4" />,
        onClick: () => setIsUpdateRoleDialogOpen(true),
      });
    }

    // Remove member action
    actions.push({
      key: 'remove',
      label: t('remove'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: () => setIsRemoveMemberDialogOpen(true),
      variant: 'destructive',
    });
  }

  // Actions for invitations
  if (member.type === 'invitation') {
    // Revoke action for pending invitations
    if (member.status === OrganizationInvitationStatus.Pending) {
      actions.push({
        key: 'revoke',
        label: t('revoke'),
        icon: <Ban className="mr-2 h-4 w-4" />,
        onClick: () => setIsRevokeInvitationDialogOpen(true),
        variant: 'destructive',
      });
    }

    // Resend/Renew action for revoked or expired invitations
    if (
      member.status === OrganizationInvitationStatus.Revoked ||
      member.status === OrganizationInvitationStatus.Expired
    ) {
      actions.push({
        key: 'resend',
        label: t('resend'),
        icon: <Mail className="mr-2 h-4 w-4" />,
        onClick: () => setIsResendInvitationDialogOpen(true),
      });
    }
  }

  // Don't render anything if no actions available
  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <Actions entity={member} actions={actions} />
      {member.type === 'member' && member.user && (
        <>
          <UpdateMemberRoleDialog
            member={member}
            open={isUpdateRoleDialogOpen}
            onOpenChange={setIsUpdateRoleDialogOpen}
          />
          <RemoveMemberDialog
            member={member}
            organizationId={organizationId}
            open={isRemoveMemberDialogOpen}
            onOpenChange={setIsRemoveMemberDialogOpen}
          />
        </>
      )}
      {member.type === 'invitation' && member.email && (
        <>
          <RevokeInvitationDialog
            member={member}
            open={isRevokeInvitationDialogOpen}
            onOpenChange={setIsRevokeInvitationDialogOpen}
          />
          <ResendInvitationDialog
            member={member}
            organizationId={organizationId}
            open={isResendInvitationDialogOpen}
            onOpenChange={setIsResendInvitationDialogOpen}
          />
        </>
      )}
    </>
  );
}
