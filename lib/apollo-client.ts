'use client';

import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { getStoredToken, isTokenValid } from './auth';

const authLink = setContext((_, { headers }) => {
  try {
    const token = getStoredToken();

    if (token && !isTokenValid(token)) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        console.warn('⚠️ Invalid/expired token removed from localStorage');
      }
      return { headers };
    }

    if (process.env.NODE_ENV === 'development') {
      if (token) {
        console.log('🔐 Valid auth token found, including in request headers');
      } else {
        console.log('🔓 No auth token found, proceeding without authorization');
      }
    }

    return {
      headers: {
        ...headers,
        ...(token && { authorization: `Bearer ${token}` }),
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
    cache: new InMemoryCache(),
    link: from([authLink, httpLink]),
  });
}
