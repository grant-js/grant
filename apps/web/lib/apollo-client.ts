'use client';

import { ApolloClient, from, HttpLink, InMemoryCache, Observable } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

import { useAuthStore } from '@/stores/auth.store';

let refreshPromise: Promise<void> | null = null;
let refreshInProgress = false;

const authLink = setContext((_, { headers }) => {
  try {
    const accessToken = useAuthStore.getState().accessToken;

    return {
      headers: {
        ...headers,
        ...(accessToken && { authorization: `Bearer ${accessToken}` }),
      },
    };
  } catch (error) {
    console.error('Error in auth link:', error);
    return { headers };
  }
});

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    useAuthStore.getState().clearAuth();
    const currentPath = window.location.pathname;
    const locale = currentPath.split('/')[1] || 'en';
    window.location.href = `/${locale}/auth/login`;
  }
};

const errorLink = onError(({ error, operation, forward }) => {
  // Check if the error indicates unauthorized access
  const isUnauthorized =
    (error && 'statusCode' in error && error.statusCode === 401) ||
    (error &&
      'extensions' in error &&
      typeof error.extensions === 'object' &&
      error.extensions &&
      'http' in error.extensions &&
      typeof error.extensions.http === 'object' &&
      error.extensions.http &&
      'status' in error.extensions.http &&
      error.extensions.http.status === 401);

  if (isUnauthorized) {
    const { accessToken, refreshToken } = useAuthStore.getState();

    if (accessToken && refreshToken) {
      return new Observable((observer) => {
        if (!refreshInProgress) {
          refreshInProgress = true;
          refreshPromise = refreshSession(accessToken, refreshToken);
        }

        refreshPromise!
          .then(() => {
            const newToken = useAuthStore.getState().accessToken;

            operation.setContext({
              headers: {
                ...operation.getContext().headers,
                authorization: `Bearer ${newToken}`,
              },
              fetchPolicy: 'network-only',
            });

            const retryObservable = forward(operation);
            const subscription = retryObservable.subscribe(observer);

            return () => {
              subscription.unsubscribe();
            };
          })
          .catch((refreshError) => {
            console.error('Token refresh failed:', refreshError);
            refreshPromise = null;
            refreshInProgress = false;
            redirectToLogin();
            observer.error(refreshError);
          });
      });
    } else {
      redirectToLogin();
    }
  }
});

const refreshSession = async (accessToken: string, refreshToken: string) => {
  try {
    const { RefreshSessionDocument } = await import('@logusgraphics/grant-schema');

    const tempClient = new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
        credentials: 'include',
      }),
    });

    const result = await tempClient.mutate({
      mutation: RefreshSessionDocument,
      variables: {
        accessToken,
        refreshToken,
      },
    });

    if (result.data?.refreshSession) {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        result.data.refreshSession;

      useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
    }

    refreshPromise = null;
    refreshInProgress = false;
  } catch (refreshError) {
    console.error('Token refresh failed:', refreshError);
    refreshPromise = null;
    refreshInProgress = false;
    throw refreshError;
  }
};

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
  credentials: 'include',
});

export function getClient() {
  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        // Disable normalization for scoped entities to prevent cache conflicts
        Role: {
          keyFields: false,
        },
        Group: {
          keyFields: false,
        },
        User: {
          keyFields: false,
        },
        Permission: {
          keyFields: false,
        },
        Tag: {
          keyFields: false,
        },
        // For paginated results, use scope-aware cache keys
        Query: {
          fields: {
            roles: {
              keyArgs: ['scope'],
            },
            groups: {
              keyArgs: ['scope'],
            },
            users: {
              keyArgs: ['scope'],
            },
            permissions: {
              keyArgs: ['scope'],
            },
            tags: {
              keyArgs: ['scope'],
            },
          },
        },
      },
    }),
    link: from([authLink, errorLink, httpLink]),
  });
}
