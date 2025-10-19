import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import {
  GetOrganizationInvitationsDocument,
  GetUsersDocument,
  OrganizationInvitationPage,
  OrganizationInvitationStatus,
  QueryOrganizationInvitationsArgs,
  QueryUsersArgs,
  User,
  UserPage,
} from '@logusgraphics/grant-schema';

/**
 * Combined member and invitation data for display
 */
export interface MemberWithInvitation {
  id: string;
  name: string;
  email?: string;
  type: 'member' | 'invitation';
  status?: OrganizationInvitationStatus;
  roleId?: string;
  invitedAt?: Date;
  expiresAt?: Date;
  user?: User;
}

interface UseMembersResult {
  members: MemberWithInvitation[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch organization members (users) and pending invitations
 */
export function useMembers(organizationId: string): UseMembersResult {
  const skip = useMemo(() => !organizationId, [organizationId]);

  // Fetch organization users (existing members)
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<{ users: UserPage }>(GetUsersDocument, {
    variables: {
      scope: {
        tenant: 'organization',
        id: organizationId,
      },
    } as QueryUsersArgs,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  // Fetch pending invitations
  const {
    data: invitationsData,
    loading: invitationsLoading,
    error: invitationsError,
    refetch: refetchInvitations,
  } = useQuery<{ organizationInvitations: OrganizationInvitationPage }>(
    GetOrganizationInvitationsDocument,
    {
      variables: {
        organizationId,
        status: OrganizationInvitationStatus.Pending,
      } as QueryOrganizationInvitationsArgs,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  // Combine members and invitations
  const members = useMemo(() => {
    const userMembers: MemberWithInvitation[] =
      usersData?.users?.users?.map((user) => ({
        id: user.id,
        name: user.name,
        type: 'member' as const,
        user,
      })) ?? [];

    const pendingInvitations: MemberWithInvitation[] =
      invitationsData?.organizationInvitations?.invitations?.map((invitation) => ({
        id: invitation.id,
        name: invitation.email,
        email: invitation.email,
        type: 'invitation' as const,
        status: invitation.status,
        roleId: invitation.roleId,
        invitedAt: invitation.createdAt ? new Date(invitation.createdAt) : undefined,
        expiresAt: invitation.expiresAt ? new Date(invitation.expiresAt) : undefined,
      })) ?? [];

    return [...userMembers, ...pendingInvitations];
  }, [usersData, invitationsData]);

  const totalCount = useMemo(() => {
    const usersCount = usersData?.users?.totalCount ?? 0;
    const invitationsCount = invitationsData?.organizationInvitations?.totalCount ?? 0;
    return usersCount + invitationsCount;
  }, [usersData, invitationsData]);

  const loading = usersLoading || invitationsLoading;
  const error = usersError || invitationsError;

  const refetch = async () => {
    await Promise.all([refetchUsers(), refetchInvitations()]);
  };

  return {
    members,
    loading,
    error,
    totalCount,
    refetch,
  };
}
