import { useQuery } from '@apollo/client/react';
import { GetInvitationDocument, OrganizationInvitation } from '@grantjs/schema';

interface UseInvitationParams {
  token: string;
}

interface UseInvitationResult {
  invitation: OrganizationInvitation | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch organization invitation by token
 */
export function useInvitation({ token }: UseInvitationParams): UseInvitationResult {
  const skip = !token;

  const { data, loading, error, refetch } = useQuery<{
    invitation: OrganizationInvitation | null;
  }>(GetInvitationDocument, {
    variables: { token },
    skip,
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  return {
    invitation: data?.invitation ?? null,
    loading,
    error: error as Error | undefined,
    refetch: async () => {
      await refetch();
    },
  };
}
