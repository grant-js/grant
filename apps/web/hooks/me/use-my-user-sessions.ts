import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  MyUserSessionsDocument,
  MyUserSessionsInput,
  UserSession,
  UserSessionPage,
} from '@grantjs/schema';

import { useMeStore } from '@/stores/me.store';

interface UseMyUserSessionsResult {
  sessions: UserSession[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  hasNextPage: boolean;
  refetch: () => Promise<ApolloClient.QueryResult<{ myUserSessions: UserSessionPage }>>;
}

export function useMyUserSessions(input?: Partial<MyUserSessionsInput>): UseMyUserSessionsResult {
  const page = useMeStore((state) => state.sessionsPage);
  const limit = useMeStore((state) => state.sessionsLimit);
  const search = useMeStore((state) => state.sessionsSearch);

  const variables = useMemo(
    () => ({
      input: {
        page,
        limit,
        search: search || undefined,
        ...input,
      },
    }),
    [page, limit, search, input]
  );

  const { data, loading, error, refetch } = useQuery<{ myUserSessions: UserSessionPage }>(
    MyUserSessionsDocument,
    {
      variables,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const { sessions, totalCount, hasNextPage } = useMemo(
    () => ({
      sessions: data?.myUserSessions?.userSessions ?? [],
      totalCount: data?.myUserSessions?.totalCount ?? 0,
      hasNextPage: data?.myUserSessions?.hasNextPage ?? false,
    }),
    [data]
  );

  return {
    sessions,
    loading,
    error,
    totalCount,
    hasNextPage,
    refetch: async () => {
      return refetch(variables);
    },
  };
}
