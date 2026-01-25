export { extractScopeFromRequest } from './scope-extractor';
export {
  authenticateRestRoute,
  authenticateGraphQLResolver,
  isAuthenticatedRest,
  isAuthenticatedGraphQL,
} from './auth-guard';
export { authorizeRestRoute, type RestGuardOptions } from './rest-guard';
export { authorizeGraphQLResolver, type GraphQLGuardOptions } from './graphql-guard';
export type { ResourceResolver, ResourceResolverParams, ResourceResolverResult } from './types';
