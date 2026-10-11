import type { Scope } from '@grantjs/schema';

import { config } from '@/config';
import { buildJwksIssuerUrl } from '@/lib/jwks.lib';

export interface ProjectOAuthAuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  response_types_supported: ['code'];
  response_modes_supported: ['query'];
  grant_types_supported: ['authorization_code', 'refresh_token'];
  code_challenge_methods_supported: ['S256'];
  token_endpoint_auth_methods_supported: ['client_secret_post', 'none'];
}

export function buildProjectOAuthMetadata(
  signingScope: Scope,
  baseUrl?: string
): ProjectOAuthAuthorizationServerMetadata {
  const base = (baseUrl ?? config.app.url).replace(/\/$/, '');
  const issuer = buildJwksIssuerUrl(signingScope, base);
  return {
    issuer,
    authorization_endpoint: `${base}/api/auth/project/authorize`,
    token_endpoint: `${base}/api/auth/project/token`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
  };
}
