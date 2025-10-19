import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  AcceptInvitationDocument,
  AcceptInvitationInput,
  AcceptInvitationResult,
  InviteMemberDocument,
  InviteMemberInput,
  OrganizationInvitation,
  RevokeInvitationDocument,
} from '@logusgraphics/grant-schema';
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

  const handleRevokeInvitation = async (id: string, email: string) => {
    try {
      const result = await revokeInvitation({
        variables: { id },
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

  return {
    inviteMember: handleInviteMember,
    acceptInvitation: handleAcceptInvitation,
    revokeInvitation: handleRevokeInvitation,
  };
}
