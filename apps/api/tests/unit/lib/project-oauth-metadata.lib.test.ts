import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    app: { url: 'https://api.example.com' },
  },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

import { buildProjectOAuthMetadata } from '@/lib/project-oauth-metadata.lib';

describe('buildProjectOAuthMetadata', () => {
  it('uses shared authorize/token URLs and per-project issuer/jwks', () => {
    const metadata = buildProjectOAuthMetadata({
      tenant: Tenant.OrganizationProject,
      id: 'org-1:prj-1',
    });

    expect(metadata.issuer).toBe('https://api.example.com/org/org-1/prj/prj-1');
    expect(metadata.jwks_uri).toBe(
      'https://api.example.com/org/org-1/prj/prj-1/.well-known/jwks.json'
    );
    expect(metadata.authorization_endpoint).toBe(
      'https://api.example.com/api/auth/project/authorize'
    );
    expect(metadata.token_endpoint).toBe('https://api.example.com/api/auth/project/token');
    expect(metadata.response_types_supported).toEqual(['code']);
    expect(metadata.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
    expect(metadata.code_challenge_methods_supported).toEqual(['S256']);
    expect(metadata).not.toHaveProperty('userinfo_endpoint');
    expect(metadata).not.toHaveProperty('id_token_signing_alg_values_supported');
  });

  it('builds the same document for an account project issuer', () => {
    const metadata = buildProjectOAuthMetadata({
      tenant: Tenant.AccountProject,
      id: 'acc-1:prj-2',
    });
    expect(metadata.issuer).toBe('https://api.example.com/acc/acc-1/prj/prj-2');
    expect(metadata.jwks_uri).toBe(
      'https://api.example.com/acc/acc-1/prj/prj-2/.well-known/jwks.json'
    );
  });
});
