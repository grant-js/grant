import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  GetOrganizationMembersDocument,
  MemberType,
  OrganizationInvitationStatus,
  OrganizationMember,
  OrganizationMemberPage,
  OrganizationMemberSortableField,
  QueryOrganizationMembersArgs,
  Role,
  SortOrder,
  User,
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
  createdAt: Date;
  updatedAt: Date;
  user?: User | null;
  role?: Role | null;
  inviter?: User | null;
  invitationToken?: string;
}

interface UseMembersParams {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  sort?: {
    field: OrganizationMemberSortableField;
    order: SortOrder;
  };
}

interface UseMembersResult {
  members: MemberWithInvitation[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryOrganizationMembersArgs>
  ) => Promise<ApolloClient.QueryResult<{ organizationMembers: OrganizationMemberPage }>>;
}

/**
 * Hook to fetch organization members (unified users and invitations)
 */
export function useMembers({
  organizationId,
  page,
  limit,
  search,
  sort,
}: UseMembersParams): UseMembersResult {
  const skip = useMemo(() => !organizationId, [organizationId]);

  const variables = useMemo(
    () => ({
      organizationId,
      page,
      limit,
      search,
      sort: sort
        ? {
            field: sort.field,
            order: sort.order,
          }
        : undefined,
      status: OrganizationInvitationStatus.Pending, // Default to pending invitations
    }),
    [organizationId, page, limit, search, sort]
  );

  const { data, loading, error, refetch } = useQuery<{
    organizationMembers: OrganizationMemberPage;
  }>(GetOrganizationMembersDocument, {
    variables: variables as QueryOrganizationMembersArgs,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  // Transform OrganizationMember to MemberWithInvitation format
  const members = useMemo(() => {
    return (
      data?.organizationMembers?.members?.map((member: OrganizationMember) => ({
        id: member.id,
        name: member.name,
        email: member.email || undefined,
        type: member.type === MemberType.Member ? ('member' as const) : ('invitation' as const),
        status: member.status || undefined,
        roleId: member.role?.id || undefined,
        invitedAt:
          member.type === MemberType.Invitation && member.invitation?.createdAt
            ? new Date(member.invitation.createdAt)
            : undefined,
        expiresAt:
          member.type === MemberType.Invitation && member.invitation?.expiresAt
            ? new Date(member.invitation.expiresAt)
            : undefined,
        createdAt: new Date(member.createdAt),
        updatedAt: new Date(member.createdAt), // Use createdAt as fallback since OrganizationMember doesn't have updatedAt
        user: member.user || undefined,
        role: member.role || undefined,
        inviter: member.invitation?.inviter || undefined,
        invitationToken: (member.invitation as { token?: string })?.token || undefined,
      })) ?? []
    );
  }, [data]);

  const totalCount = data?.organizationMembers?.totalCount ?? 0;

  return {
    members,
    loading,
    error,
    totalCount,
    refetch,
  };
}
