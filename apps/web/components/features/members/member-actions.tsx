'use client';

import { useCallback, useMemo, useState } from 'react';

import { useParams } from 'next/navigation';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { canAssignRole } from '@grantjs/constants';
import { OrganizationInvitationStatus, Tenant } from '@grantjs/schema';
import { Ban, Copy, Mail, RefreshCw, Trash2, UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ActionItem, Actions } from '@/components/common';
import { MemberWithInvitation, useMemberMutations } from '@/hooks/members';
import { useAuthStore } from '@/stores/auth.store';
import { useMembersStore } from '@/stores/members.store';

import { MemberInvitationResendDialog } from './member-invitation-resend-dialog';
import { MemberInvitationRevokeDialog } from './member-invitation-revoke-dialog';
import { MemberRemoveDialog } from './member-remove-dialog';
import { MemberRoleUpdateDialog } from './member-role-update-dialog';

interface MemberActionsProps {
  member: MemberWithInvitation;
}

export function MemberActions({ member }: MemberActionsProps) {
  const t = useTranslations('members.actions');
  const params = useParams();
  const organizationId = params.organizationId as string;
  const locale = params.locale as string;
  const { resendInvitationEmail, renewInvitation } = useMemberMutations();
  const { getCurrentAccount } = useAuthStore();
  const currentAccount = getCurrentAccount();
  const members = useMembersStore((state) => state.members);

  // Scope permissions to this organization
  const scope = { tenant: Tenant.Organization, id: organizationId };

  // Check permissions using the Grant client
  const canUpdateMember = useGrant(ResourceSlug.OrganizationMember, ResourceAction.Update, {
    scope,
  });
  const canRemoveMember = useGrant(ResourceSlug.OrganizationMember, ResourceAction.Remove, {
    scope,
  });
  const canRevokeInvitation = useGrant(
    ResourceSlug.OrganizationInvitation,
    ResourceAction.Revoke,
    { scope }
  );
  const canResendInvitationEmail = useGrant(
    ResourceSlug.OrganizationInvitation,
    ResourceAction.ResendEmail,
    { scope }
  );
  const canRenewInvitation = useGrant(
    ResourceSlug.OrganizationInvitation,
    ResourceAction.Renew,
    { scope }
  );

  const currentUserRole = useMemo(() => {
    const ownerId = currentAccount?.ownerId;
    if (!ownerId || !members.length) return null;
    const currentMember = members.find((m) => m.type === 'member' && m.user?.id === ownerId);
    return currentMember?.role?.name || null;
  }, [currentAccount, members]);

  const isCurrentUser = member.type === 'member' && member.user?.id === currentAccount?.ownerId;

  const canManageMember = useMemo(() => {
    if (!currentUserRole) return true;

    if (member.type === 'member' && member.role?.name) {
      return canAssignRole(currentUserRole, member.role.name);
    }

    if (member.type === 'invitation' && member.role?.name) {
      return canAssignRole(currentUserRole, member.role.name);
    }

    return true;
  }, [currentUserRole, member.type, member.role?.name]);

  const isExpired = useMemo(() => {
    if (member.type === 'member') return false;
    if (!member.expiresAt) return false;
    return new Date(member.expiresAt) < new Date();
  }, [member]);

  const effectiveStatus = useMemo(() => {
    if (member.type === 'member') return null;
    if (!member.status) return null;
    if (member.status === OrganizationInvitationStatus.Pending && isExpired) {
      return OrganizationInvitationStatus.Expired;
    }
    return member.status;
  }, [member, isExpired]);
  const [isUpdateRoleDialogOpen, setIsUpdateRoleDialogOpen] = useState(false);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const [isResendInvitationDialogOpen, setIsResendInvitationDialogOpen] = useState(false);
  const [isRevokeInvitationDialogOpen, setIsRevokeInvitationDialogOpen] = useState(false);

  const handleCopyInvitationLink = useCallback(async () => {
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
  }, [member.invitationToken, locale, t]);

  const actions: ActionItem<MemberWithInvitation>[] = useMemo(() => {
    const actionItems: ActionItem<MemberWithInvitation>[] = [];

    if (member.type === 'member' && member.user) {
      if (member.role && canUpdateMember) {
        actionItems.push({
          key: 'updateRole',
          label: t('updateRole'),
          icon: <UserCog className="mr-2 h-4 w-4" />,
          onClick: () => setIsUpdateRoleDialogOpen(true),
        });
      }

      if (canRemoveMember) {
        actionItems.push({
          key: 'remove',
          label: t('remove'),
          icon: <Trash2 className="mr-2 h-4 w-4" />,
          onClick: () => setIsRemoveMemberDialogOpen(true),
          variant: 'destructive',
        });
      }
    }

    if (member.type === 'invitation') {
      const isPending = effectiveStatus === OrganizationInvitationStatus.Pending;
      const isExpiredStatus = effectiveStatus === OrganizationInvitationStatus.Expired;
      const isRevoked = effectiveStatus === OrganizationInvitationStatus.Revoked;

      if (isPending && !isExpired && member.invitationToken) {
        actionItems.push({
          key: 'copyLink',
          label: t('copyLink'),
          icon: <Copy className="mr-2 h-4 w-4" />,
          onClick: handleCopyInvitationLink,
        });
      }

      if (isPending && !isExpired && canResendInvitationEmail) {
        actionItems.push({
          key: 'resendEmail',
          label: t('resendEmail'),
          icon: <Mail className="mr-2 h-4 w-4" />,
          onClick: async () => {
            try {
              await resendInvitationEmail(member.id, organizationId);
            } catch (error) {
              console.error('Failed to resend invitation email:', error);
            }
          },
        });
      }

      if (isPending && !isExpired && canRevokeInvitation) {
        actionItems.push({
          key: 'revoke',
          label: t('revoke'),
          icon: <Ban className="mr-2 h-4 w-4" />,
          onClick: () => setIsRevokeInvitationDialogOpen(true),
          variant: 'destructive',
        });
      }

      if (isExpiredStatus && canRenewInvitation) {
        actionItems.push({
          key: 'renew',
          label: t('renew'),
          icon: <RefreshCw className="mr-2 h-4 w-4" />,
          onClick: async () => {
            try {
              await renewInvitation(member.id, organizationId);
            } catch (error) {
              console.error('Failed to renew invitation:', error);
            }
          },
        });
      }

      // For revoked or expired (from status field) invitations - show resend dialog
      if (
        (isRevoked || (member.status === OrganizationInvitationStatus.Expired && !isExpired)) &&
        canResendInvitationEmail
      ) {
        actionItems.push({
          key: 'resend',
          label: t('resend'),
          icon: <Mail className="mr-2 h-4 w-4" />,
          onClick: () => setIsResendInvitationDialogOpen(true),
        });
      }
    }

    return actionItems;
  }, [
    member.type,
    member.user,
    member.role,
    member.status,
    member.invitationToken,
    member.id,
    effectiveStatus,
    isExpired,
    organizationId,
    t,
    handleCopyInvitationLink,
    resendInvitationEmail,
    renewInvitation,
    setIsUpdateRoleDialogOpen,
    setIsRemoveMemberDialogOpen,
    setIsRevokeInvitationDialogOpen,
    setIsResendInvitationDialogOpen,
    canUpdateMember,
    canRemoveMember,
    canRevokeInvitation,
    canResendInvitationEmail,
    canRenewInvitation,
  ]);

  if (actions.length === 0 || isCurrentUser || !canManageMember) {
    return null;
  }

  return (
    <>
      <Actions entity={member} actions={actions} />
      {member.type === 'member' && member.user && (
        <>
          <MemberRoleUpdateDialog
            member={member}
            open={isUpdateRoleDialogOpen}
            onOpenChange={setIsUpdateRoleDialogOpen}
          />
          <MemberRemoveDialog
            member={member}
            organizationId={organizationId}
            open={isRemoveMemberDialogOpen}
            onOpenChange={setIsRemoveMemberDialogOpen}
          />
        </>
      )}
      {member.type === 'invitation' && member.email && (
        <>
          <MemberInvitationRevokeDialog
            member={member}
            organizationId={organizationId}
            open={isRevokeInvitationDialogOpen}
            onOpenChange={setIsRevokeInvitationDialogOpen}
          />
          <MemberInvitationResendDialog
            member={member}
            open={isResendInvitationDialogOpen}
            onOpenChange={setIsResendInvitationDialogOpen}
          />
        </>
      )}
    </>
  );
}
