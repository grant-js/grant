import { Tenant } from '@grantjs/schema';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

const orgId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';

const { mockConfig, mockBuild } = vi.hoisted(() => ({
  mockConfig: {
    app: { url: 'https://api.example.com' },
    jwt: { jwksMaxAgeSeconds: 300 },
  },
  mockBuild: vi.fn(),
}));

vi.mock('@/config', () => ({ config: mockConfig }));
vi.mock('@/lib/project-oauth-metadata.lib', () => ({
  buildProjectOAuthMetadata: mockBuild,
}));

import { createProjectOAuthMetadataRouter } from '@/rest/routes/project-oauth-metadata.routes';

describe('project OAuth metadata routes', () => {
  const app = express();
  app.use(createProjectOAuthMetadataRouter());

  const document = {
    issuer: `https://api.example.com/org/${orgId}/prj/${projectId}`,
    authorization_endpoint: 'https://api.example.com/api/auth/project/authorize',
    token_endpoint: 'https://api.example.com/api/auth/project/token',
    jwks_uri: `https://api.example.com/org/${orgId}/prj/${projectId}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
  };

  it('serves RFC 8414 and the OpenID twin as the same JSON', async () => {
    mockBuild.mockReturnValue(document);

    const rfc = await request(app).get(
      `/.well-known/oauth-authorization-server/org/${orgId}/prj/${projectId}`
    );
    const oidc = await request(app).get(
      `/org/${orgId}/prj/${projectId}/.well-known/openid-configuration`
    );

    expect(rfc.status).toBe(200);
    expect(oidc.status).toBe(200);
    expect(rfc.body).toEqual(document);
    expect(oidc.body).toEqual(rfc.body);
    expect(mockBuild).toHaveBeenCalledWith({
      tenant: Tenant.OrganizationProject,
      id: `${orgId}:${projectId}`,
    });
  });

  it('returns 404 for invalid UUIDs', async () => {
    const res = await request(app).get(
      '/.well-known/oauth-authorization-server/org/not-a-uuid/prj/also-bad'
    );
    expect(res.status).toBe(404);
  });
});
