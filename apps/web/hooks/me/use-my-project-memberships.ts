'use client';

import { useQuery } from '@apollo/client/react';
import {
  MyProjectMembership,
  MyProjectMembershipDocument,
  MyProjectMembershipsDocument,
} from '@grantjs/schema';

export function useMyProjectMemberships() {
  const { data, loading, error, refetch } = useQuery<{
    myProjectMemberships: MyProjectMembership[];
  }>(MyProjectMembershipsDocument, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    memberships: data?.myProjectMemberships ?? [],
    loading,
    error,
    refetch,
  };
}

export function useMyProjectMembership(projectId: string | null | undefined) {
  const { data, loading, error, refetch } = useQuery<{
    myProjectMembership: MyProjectMembership | null;
  }>(MyProjectMembershipDocument, {
    variables: { projectId },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });

  return {
    membership: data?.myProjectMembership ?? null,
    loading,
    error,
    refetch,
  };
}
