/**
 * E2E: Per-project OAuth connections (BYO social) and credential isolation.
 *
 * Design §10 scenarios:
 *   - Platform authorize uses env client even when project stores a different BYO client
 *   - Project authorize uses BYO client_id in Location, not platform env id
 *   - app-info reports google configured for BYO when platform Google env is unset
 *   - Consent approve JWT aud matches ProjectApp client_id
 *
 * Prerequisites: E2E stack with PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY configured.
 */
import {
  CreateProjectAppDocument,
  ProjectOAuthConnectionProvider,
  UpsertProjectOAuthConnectionDocument,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { addProjectUserForE2e, closeDbHelper } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const PLATFORM_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const BYO_GOOGLE_CLIENT_ID = 'e2e-byo-google-client-id-only';
const BYO_GOOGLE_CLIENT_SECRET = 'e2e-byo-google-client-secret-value';
const redirectUri = 'https://example.com/oauth/byo-callback';

interface CreateProjectAppData {
  createProjectApp?: { id: string; clientId: string; name: string };
}

interface UpsertConnectionData {
  upsertProjectOAuthConnection?: {
    provider: string;
    clientId: string;
    isConfigured: boolean;
  };
}

interface MeProfileBody {
  data?: { accounts?: Array<{ owner?: { id: string } }> };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Project OAuth BYO E2E', () => {
  let owner: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let projectAppClientId: string;
  let scopeId: string;

  it('Setup: org, project, app, membership, and BYO Google connection', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E BYO OAuth Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E BYO OAuth Project');
    expect(projectRes.status).toBe(201);
    projectId = (projectRes.body as { data?: { id: string } }).data!.id;
    scopeId = `${org.id}:${projectId}`;

    const appRes = await graphqlRequest<CreateProjectAppData>({
      query: print(CreateProjectAppDocument),
      variables: {
        input: {
          scope: { tenant: 'organizationProject', id: scopeId },
          name: 'E2E BYO App',
          redirectUris: [redirectUri],
          enabledProviders: ['github', 'google', 'email'],
          allowSignUp: false,
        },
      },
      accessToken: owner.accessToken,
    });
    expect(appRes.body.data?.createProjectApp).toBeDefined();
    projectAppClientId = appRes.body.data!.createProjectApp!.clientId;

    const profile = await owner.getProfile();
    const userId = (profile.body as MeProfileBody).data?.accounts?.[0]?.owner?.id;
    expect(userId).toBeDefined();
    await addProjectUserForE2e(projectId, userId!);

    const upsertRes = await graphqlRequest<UpsertConnectionData>({
      query: print(UpsertProjectOAuthConnectionDocument),
      variables: {
        input: {
          scope: { tenant: 'organizationProject', id: scopeId },
          provider: ProjectOAuthConnectionProvider.Google,
          clientId: BYO_GOOGLE_CLIENT_ID,
          clientSecret: BYO_GOOGLE_CLIENT_SECRET,
        },
      },
      accessToken: owner.accessToken,
    });
    expect(upsertRes.body.errors).toBeUndefined();
    expect(upsertRes.body.data?.upsertProjectOAuthConnection?.clientId).toBe(BYO_GOOGLE_CLIENT_ID);
    expect(upsertRes.body.data?.upsertProjectOAuthConnection?.isConfigured).toBe(true);
  });

  it('GET /api/auth/project/app-info lists google configured without platform GOOGLE_CLIENT_ID', async () => {
    const res = await apiClient()
      .get('/api/auth/project/app-info')
      .query({ client_id: projectAppClientId, redirect_uri: redirectUri })
      .expect(200);

    expect(res.body.data.configuredProviders).toContain('google');
    expect(JSON.stringify(res.body)).not.toMatch(/clientSecret|encryptedSecret/i);
  });

  it('GET /api/auth/project/authorize?provider=google uses BYO client_id in Location', async () => {
    const res = await apiClient()
      .get('/api/auth/project/authorize')
      .query({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
        state: 'e2e-byo-google',
        provider: 'google',
      })
      .redirects(0)
      .expect(302);

    const location = res.headers.location ?? '';
    expect(location).toMatch(/accounts\.google\.com/);
    expect(location).toContain(`client_id=${encodeURIComponent(BYO_GOOGLE_CLIENT_ID)}`);
    if (PLATFORM_GOOGLE_CLIENT_ID) {
      expect(location).not.toContain(PLATFORM_GOOGLE_CLIENT_ID);
    }
  });

  it.skipIf(!PLATFORM_GOOGLE_CLIENT_ID)(
    'GET /api/auth/google still uses platform client when project has BYO Google stored',
    async () => {
      const res = await apiClient().get('/api/auth/google').redirects(0).expect(302);
      const location = res.headers.location ?? '';
      expect(location).toMatch(/accounts\.google\.com/);
      expect(location).toContain(PLATFORM_GOOGLE_CLIENT_ID!);
      expect(location).not.toContain(BYO_GOOGLE_CLIENT_ID);
    }
  );

  it('POST consent approve returns fragment token with aud = ProjectApp client_id', async () => {
    const emailRes = await apiClient()
      .post('/api/auth/project/email/request')
      .send({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
        state: 'e2e-aud-state',
        email: owner.email,
      })
      .expect(202);
    expect(emailRes.status).toBe(202);

    const { getProjectOAuthEmailTokenFromRedis } = await import('../helpers/redis-e2e');
    const found = await getProjectOAuthEmailTokenFromRedis();
    expect(found).not.toBeNull();

    const callbackRes = await apiClient()
      .get('/api/auth/project/callback')
      .query({ token: found!.token, state: found!.payload.stateId })
      .redirects(0)
      .expect(302);

    const consentToken = new URL(callbackRes.headers.location, 'http://localhost').searchParams.get(
      'consent_token'
    );
    expect(consentToken).toBeTruthy();

    const approveRes = await apiClient()
      .post('/api/auth/project/consent/approve')
      .set('Content-Type', 'application/json')
      .send({ consent_token: consentToken })
      .expect(200);

    const redirectUrl = approveRes.body.data.redirectUrl as string;
    const hash = new URL(redirectUrl).hash.replace(/^#/, '');
    const accessToken = new URLSearchParams(hash).get('access_token');
    expect(accessToken).toBeTruthy();
    expect(decodeJwtPayload(accessToken!).aud).toBe(projectAppClientId);
  });
});

describe('Project OAuth connections – forbidden', () => {
  it('user B cannot upsertProjectOAuthConnection in user A project scope', async () => {
    const userA = await TestUser.create({ withOrgAccount: true });
    const userB = await TestUser.create({ withOrgAccount: true });
    const orgA = await userA.createOrganization('BYO Org A');
    const projectRes = await userA.tryCreateProject(orgA.id, 'BYO Project A');
    expect(projectRes.status).toBe(201);
    const projectId = (projectRes.body as { data?: { id: string } }).data!.id;
    const scopeId = `${orgA.id}:${projectId}`;

    const res = await graphqlRequest<UpsertConnectionData>({
      query: print(UpsertProjectOAuthConnectionDocument),
      variables: {
        input: {
          scope: { tenant: 'organizationProject', id: scopeId },
          provider: ProjectOAuthConnectionProvider.Github,
          clientId: 'intruder-github-client',
          clientSecret: 'intruder-github-secret',
        },
      },
      accessToken: userB.accessToken,
    });

    expect(res.body.data?.upsertProjectOAuthConnection).toBeUndefined();
    expect(res.body.errors).toBeDefined();
    expect(
      res.body.errors?.some(
        (e: { extensions?: { code?: string } }) => e.extensions?.code === 'FORBIDDEN'
      )
    ).toBe(true);
  });

  it('user B cannot PUT /api/project-oauth-connections in user A project scope', async () => {
    const userA = await TestUser.create({ withOrgAccount: true });
    const userB = await TestUser.create({ withOrgAccount: true });
    const orgA = await userA.createOrganization('BYO REST Org A');
    const projectRes = await userA.tryCreateProject(orgA.id, 'BYO REST Project A');
    expect(projectRes.status).toBe(201);
    const projectId = (projectRes.body as { data?: { id: string } }).data!.id;
    const scopeId = `${orgA.id}:${projectId}`;

    const res = await apiClient()
      .put('/api/project-oauth-connections')
      .set('Authorization', userB.authHeader)
      .send({
        scope: { id: scopeId, tenant: 'organizationProject' },
        provider: ProjectOAuthConnectionProvider.Github,
        clientId: 'intruder-github-client',
        clientSecret: 'intruder-github-secret',
      });

    expect(res.status).toBe(403);
  });
});
