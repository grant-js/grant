'use client';

import { useState } from 'react';

import { useParams } from 'next/navigation';

import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { Ban, Copy, Mail, Trash2, UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ActionItem, Actions } from '@/components/common';
import { MemberWithInvitation, useMemberMutations } from '@/hooks/members';

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
  const locale = params.locale as string;
  const { resendInvitationEmail } = useMemberMutations();
  const [isUpdateRoleDialogOpen, setIsUpdateRoleDialogOpen] = useState(false);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const [isResendInvitationDialogOpen, setIsResendInvitationDialogOpen] = useState(false);
  const [isRevokeInvitationDialogOpen, setIsRevokeInvitationDialogOpen] = useState(false);

  const handleCopyInvitationLink = async () => {
    if (!member.invitationToken) {
      toast.error(t('copyLinkError'));
      return;
    }

    const invitationUrl = `${window.location.origin}/${locale}/invitations/${member.invitationToken}`;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success(t('copyLinkSuccess'));
    } catch (err) {
      console.error('Failed to copy invitation link:', err);
      toast.error(t('copyLinkError'));
    }
  };

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
    // Copy invitation link action for pending invitations
    if (member.status === OrganizationInvitationStatus.Pending && member.invitationToken) {
      actions.push({
        key: 'copyLink',
        label: t('copyLink'),
        icon: <Copy className="mr-2 h-4 w-4" />,
        onClick: handleCopyInvitationLink,
      });
    }

    // Resend email action for pending invitations
    if (member.status === OrganizationInvitationStatus.Pending) {
      actions.push({
        key: 'resendEmail',
        label: t('resendEmail'),
        icon: <Mail className="mr-2 h-4 w-4" />,
        onClick: async () => {
          try {
            await resendInvitationEmail(member.id);
          } catch (error) {
            // Error is handled by the mutation hook
            console.error('Failed to resend invitation email:', error);
          }
        },
      });
    }

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
