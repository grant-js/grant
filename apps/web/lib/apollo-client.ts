'use client';

import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { DEFAULT_LOCALE, isSupportedLocale } from '@logusgraphics/grant-constants';
import { GraphQLError } from 'graphql';

import { useAuthStore } from '@/stores/auth.store';

let refreshPromise: Promise<void> | null = null;
let refreshInProgress = false;

/**
 * Get the GraphQL endpoint URL
 * Uses environment variable with fallback to localhost
 */
function getGraphQLUrl(): string {
  return process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
}

/**
 * Helper to get current locale from the URL
 * @returns Current locale (en or de)
 */
function getCurrentLocale(): string {
  if (typeof window !== 'undefined') {
    const pathSegments = window.location.pathname.split('/');
    const locale = pathSegments[1];
    // Validate locale is supported
    return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  }
  return DEFAULT_LOCALE;
}

const authLink = new SetContextLink((prevContext, _operation) => {
  try {
    const accessToken = useAuthStore.getState().accessToken;
    const locale = getCurrentLocale();

    return {
      headers: {
        ...prevContext.headers,
        ...(accessToken && { authorization: `Bearer ${accessToken}` }),
        'accept-language': locale,
      },
    };
  } catch (error) {
    console.error('Error in auth link:', error);
    return { headers: prevContext.headers };
  }
});

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    useAuthStore.getState().clearAuth();
    const currentPath = window.location.pathname;
    const locale = currentPath.split('/')[1] || DEFAULT_LOCALE;
    window.location.href = `/${locale}/auth/login`;
  }
};

// Type guard for error with GraphQL errors
interface ErrorWithGraphQLErrors {
  graphQLErrors?: readonly GraphQLError[];
  networkError?: unknown;
}

function hasGraphQLErrors(error: unknown): error is ErrorWithGraphQLErrors {
  return typeof error === 'object' && error !== null && 'graphQLErrors' in error;
}

// Type guard for network error with status
interface NetworkErrorWithStatus {
  statusCode?: number;
  response?: { status?: number };
  extensions?: { http?: { status?: number } };
}

function isNetworkErrorWithStatus(error: unknown): error is NetworkErrorWithStatus {
  return typeof error === 'object' && error !== null;
}

const errorLink = new ErrorLink(({ error, operation, forward }) => {
  // Extract GraphQL errors and network error from Apollo error structure
  const errorWithGQLErrors = hasGraphQLErrors(error) ? error : null;
  const graphQLErrors = errorWithGQLErrors?.graphQLErrors || [];
  const networkError = errorWithGQLErrors?.networkError;

  // Check GraphQL errors first (from the errors array in GraphQL response)
  const hasUnauthorizedGraphQLError = graphQLErrors.some((gqlError: GraphQLError) => {
    const extensions = gqlError.extensions as
      | { http?: { status?: number }; statusCode?: number }
      | undefined;
    return extensions?.http?.status === 401 || extensions?.statusCode === 401;
  });

  // Check network error (from HTTP layer)
  const hasUnauthorizedNetworkError =
    isNetworkErrorWithStatus(networkError) &&
    (networkError.statusCode === 401 ||
      networkError.extensions?.http?.status === 401 ||
      networkError.response?.status === 401);

  // Check if the error itself has statusCode (legacy check)
  const hasDirectStatusCode = isNetworkErrorWithStatus(error) && error.statusCode === 401;

  // Check if the error itself has extensions.http.status
  const errorExtensions = isNetworkErrorWithStatus(error) ? error.extensions : undefined;
  const hasDirectExtensionsStatus = errorExtensions?.http?.status === 401;

  const isUnauthorized =
    hasUnauthorizedGraphQLError ||
    hasUnauthorizedNetworkError ||
    hasDirectStatusCode ||
    hasDirectExtensionsStatus;

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

    const graphqlUrl = getGraphQLUrl();

    const tempClient = new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: graphqlUrl,
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
  uri: getGraphQLUrl(),
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
    link: ApolloLink.from([authLink, errorLink, httpLink]),
  });
}
