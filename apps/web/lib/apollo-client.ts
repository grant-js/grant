'use client';

import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { DEFAULT_LOCALE, isSupportedLocale } from '@grantjs/constants';
import { RefreshSessionDocument } from '@grantjs/schema';
import { GraphQLError } from 'graphql';
import { toast } from 'sonner';

import { removeStoredTokens } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

interface ErrorWithGraphQLErrors {
  graphQLErrors?: readonly GraphQLError[];
  networkError?: unknown;
}

interface NetworkErrorWithStatus {
  statusCode?: number;
  response?: { status?: number };
  extensions?: { http?: { status?: number } };
}

interface WindowWithGrantFlag extends Window {
  __grantRedirectInProgress?: boolean;
}

const AUTH_OPERATIONS = [
  'Login',
  'Register',
  'ResetPassword',
  'RequestPasswordReset',
  'VerifyEmail',
  'ResendVerification',
] as const;

const SKIP_ERROR_REDIRECT_OPERATIONS = [
  'Login',
  'Register',
  'ResetPassword',
  'RequestPasswordReset',
  'VerifyEmail',
  'ResendVerification',
  'RefreshSession',
] as const;

let refreshPromise: Promise<void> | null = null;
let refreshInProgress = false;
let redirectInProgress = false;

function getGraphQLUrl(): string {
  return `${getApiBaseUrl()}/graphql`;
}

function getCurrentLocale(): string {
  if (typeof window !== 'undefined') {
    const pathSegments = window.location.pathname.split('/');
    const locale = pathSegments[1];
    return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  }
  return DEFAULT_LOCALE;
}

function hasGraphQLErrors(error: unknown): error is ErrorWithGraphQLErrors {
  return typeof error === 'object' && error !== null && 'graphQLErrors' in error;
}

function isNetworkErrorWithStatus(error: unknown): error is NetworkErrorWithStatus {
  return typeof error === 'object' && error !== null;
}

function isAuthOperation(operationName: string | undefined): boolean {
  if (!operationName) return false;
  return AUTH_OPERATIONS.includes(operationName as (typeof AUTH_OPERATIONS)[number]);
}

function extractGraphQLErrors(error: unknown): GraphQLError[] {
  const errorWithGQLErrors = hasGraphQLErrors(error) ? error : null;
  const graphQLErrors = errorWithGQLErrors?.graphQLErrors || [];

  if (graphQLErrors.length > 0) {
    return Array.from(graphQLErrors);
  }

  if (error && typeof error === 'object') {
    const apolloError = error as unknown as Record<string, unknown>;

    if (
      'graphQLErrors' in apolloError &&
      Array.isArray(apolloError.graphQLErrors) &&
      apolloError.graphQLErrors.every((e) => e instanceof GraphQLError)
    ) {
      return apolloError.graphQLErrors as GraphQLError[];
    }

    if ('errors' in apolloError && Array.isArray(apolloError.errors)) {
      return apolloError.errors
        .map((e) => {
          if (e instanceof GraphQLError) {
            return e;
          }
          if (typeof e === 'object' && e !== null) {
            const errorObj = e as Record<string, unknown>;
            const message = (errorObj.message as string) || 'Unknown error';
            const extensions = errorObj.extensions as Record<string, unknown> | undefined;
            return new GraphQLError(message, {
              extensions,
              originalError: errorObj.originalError as Error | undefined,
            });
          }
          return null;
        })
        .filter((e): e is GraphQLError => e !== null);
    }

    if (error instanceof GraphQLError) {
      return [error];
    }
  }

  return [];
}

function isUnauthorizedGraphQLError(error: GraphQLError): boolean {
  const extensions = error.extensions as
    | { http?: { status?: number }; statusCode?: number; code?: string }
    | undefined;
  return (
    extensions?.http?.status === 401 ||
    extensions?.statusCode === 401 ||
    extensions?.code === 'UNAUTHENTICATED'
  );
}

function isNotFoundGraphQLError(error: GraphQLError): boolean {
  const extensions = error.extensions as
    | { http?: { status?: number }; statusCode?: number; code?: string }
    | undefined;
  return (
    extensions?.http?.status === 404 ||
    extensions?.statusCode === 404 ||
    extensions?.code === 'NOT_FOUND'
  );
}

function isForbiddenGraphQLError(error: GraphQLError): boolean {
  const extensions = error.extensions as
    | { http?: { status?: number }; statusCode?: number; code?: string }
    | undefined;
  return (
    extensions?.http?.status === 403 ||
    extensions?.statusCode === 403 ||
    extensions?.code === 'FORBIDDEN'
  );
}

function isUnauthorizedNetworkError(error: unknown): boolean {
  if (!isNetworkErrorWithStatus(error)) {
    return false;
  }
  return (
    error.statusCode === 401 ||
    error.extensions?.http?.status === 401 ||
    error.response?.status === 401
  );
}

function isUnauthorizedError(
  error: unknown,
  graphQLErrors: GraphQLError[],
  networkError: unknown
): boolean {
  const hasUnauthorizedGraphQLError = graphQLErrors.some(isUnauthorizedGraphQLError);
  const hasUnauthorizedNetworkError = isUnauthorizedNetworkError(networkError);
  const hasDirectStatusCode = isNetworkErrorWithStatus(error) && error.statusCode === 401;

  const errorExtensions = isNetworkErrorWithStatus(error) ? error.extensions : undefined;
  const hasDirectExtensionsStatus = errorExtensions?.http?.status === 401;

  return (
    hasUnauthorizedGraphQLError ||
    hasUnauthorizedNetworkError ||
    hasDirectStatusCode ||
    hasDirectExtensionsStatus
  );
}

function isInvalidSessionError(error: unknown): boolean {
  const graphQLErrors = extractGraphQLErrors(error);

  const hasInvalidSession = graphQLErrors.some((err) => {
    const extensions = err.extensions as { translationKey?: string; code?: string } | undefined;
    return (
      extensions?.translationKey === 'errors:auth.invalidSession' ||
      extensions?.code === 'UNAUTHENTICATED'
    );
  });

  if (hasInvalidSession) {
    return true;
  }

  if (error && typeof error === 'object') {
    const apolloError = error as Record<string, unknown>;

    if ('graphQLErrors' in apolloError && Array.isArray(apolloError.graphQLErrors)) {
      const errors = apolloError.graphQLErrors as Array<Record<string, unknown>>;
      for (const err of errors) {
        const extensions =
          (err.extensions as { translationKey?: string; code?: string } | undefined) || {};
        if (
          extensions.translationKey === 'errors:auth.invalidSession' ||
          extensions.code === 'UNAUTHENTICATED'
        ) {
          return true;
        }
      }
    }

    if ('networkError' in apolloError && apolloError.networkError) {
      const networkError = apolloError.networkError as Record<string, unknown>;
      if (
        networkError.statusCode === 401 ||
        (networkError.response && (networkError.response as { status?: number }).status === 401)
      ) {
        return true;
      }
    }
  }

  return false;
}

function redirectToLogin(showToast = false) {
  if (redirectInProgress) {
    return;
  }

  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const locale = currentPath.split('/')[1] || DEFAULT_LOCALE;

    if (currentPath.includes('/auth/login')) {
      redirectInProgress = false;
      return;
    }

    redirectInProgress = true;

    if (typeof window !== 'undefined') {
      (window as WindowWithGrantFlag).__grantRedirectInProgress = true;
    }

    try {
      removeStoredTokens();

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('grant-auth-store');
      }
    } catch {
      void 0;
    }

    if (showToast) {
      try {
        toast.error('Session Expired', {
          description: 'Your session has expired or been revoked. Redirecting to login...',
          duration: 2000,
        });
      } catch {
        void 0;
      }
    }

    setTimeout(
      () => {
        if (typeof window !== 'undefined' && redirectInProgress) {
          window.location.replace(`/${locale}/auth/login`);
        }
      },
      showToast ? 1500 : 0
    );
  }
}

function redirectToNotFound() {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const locale = currentPath.split('/')[1] || DEFAULT_LOCALE;
    window.location.href = `/${locale}/not-found`;
  }
}

function redirectToForbidden() {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const locale = currentPath.split('/')[1] || DEFAULT_LOCALE;
    window.location.href = `/${locale}/forbidden`;
  }
}

function shouldSkipErrorRedirect(operationName: string | undefined): boolean {
  if (!operationName) return false;
  return SKIP_ERROR_REDIRECT_OPERATIONS.includes(
    operationName as (typeof SKIP_ERROR_REDIRECT_OPERATIONS)[number]
  );
}

const refreshSession = async (accessToken: string, refreshToken: string) => {
  try {
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
    refreshPromise = null;
    refreshInProgress = false;
    throw refreshError;
  }
};

function createTokenRefreshObservable(
  operation: Parameters<ErrorLink.ErrorHandler>[0]['operation'],
  forward: Parameters<ErrorLink.ErrorHandler>[0]['forward']
): Observable<ApolloLink.Result> {
  const { accessToken, refreshToken } = useAuthStore.getState();

  return new Observable<ApolloLink.Result>((observer) => {
    if (!refreshInProgress) {
      refreshInProgress = true;
      refreshPromise = refreshSession(accessToken!, refreshToken!);
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
        if (redirectInProgress) {
          observer.complete();
          return;
        }

        refreshPromise = null;
        refreshInProgress = false;

        const isInvalidSession = isInvalidSessionError(refreshError);
        redirectToLogin(isInvalidSession);

        observer.complete();
      });
  });
}

function handleUnauthorizedError(
  operation: Parameters<ErrorLink.ErrorHandler>[0]['operation'],
  forward: Parameters<ErrorLink.ErrorHandler>[0]['forward'],
  error?: unknown
): Observable<ApolloLink.Result> | null {
  if (redirectInProgress) {
    return null;
  }

  const { accessToken, refreshToken } = useAuthStore.getState();

  if (accessToken && refreshToken) {
    return createTokenRefreshObservable(operation, forward);
  }

  const isInvalidSession = error ? isInvalidSessionError(error) : false;
  redirectToLogin(isInvalidSession);
  return null;
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
  } catch {
    return { headers: prevContext.headers };
  }
});

const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (redirectInProgress) {
    return forward(operation);
  }

  if (operation.operationName === 'RefreshSession') {
    return forward(operation);
  }

  const graphQLErrors = extractGraphQLErrors(error);
  const errorWithGQLErrors = hasGraphQLErrors(error) ? error : null;
  const networkError = errorWithGQLErrors?.networkError;

  const isUnauthorized = isUnauthorizedError(error, graphQLErrors, networkError);

  if (isUnauthorized && !isAuthOperation(operation.operationName)) {
    const refreshObservable = handleUnauthorizedError(operation, forward, error);
    if (refreshObservable) {
      return refreshObservable;
    }
  }

  if (!shouldSkipErrorRedirect(operation.operationName)) {
    const hasNotFoundError = graphQLErrors.some(isNotFoundGraphQLError);
    if (hasNotFoundError) {
      redirectToNotFound();
      return;
    }

    const hasForbiddenError = graphQLErrors.some(isForbiddenGraphQLError);
    if (hasForbiddenError) {
      redirectToForbidden();
      return;
    }
  }

  return forward(operation);
});

const httpLink = new HttpLink({
  uri: getGraphQLUrl(),
  credentials: 'include',
});

export function getClient() {
  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
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
        Query: {
          fields: {
            roles: {
              keyArgs: ['scope', 'ids'],
            },
            groups: {
              keyArgs: ['scope', 'ids'],
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
            resources: {
              keyArgs: ['scope', 'ids'],
            },
          },
        },
      },
    }),
    link: ApolloLink.from([authLink, errorLink, httpLink]),
  });
}
