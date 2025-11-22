import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  GetUserSessionsDocument,
  GetUserSessionsInput,
  UserSession,
  UserSessionPage,
} from '@logusgraphics/grant-schema';

interface UseUserSessionsResult {
  sessions: UserSession[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  hasNextPage: boolean;
  refetch: (
    variables?: Partial<GetUserSessionsInput>
  ) => Promise<ApolloClient.QueryResult<{ userSessions: UserSessionPage }>>;
}

export function useUserSessions(
  userId: string,
  options?: {
    audience?: string;
    page?: number;
    limit?: number;
  }
): UseUserSessionsResult {
  const skip = useMemo(() => !userId, [userId]);

  const variables = useMemo(
    () => ({
      input: {
        userId,
        audience: options?.audience,
        page: options?.page,
        limit: options?.limit,
      },
    }),
    [userId, options?.audience, options?.page, options?.limit]
  );

  const { data, loading, error, refetch } = useQuery<{ userSessions: UserSessionPage }>(
    GetUserSessionsDocument,
    {
      variables,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const { sessions, totalCount, hasNextPage } = useMemo(
    () => ({
      sessions: data?.userSessions?.userSessions ?? [],
      totalCount: data?.userSessions?.totalCount ?? 0,
      hasNextPage: data?.userSessions?.hasNextPage ?? false,
    }),
    [data]
  );

  return {
    sessions,
    loading,
    error,
    totalCount,
    hasNextPage,
    refetch: async (newVariables?: Partial<GetUserSessionsInput>) => {
      return refetch({
        input: {
          userId,
          audience: options?.audience,
          page: options?.page,
          limit: options?.limit,
          ...newVariables,
        },
      });
    },
  };
}
