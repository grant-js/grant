import { ApolloCache } from '@apollo/client';

/**
 * Evict organization invitations cache
 */
export function evictInvitationsCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'organizationInvitations' });
  cache.gc();
}

/**
 * Evict organization members cache
 */
export function evictMembersCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'users' });
  cache.gc();
}

/**
 * Evict both invitations and members cache
 */
export function evictMembersAndInvitationsCache(cache: ApolloCache) {
  evictInvitationsCache(cache);
  evictMembersCache(cache);
}
