import { ApolloCache } from '@apollo/client';

/**
 * Evict organization invitations cache
 */
function evictInvitationsCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'organizationInvitations' });
  cache.gc();
}

/**
 * Evict organization members cache
 */
function evictMembersCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'organizationMembers' });
  cache.gc();
}

/**
 * Evict both invitations and members cache
 */
export function evictMembersAndInvitationsCache(cache: ApolloCache) {
  evictInvitationsCache(cache);
  evictMembersCache(cache);
}
