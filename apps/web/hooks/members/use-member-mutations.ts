import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  AcceptInvitationDocument,
  AcceptInvitationInput,
  AcceptInvitationResult,
  InviteMemberDocument,
  InviteMemberInput,
  OrganizationInvitation,
  OrganizationMember,
  RemoveOrganizationMemberDocument,
  RenewInvitationDocument,
  ResendInvitationEmailDocument,
  RevokeInvitationDocument,
  Tenant,
  UpdateOrganizationMemberDocument,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { evictMembersAndInvitationsCache } from './cache';

export function useMemberMutations() {
  const t = useTranslations('members');

  const update = (cache: ApolloCache) => {
    evictMembersAndInvitationsCache(cache);
  };

  const [inviteMember] = useMutation<{ inviteMember: OrganizationInvitation }>(
    InviteMemberDocument,
    {
      update,
    }
  );

  const [acceptInvitation] = useMutation<{ acceptInvitation: AcceptInvitationResult }>(
    AcceptInvitationDocument,
    {
      update,
    }
  );

  const [revokeInvitation] = useMutation<{ revokeInvitation: OrganizationInvitation }>(
    RevokeInvitationDocument,
    {
      update,
    }
  );

  const [resendInvitationEmail] = useMutation<{ resendInvitationEmail: OrganizationInvitation }>(
    ResendInvitationEmailDocument,
    {
      update,
    }
  );

  const [renewInvitation] = useMutation<{ renewInvitation: OrganizationInvitation }>(
    RenewInvitationDocument,
    {
      update,
    }
  );

  const [updateOrganizationMember] = useMutation<{
    updateOrganizationMember: OrganizationMember;
  }>(UpdateOrganizationMemberDocument, {
    update,
  });

  const [removeOrganizationMember] = useMutation<{
    removeOrganizationMember: OrganizationMember;
  }>(RemoveOrganizationMemberDocument, {
    update,
  });

  const handleInviteMember = async (input: InviteMemberInput) => {
    try {
      const result = await inviteMember({
        variables: { input },
      });

      toast.success(t('notifications.inviteSuccess'));
      return result.data?.inviteMember;
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error(t('notifications.inviteError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleAcceptInvitation = async (input: AcceptInvitationInput) => {
    try {
      const result = await acceptInvitation({
        variables: { input },
      });

      toast.success(t('notifications.acceptSuccess'));
      return result.data?.acceptInvitation;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(t('notifications.acceptError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRevokeInvitation = async (
    id: string,
    organizationId: string,
    email: string
  ): Promise<OrganizationInvitation | undefined> => {
    try {
      const result = await revokeInvitation({
        variables: {
          id,
          scope: {
            id: organizationId,
            tenant: Tenant.Organization,
          },
        },
      });

      toast.success(t('notifications.revokeSuccess'), {
        description: `Invitation for ${email} has been revoked`,
      });
      return result.data?.revokeInvitation;
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast.error(t('notifications.revokeError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleUpdateMemberRole = async (userId: string, organizationId: string, roleId: string) => {
    try {
      const result = await updateOrganizationMember({
        variables: {
          userId,
          input: {
            scope: {
              id: organizationId,
              tenant: Tenant.Organization,
            },
            roleId,
          },
        },
      });

      toast.success(t('notifications.updateRoleSuccess'));
      return result.data?.updateOrganizationMember;
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error(t('notifications.updateRoleError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRemoveMember = async (userId: string, organizationId: string) => {
    try {
      const result = await removeOrganizationMember({
        variables: {
          userId,
          input: {
            scope: {
              id: organizationId,
              tenant: Tenant.Organization,
            },
          },
        },
      });

      toast.success(t('notifications.removeMemberSuccess'));
      return result.data?.removeOrganizationMember;
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(t('notifications.removeMemberError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleResendInvitation = async (input: InviteMemberInput) => {
    try {
      // Resending an invitation is the same as inviting - backend should handle creating new or updating existing
      const result = await inviteMember({
        variables: { input },
      });

      toast.success(t('notifications.resendInvitationSuccess'));
      return result.data?.inviteMember;
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error(t('notifications.resendInvitationError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleResendInvitationEmail = async (
    id: string,
    organizationId: string
  ): Promise<OrganizationInvitation | undefined> => {
    try {
      const result = await resendInvitationEmail({
        variables: {
          id,
          scope: {
            id: organizationId,
            tenant: Tenant.Organization,
          },
        },
      });

      toast.success(t('notifications.resendEmailSuccess'));
      return result.data?.resendInvitationEmail;
    } catch (error) {
      console.error('Error resending invitation email:', error);
      toast.error(t('notifications.resendEmailError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRenewInvitation = async (
    id: string,
    organizationId: string
  ): Promise<OrganizationInvitation | undefined> => {
    try {
      const result = await renewInvitation({
        variables: {
          id,
          scope: {
            id: organizationId,
            tenant: Tenant.Organization,
          },
        },
      });

      toast.success(t('notifications.renewInvitationSuccess'));
      return result.data?.renewInvitation;
    } catch (error) {
      console.error('Error renewing invitation:', error);
      toast.error(t('notifications.renewInvitationError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    inviteMember: handleInviteMember,
    acceptInvitation: handleAcceptInvitation,
    revokeInvitation: handleRevokeInvitation,
    updateMemberRole: handleUpdateMemberRole,
    removeMember: handleRemoveMember,
    resendInvitation: handleResendInvitation,
    resendInvitationEmail: handleResendInvitationEmail,
    renewInvitation: handleRenewInvitation,
  };
}
