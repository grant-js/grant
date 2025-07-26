import { ApolloCache } from '@apollo/client';

export function evictRolesCache(cache: ApolloCache<any>) {
  // Invalidate all role queries to force a refetch
  cache.evict({ fieldName: 'roles' });

  // Also evict any specific role queries that might be cached
  cache.evict({ fieldName: 'role' });

  // More aggressive approach: evict all queries that contain 'roles' in their field name
  // This catches any query variations with different variables
  const cacheIds = cache.extract();
  Object.keys(cacheIds).forEach((id) => {
    if (id.includes('GetRoles') || id.includes('roles')) {
      cache.evict({ id });
    }
  });

  // Force garbage collection to clean up any dangling references
  cache.gc();
}
