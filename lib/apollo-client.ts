'use client';

import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { getStoredAccessToken, isTokenValid } from './auth';

const authLink = setContext((_, { headers }) => {
  try {
    const accessToken = getStoredAccessToken();

    if (accessToken && !isTokenValid(accessToken)) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        console.warn('⚠️ Invalid/expired token removed from localStorage');
      }
      return { headers };
    }

    if (process.env.NODE_ENV === 'development') {
      if (accessToken) {
        console.log('🔐 Valid auth token found, including in request headers');
      } else {
        console.log('🔓 No auth token found, proceeding without authorization');
      }
    }

    return {
      headers: {
        ...headers,
        ...(accessToken && { authorization: `Bearer ${accessToken}` }),
      },
    };
  } catch (error) {
    console.error('❌ Error in auth link:', error);
    return { headers };
  }
});

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
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
    link: from([authLink, httpLink]),
  });
}
