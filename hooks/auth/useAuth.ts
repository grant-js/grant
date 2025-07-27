import { useQuery, ApolloError } from '@apollo/client';
import { gql } from '@apollo/client';
import { User } from '@/graphql/generated/types';

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
      id
      name
      email
      roles {
        id
        name
      }
    }
  }
`;

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: ApolloError | undefined;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthResult {
  const { data, loading, error } = useQuery(GET_CURRENT_USER, {
    errorPolicy: 'all',
  });

  return {
    user: data?.currentUser || null,
    loading,
    error,
    isAuthenticated: !!data?.currentUser,
  };
}
