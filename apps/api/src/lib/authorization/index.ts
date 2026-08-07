export { authenticateGraphQLResolver, authenticateRestRoute } from './auth-guard';
export { requireEmailThenMfaGraphQL, requireEmailThenMfaRest } from './email-then-mfa-compose';
export { type EmailVerificationGraphQLGuardOptions } from './email-verification-graphql-guard';
export { authorizeGraphQLResolver } from './graphql-guard';
export { type MfaGraphQLGuardOptions } from './mfa-graphql-guard';
export { authorizeRestRoute } from './rest-guard';
export { extractScopeFromResolverRequest } from './scope-extractor';
export type { ResourceResolver, ResourceResolverParams } from './types';
