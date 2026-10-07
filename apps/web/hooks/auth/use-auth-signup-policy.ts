import { useQuery } from '@apollo/client/react';
import { AuthSignupPolicyDocument, AuthSignupPolicyQuery } from '@grantjs/schema';

export function useAuthSignupPolicy(): {
  publicSignupEnabled: boolean;
  bootstrapOpen: boolean;
  loading: boolean;
} {
  const { data, loading } = useQuery<AuthSignupPolicyQuery>(AuthSignupPolicyDocument, {
    fetchPolicy: 'network-only',
    errorPolicy: 'ignore',
  });

  return {
    publicSignupEnabled: data?.authSignupPolicy.publicSignupEnabled ?? false,
    bootstrapOpen: data?.authSignupPolicy.bootstrapOpen ?? false,
    loading,
  };
}
