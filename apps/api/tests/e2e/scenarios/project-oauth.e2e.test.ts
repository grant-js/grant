/**
 * E2E: Project OAuth (authorize, email request, email callback).
 *
 * Covers:
 *   - GET /api/auth/project/authorize → 302 with Location (GitHub or email entry URL)
 *   - POST /api/auth/project/email/request → 202
 *   - GET /api/auth/project/callback (email flow) → 302 with access_token in fragment
 *
 * Uses Redis helper to read the one-time token after email request and drive the callback.
 * Prerequisites: E2E stack (docker-compose.e2e.yml), DB migrated and seeded.
 */
import { CreateProjectAppDocument } from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { addProjectUserForE2e, closeDbHelper } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { closeRedisHelper, getProjectOAuthEmailTokenFromRedis } from '../helpers/redis-e2e';
import { TestUser } from '../helpers/test-user';

interface CreateProjectAppData {
  createProjectApp?: {
    id: string;
    clientId: string;
    name: string;
    redirectUris: string[];
  };
}

/** GET /api/me response body shape (data.accounts[].owner.id is the user id). */
interface MeProfileBody {
  data?: {
    accounts?: Array<{ owner?: { id: string } }>;
  };
}

afterAll(async () => {
  await closeDbHelper();
  await closeRedisHelper();
});

describe('Project OAuth E2E', () => {
  let owner: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let projectAppClientId: string;
  const redirectUri = 'https://example.com/oauth/callback';

  it('Setup: create user, org, project, and project app with email enabled', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Project OAuth Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Project OAuth Project');
    expect(projectRes.status).toBe(201);
    const body = projectRes.body as { data?: { id: string } };
    expect(body.data?.id).toBeDefined();
    projectId = body.data!.id;

    const res = await graphqlRequest<CreateProjectAppData>({
      query: print(CreateProjectAppDocument),
      variables: {
        input: {
          scope: { tenant: 'organizationProject', id: `${org.id}:${projectId}` },
          name: 'E2E OAuth App',
          redirectUris: [redirectUri],
          enabledProviders: ['github', 'google', 'email'],
          allowSignUp: false,
        },
      },
      accessToken: owner.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.createProjectApp).toBeDefined();
    projectAppClientId = res.body.data!.createProjectApp!.clientId;
  });

  it('Add owner to project_users so callback can resolve membership', async () => {
    const profile = await owner.getProfile();
    expect(profile.status).toBe(200);
    const body = profile.body as MeProfileBody;
    const userId = body.data?.accounts?.[0]?.owner?.id;
    expect(userId).toBeDefined();
    await addProjectUserForE2e(projectId, userId!);
  });

  it('GET /api/auth/project/app-info → 200 with app name, enabledProviders, scopes', async () => {
    const res = await apiClient()
      .get('/api/auth/project/app-info')
      .query({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('E2E OAuth App');
    expect(res.body.data.enabledProviders).toEqual(['github', 'google', 'email']);
    expect(Array.isArray(res.body.data.scopes)).toBe(true);
  });

  it.skipIf(!process.env.GITHUB_CLIENT_ID)(
    'GET /api/auth/project/authorize?provider=github → 302 with Location to GitHub',
    async () => {
      const res = await apiClient()
        .get('/api/auth/project/authorize')
        .query({
          client_id: projectAppClientId,
          redirect_uri: redirectUri,
          state: 'e2e-state-github',
          provider: 'github',
        })
        .redirects(0)
        .expect(302);

      expect(res.headers.location).toBeDefined();
      expect(res.headers.location).toMatch(/github\.com/);
    }
  );

  it.skipIf(!process.env.GOOGLE_CLIENT_ID)(
    'GET /api/auth/project/authorize?provider=google → 302 with Location to Google',
    async () => {
      const res = await apiClient()
        .get('/api/auth/project/authorize')
        .query({
          client_id: projectAppClientId,
          redirect_uri: redirectUri,
          state: 'e2e-state-google',
          provider: 'google',
        })
        .redirects(0)
        .expect(302);

      expect(res.headers.location).toBeDefined();
      expect(res.headers.location).toMatch(/accounts\.google\.com/);
    }
  );

  it('GET /api/auth/project/authorize?provider=email → 302 with Location to email entry URL', async () => {
    const res = await apiClient()
      .get('/api/auth/project/authorize')
      .query({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
        state: 'e2e-state-email',
        provider: 'email',
      })
      .redirects(0)
      .expect(302);

    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toContain('client_id=');
    expect(res.headers.location).toContain('redirect_uri=');
    expect(res.headers.location).toContain('state=');
  });

  it('POST /api/auth/project/email/request → 202', async () => {
    const email = owner.email;

    const res = await apiClient()
      .post('/api/auth/project/email/request')
      .send({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
        state: 'e2e-state-callback',
        email,
      })
      .expect(202);

    expect(res.status).toBe(202);
  });

  it('GET /api/auth/project/callback (email) → 302 to consent, then approve → redirectUrl with access_token', async () => {
    const found = await getProjectOAuthEmailTokenFromRedis();
    expect(found).not.toBeNull();
    const { token, payload } = found!;
    expect(payload.stateId).toBeDefined();
    expect(payload.redirectUri).toBe(redirectUri);

    const callbackRes = await apiClient()
      .get('/api/auth/project/callback')
      .query({ token, state: payload.stateId })
      .redirects(0)
      .expect(302);

    expect(callbackRes.headers.location).toBeDefined();
    expect(callbackRes.headers.location).toContain('/auth/project/consent');
    expect(callbackRes.headers.location).toContain('consent_token=');

    const consentUrl = new URL(callbackRes.headers.location, 'http://localhost');
    const consentToken = consentUrl.searchParams.get('consent_token');
    expect(consentToken).toBeTruthy();

    const approveRes = await apiClient()
      .post('/api/auth/project/consent/approve')
      .set('Content-Type', 'application/json')
      .send({ consent_token: consentToken })
      .expect(200);

    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data?.redirectUrl).toBeDefined();
    const redirectUrl = approveRes.body.data.redirectUrl as string;
    expect(redirectUrl).toContain(redirectUri);
    expect(redirectUrl).toContain('access_token=');
    expect(redirectUrl).toContain('expires_in=');
    expect(redirectUrl).toContain('token_type=Bearer');
  });

  it('POST /api/auth/project/consent/deny → redirectUrl with error=access_denied', async () => {
    await apiClient()
      .post('/api/auth/project/email/request')
      .send({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
        state: 'e2e-state-deny',
        email: owner.email,
      })
      .expect(202);

    const found = await getProjectOAuthEmailTokenFromRedis();
    expect(found).not.toBeNull();
    const { token, payload } = found!;

    const callbackRes = await apiClient()
      .get('/api/auth/project/callback')
      .query({ token, state: payload.stateId })
      .redirects(0)
      .expect(302);

    const consentUrl = new URL(callbackRes.headers.location, 'http://localhost');
    const consentToken = consentUrl.searchParams.get('consent_token');
    expect(consentToken).toBeTruthy();

    const denyRes = await apiClient()
      .post('/api/auth/project/consent/deny')
      .set('Content-Type', 'application/json')
      .send({ consent_token: consentToken })
      .expect(200);

    expect(denyRes.body.success).toBe(true);
    expect(denyRes.body.data?.redirectUrl).toBeDefined();
    const redirectUrl = denyRes.body.data.redirectUrl as string;
    expect(redirectUrl).toContain(redirectUri);
    expect(redirectUrl).toContain('error=access_denied');
  });
});
