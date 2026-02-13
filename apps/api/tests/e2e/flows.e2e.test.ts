/**
 * Grant API – End-to-End Test Flows
 *
 * Runs against the real API container (docker-compose.e2e.yml).
 * Tests execute sequentially because later steps depend on data from earlier ones
 * (register → verify → login → create org → invite → accept → create project).
 *
 * Prerequisites:
 *   1. docker compose -f docker-compose.e2e.yml up -d
 *   2. DB migrations + seed have been applied
 *   3. pnpm --filter grant-api test:e2e
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { apiClient } from './helpers/api-client';
import {
  closeDbHelper,
  getMemberRoleId,
  getInvitationTokenForEmail,
  getVerificationTokenForEmail,
} from './helpers/db-tokens';

// ---------------------------------------------------------------------------
// Shared state across tests (populated as we go)
// ---------------------------------------------------------------------------
const RUN_ID = Date.now();
const PRIMARY_EMAIL = `e2e-primary-${RUN_ID}@test.grant.dev`;
// Password must pass strict validation (no sequential chars like abc/123)
const PRIMARY_PASSWORD = 'Xe9#mK2!vQ7z';
const PRIMARY_NAME = `E2E User ${RUN_ID}`;

const INVITEE_EMAIL = `e2e-invite-${RUN_ID}@test.grant.dev`;
const INVITEE_PASSWORD = 'Rw4&jN8!pL3x';
const INVITEE_NAME = `E2E Invitee ${RUN_ID}`;

const state: {
  accessToken: string;
  refreshToken: string;
  accountId: string;
  accountType: string;
  orgAccountId: string;
  organizationId: string;
  organizationSlug: string;
  invitationToken: string;
  projectId: string;
  // Invitee auth state
  inviteeAccessToken: string;
  inviteeOrgAccountId: string;
} = {} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
beforeAll(async () => {
  // setup.ts already ensures the API is healthy; nothing else needed here
});

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// 1. Health check
// ---------------------------------------------------------------------------
describe('Health', () => {
  it('GET /health → 200 with status ok', async () => {
    const res = await apiClient().get('/health').expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
    });
    expect(res.body.timestamp).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Register
// ---------------------------------------------------------------------------
describe('Register', () => {
  it('POST /api/auth/register → 201 with tokens and account', async () => {
    const res = await apiClient()
      .post('/api/auth/register')
      .send({
        name: PRIMARY_NAME,
        type: 'personal',
        provider: 'email',
        providerId: PRIMARY_EMAIL,
        providerData: {
          password: PRIMARY_PASSWORD,
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.account).toBeDefined();
    expect(res.body.data.account.id).toBeDefined();

    state.accessToken = res.body.data.accessToken;
    state.refreshToken = res.body.data.refreshToken;
    state.accountId = res.body.data.account.id;
    state.accountType = res.body.data.account.type ?? 'personal';
  });
});

// ---------------------------------------------------------------------------
// 3. Verify email
// ---------------------------------------------------------------------------
describe('Verify email', () => {
  it('POST /api/auth/verify-email → 200 with success', async () => {
    // Retrieve the OTP token from the database (email was "sent" via console adapter)
    const token = await getVerificationTokenForEmail(PRIMARY_EMAIL);
    expect(token).toBeTruthy();

    const res = await apiClient().post('/api/auth/verify-email').send({ token }).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Login (after verification so the JWT has isVerified: true)
// ---------------------------------------------------------------------------
describe('Login', () => {
  it('POST /api/auth/login → 200 with tokens and accounts', async () => {
    const res = await apiClient()
      .post('/api/auth/login')
      .send({
        provider: 'email',
        providerId: PRIMARY_EMAIL,
        providerData: {
          password: PRIMARY_PASSWORD,
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Login returns `accounts` (array), not `account` (singular)
    expect(res.body.data.accounts).toBeDefined();
    expect(res.body.data.accounts.length).toBeGreaterThan(0);

    // Update tokens to the verified session
    state.accessToken = res.body.data.accessToken;
    state.refreshToken = res.body.data.refreshToken;
    // Use the first account
    state.accountId = res.body.data.accounts[0].id;
  });
});

// ---------------------------------------------------------------------------
// 5. Create secondary account (personal ↔ organization)
// ---------------------------------------------------------------------------
describe('Create secondary account', () => {
  it('POST /api/me/accounts → 201 with new account', async () => {
    const res = await apiClient()
      .post('/api/me/accounts')
      .set('Authorization', `Bearer ${state.accessToken}`)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    // Response has { account: { id, type, ... }, accounts: [...] }
    expect(res.body.data.account).toBeDefined();
    expect(res.body.data.account.id).toBeDefined();

    // The secondary (organization) account is the new one
    state.orgAccountId = res.body.data.account.id;
  });
});

// ---------------------------------------------------------------------------
// 6. Create organization (under the org account scope)
// ---------------------------------------------------------------------------
describe('Create organization', () => {
  it('POST /api/organizations → 201 with org data', async () => {
    const res = await apiClient()
      .post('/api/organizations')
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        name: `E2E Org ${RUN_ID}`,
        scope: {
          // Accounts always use tenant 'account'; 'organization' is for within-org scopes
          id: state.orgAccountId,
          tenant: 'account',
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe(`E2E Org ${RUN_ID}`);
    expect(res.body.data.slug).toBeDefined();

    state.organizationId = res.body.data.id;
    state.organizationSlug = res.body.data.slug;
  });
});

// ---------------------------------------------------------------------------
// 7. Invite member
// ---------------------------------------------------------------------------
describe('Invite member', () => {
  it('POST /api/organization-invitations/invite → 201 with invitation', async () => {
    // We need a valid roleId – get one from the DB
    const roleId = await getMemberRoleId(state.organizationId!);
    expect(roleId).toBeTruthy();

    const res = await apiClient()
      .post('/api/organization-invitations/invite')
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        scope: {
          id: state.organizationId,
          tenant: 'organization',
        },
        email: INVITEE_EMAIL,
        roleId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.email).toBe(INVITEE_EMAIL);
    expect(res.body.data.status).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// 8. Accept invitation (invitee must register, verify, login, create org account first)
// ---------------------------------------------------------------------------
describe('Accept invitation', () => {
  it('Register invitee → verify → login → create org account', async () => {
    // 8a. Register the invitee
    const regRes = await apiClient()
      .post('/api/auth/register')
      .send({
        name: INVITEE_NAME,
        type: 'personal',
        provider: 'email',
        providerId: INVITEE_EMAIL,
        providerData: {
          password: INVITEE_PASSWORD,
        },
      })
      .expect(201);

    expect(regRes.body.success).toBe(true);

    // 8b. Verify invitee's email (token is in the DB via console email provider)
    const verifyToken = await getVerificationTokenForEmail(INVITEE_EMAIL);
    expect(verifyToken).toBeTruthy();

    await apiClient().post('/api/auth/verify-email').send({ token: verifyToken }).expect(200);

    // 8c. Login as invitee to get a verified access token
    const loginRes = await apiClient()
      .post('/api/auth/login')
      .send({
        provider: 'email',
        providerId: INVITEE_EMAIL,
        providerData: {
          password: INVITEE_PASSWORD,
        },
      })
      .expect(200);

    state.inviteeAccessToken = loginRes.body.data.accessToken;

    // 8d. Create an org-type secondary account (grants OrganizationAccountOwner role)
    const accountRes = await apiClient()
      .post('/api/me/accounts')
      .set('Authorization', `Bearer ${state.inviteeAccessToken}`)
      .expect(201);

    state.inviteeOrgAccountId = accountRes.body.data.account.id;
  });

  it('POST /api/organization-invitations/accept → 200 with result', async () => {
    // Retrieve the invitation token from the database
    const invitationToken = await getInvitationTokenForEmail(INVITEE_EMAIL, state.organizationId);
    expect(invitationToken).toBeTruthy();
    state.invitationToken = invitationToken!;

    const res = await apiClient()
      .post('/api/organization-invitations/accept')
      .set('Authorization', `Bearer ${state.inviteeAccessToken}`)
      .send({
        scope: {
          // Accept requires OrganizationAccountOwner role → use invitee's org account scope
          id: state.inviteeOrgAccountId,
          tenant: 'account',
        },
        token: state.invitationToken,
        userData: {
          name: INVITEE_NAME,
          username: `e2e-invitee-${RUN_ID}`,
          password: INVITEE_PASSWORD,
        },
      });

    // Accept may return 200 or 201 depending on whether user already existed
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 9. Create project (under the organization)
// ---------------------------------------------------------------------------
describe('Create project', () => {
  it('POST /api/projects → 201 with project data', async () => {
    const res = await apiClient()
      .post('/api/projects')
      .set('Authorization', `Bearer ${state.accessToken}`)
      .send({
        name: `E2E Project ${RUN_ID}`,
        description: 'Created by E2E test suite',
        scope: {
          id: state.organizationId,
          tenant: 'organization',
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe(`E2E Project ${RUN_ID}`);
    expect(res.body.data.slug).toBeDefined();

    state.projectId = res.body.data.id;
  });
});
