/**
 * E2E: Project OAuth (authorize, email request, email callback).
 *
 * Covers:
 *   - GET /api/auth/project/authorize → 302 with Location (GitHub or email entry URL)
 *   - POST /api/auth/project/email/request → 202
 *   - GET /api/auth/project/callback (email flow) → 302 to consent, then code + token exchange
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
import { generateE2ePkce } from '../helpers/project-oauth-pkce';
import { closeRedisHelper, getProjectOAuthEmailTokenFromRedis } from '../helpers/redis-e2e';
import { TestUser } from '../helpers/test-user';

interface CreateProjectAppData {
  createProjectApp?: {
    id: string;
    clientId: string;
    clientSecret: string | null;
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
  let projectAppId: string;
  let projectAppClientId: string;
  let projectAppClientSecret: string;
  const redirectUri = 'https://example.com/oauth/callback';
  const pkce = generateE2ePkce();

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
    projectAppId = res.body.data!.createProjectApp!.id;
    projectAppClientId = res.body.data!.createProjectApp!.clientId;
    expect(res.body.data!.createProjectApp!.clientSecret).toBeTruthy();
    projectAppClientSecret = res.body.data!.createProjectApp!.clientSecret!;
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
    expect(res.body.data.projectName).toBe('E2E Project OAuth Project');
    expect(res.body.data.pictureUrl).toBeNull();
    expect(res.body.data.primaryColor).toBeNull();
    expect(res.body.data.showHelpPanel).toBe(true);
    expect(res.body.data.themeMode).toBeNull();
  });

  it('GET /api/auth/project/app-info resolves project theme after update', async () => {
    const patch = await apiClient()
      .patch(`/api/projects/${projectId}`)
      .set('Authorization', owner.authHeader)
      .send({
        scope: { id: org.id, tenant: 'organization' },
        primaryColor: '#FF5500',
        showHelpPanel: false,
      });
    expect(patch.status).toBe(200);

    const res = await apiClient()
      .get('/api/auth/project/app-info')
      .query({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
      })
      .expect(200);

    expect(res.body.data.projectName).toBe('E2E Project OAuth Project');
    expect(res.body.data.primaryColor).toBe('#FF5500');
    expect(res.body.data.showHelpPanel).toBe(false);
    expect(res.body.data.themeMode).toBeNull();
  });

  it('GET /api/auth/project/app-info resolves app themeMode after update', async () => {
    const patch = await apiClient()
      .patch(`/api/project-apps/${projectAppId}`)
      .set('Authorization', owner.authHeader)
      .send({
        scope: { id: `${org.id}:${projectId}`, tenant: 'organizationProject' },
        themeMode: 'dark',
      });
    expect(patch.status).toBe(200);

    const res = await apiClient()
      .get('/api/auth/project/app-info')
      .query({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
      })
      .expect(200);

    expect(res.body.data.themeMode).toBe('dark');
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
          code_challenge: pkce.challenge,
          code_challenge_method: 'S256',
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
          code_challenge: pkce.challenge,
          code_challenge_method: 'S256',
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
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
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
    const authorizeRes = await apiClient()
      .get('/api/auth/project/authorize')
      .query({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
        state: 'e2e-state-callback',
        provider: 'email',
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      })
      .redirects(0)
      .expect(302);
    const authorizeUrl = new URL(authorizeRes.headers.location, 'http://localhost');
    const stateId = authorizeUrl.searchParams.get('state');
    expect(stateId).toBeTruthy();

    const res = await apiClient()
      .post('/api/auth/project/email/request')
      .send({
        client_id: projectAppClientId,
        redirect_uri: redirectUri,
        state: stateId,
        email,
      })
      .expect(202);

    expect(res.status).toBe(202);
  });

  it('GET /api/auth/project/callback (email) → consent code, token exchange, refresh rotation', async () => {
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
    const approved = new URL(redirectUrl);
    const code = approved.searchParams.get('code');
    expect(code).toBeTruthy();
    expect(approved.hash).toBe('');
    expect(redirectUrl).not.toContain('access_token=');

    const tokenRes = await apiClient()
      .post('/api/auth/project/token')
      .send({
        grant_type: 'authorization_code',
        client_id: projectAppClientId,
        client_secret: projectAppClientSecret,
        redirect_uri: redirectUri,
        code,
        code_verifier: pkce.verifier,
      })
      .expect(200);

    expect(tokenRes.body.success).toBe(true);
    expect(tokenRes.body.data.accessToken).toBeTruthy();
    expect(tokenRes.body.data.tokenType).toBe('Bearer');
    expect(tokenRes.body.data.refreshToken).toBeTruthy();
    expect(tokenRes.body.data.expiresIn).toBeGreaterThan(0);
    const firstRefresh = tokenRes.body.data.refreshToken as string;

    const refreshRes = await apiClient()
      .post('/api/auth/project/token')
      .send({
        grant_type: 'refresh_token',
        client_id: projectAppClientId,
        client_secret: projectAppClientSecret,
        refresh_token: firstRefresh,
      })
      .expect(200);

    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).not.toBe(firstRefresh);

    await apiClient()
      .post('/api/auth/project/token')
      .send({
        grant_type: 'refresh_token',
        client_id: projectAppClientId,
        client_secret: projectAppClientSecret,
        refresh_token: firstRefresh,
      })
      .expect(401);
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
