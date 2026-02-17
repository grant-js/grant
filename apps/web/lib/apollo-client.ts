'use client';

import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { DEFAULT_LOCALE, isSupportedLocale } from '@grantjs/i18n';
import { LogoutMyUserDocument } from '@grantjs/schema';
import { GraphQLError } from 'graphql';
import { toast } from 'sonner';

import { getTempClient } from '@/lib/apollo-temp-client';
import { getApiBaseUrl } from '@/lib/constants';
import { refreshSessionViaCookie } from '@/lib/refresh-session';
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

/** Prevents multiple concurrent clear-session flows from 401s. */
let clearingSession = false;

/** Optional getter for localized session-expired toast messages (set by ApolloProvider). */
let getSessionExpiredMessages: (() => { title: string; description: string }) | null = null;

export function setSessionExpiredMessages(
  getter: (() => { title: string; description: string }) | null
): void {
  getSessionExpiredMessages = getter;
}

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
      extensions?.translationKey === 'errors.auth.invalidSession' ||
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
          extensions.translationKey === 'errors.auth.invalidSession' ||
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

export async function logoutSession(): Promise<void> {
  try {
    await getTempClient().mutate({ mutation: LogoutMyUserDocument });
  } catch {
    // Best effort; redirect anyway
  }
}

async function clearSessionAndAuth(showToast = false) {
  if (clearingSession || typeof window === 'undefined') return;
  clearingSession = true;
  try {
    await logoutSession();
    useAuthStore.getState().clearAuth();
    if (showToast) {
      const messages = getSessionExpiredMessages?.() ?? {
        title: 'Session Expired',
        description: 'Your session has expired or been revoked. Redirecting to login...',
      };
      toast.error(messages.title, {
        description: messages.description,
        duration: 2000,
      });
    }
  } finally {
    clearingSession = false;
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

function createTokenRefreshObservable(
  operation: Parameters<ErrorLink.ErrorHandler>[0]['operation'],
  forward: Parameters<ErrorLink.ErrorHandler>[0]['forward']
): Observable<ApolloLink.Result> {
  return new Observable<ApolloLink.Result>((observer) => {
    let innerSubscription: { unsubscribe: () => void } | null = null;
    refreshSessionViaCookie()
      .then((ok) => {
        if (clearingSession) {
          observer.complete();
          return;
        }
        if (!ok) {
          void clearSessionAndAuth(true);
          observer.complete();
          return;
        }
        const newToken = useAuthStore.getState().accessToken;
        operation.setContext({
          headers: {
            ...operation.getContext().headers,
            authorization: `Bearer ${newToken}`,
          },
          fetchPolicy: 'network-only',
        });
        innerSubscription = forward(operation).subscribe(observer);
      })
      .catch((refreshError: unknown) => {
        if (clearingSession) {
          observer.complete();
          return;
        }
        const statusCode = (refreshError as { statusCode?: number }).statusCode;
        const isInvalidSession = statusCode === 401 || isInvalidSessionError(refreshError);
        void clearSessionAndAuth(isInvalidSession);
        observer.complete();
      });
    return () => innerSubscription?.unsubscribe();
  });
}

function handleUnauthorizedError(
  operation: Parameters<ErrorLink.ErrorHandler>[0]['operation'],
  forward: Parameters<ErrorLink.ErrorHandler>[0]['forward'],
  _error?: unknown
): Observable<ApolloLink.Result> | null {
  if (clearingSession) return null;
  return createTokenRefreshObservable(operation, forward);
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
  if (clearingSession) return forward(operation);

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

export interface ApolloClientOptions {
  getSessionExpiredMessages?: () => { title: string; description: string };
}

export function getClient(options?: ApolloClientOptions) {
  if (options?.getSessionExpiredMessages) {
    setSessionExpiredMessages(options.getSessionExpiredMessages);
  }
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
