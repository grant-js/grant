/**
 * TestUser factory for E2E tests.
 *
 * Encapsulates the full user lifecycle (register → verify → login → create
 * org account) and provides convenience methods for common actions so that
 * scenario and compliance tests can be composed declaratively.
 *
 * Usage:
 *   const owner = await TestUser.create({ withOrgAccount: true });
 *   const org   = await owner.createOrganization('Acme');
 *   await owner.inviteMember(org.id, 'alice@acme.com');
 */
import { apiClient } from './api-client';
import {
  getMemberRoleId,
  getInvitationTokenForEmail,
  getVerificationTokenForEmail,
} from './db-tokens';

// ---------------------------------------------------------------------------
// Unique-per-process counter so parallel users never collide
// ---------------------------------------------------------------------------
let userCounter = 0;

function nextId(): string {
  return `${Date.now()}-${++userCounter}`;
}

// Non-sequential password that passes the API's strict validation
const DEFAULT_PASSWORD = 'Xe9#mK2!vQ7z';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TestUserOptions {
  /** If true, also creates a secondary org-type account after login. */
  withOrgAccount?: boolean;
  /** Custom name (default: auto-generated). */
  name?: string;
  /** Custom email (default: auto-generated). */
  email?: string;
  /** Custom password (default: DEFAULT_PASSWORD). */
  password?: string;
}

export interface OrganizationResult {
  id: string;
  name: string;
  slug: string;
}

export interface ProjectResult {
  id: string;
  name: string;
  slug: string;
}

export interface InvitationResult {
  id: string;
  email: string;
  status: string;
}

// ---------------------------------------------------------------------------
// TestUser class
// ---------------------------------------------------------------------------
export class TestUser {
  public readonly email: string;
  public readonly password: string;
  public readonly name: string;
  public accessToken: string;
  public refreshToken: string;
  public accountId: string;
  public orgAccountId: string | null;
  public userId: string | null = null;

  private constructor(opts: {
    email: string;
    password: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    accountId: string;
    orgAccountId: string | null;
  }) {
    this.email = opts.email;
    this.password = opts.password;
    this.name = opts.name;
    this.accessToken = opts.accessToken;
    this.refreshToken = opts.refreshToken;
    this.accountId = opts.accountId;
    this.orgAccountId = opts.orgAccountId;
  }

  // -------------------------------------------------------------------------
  // Factory
  // -------------------------------------------------------------------------

  /**
   * Create a fully authenticated test user:
   *   1. Register
   *   2. Verify email (reads OTP from DB -- console email provider)
   *   3. Login (refreshes token with verified status)
   *   4. Optionally create org-type secondary account
   */
  static async create(opts: TestUserOptions = {}): Promise<TestUser> {
    const uid = nextId();
    const email = opts.email ?? `e2e-user-${uid}@test.grant.dev`;
    const password = opts.password ?? DEFAULT_PASSWORD;
    const name = opts.name ?? `E2E User ${uid}`;

    // 1. Register
    const regRes = await apiClient()
      .post('/api/auth/register')
      .send({
        name,
        type: 'personal',
        provider: 'email',
        providerId: email,
        providerData: { password },
      })
      .expect(201);

    const accountId = regRes.body.data.account.id;

    // 2. Verify email
    const verifyToken = await getVerificationTokenForEmail(email);
    if (!verifyToken) throw new Error(`No verification token found for ${email}`);

    await apiClient().post('/api/auth/verify-email').send({ token: verifyToken }).expect(200);

    // 3. Login (gets verified access token)
    const loginRes = await apiClient()
      .post('/api/auth/login')
      .send({
        provider: 'email',
        providerId: email,
        providerData: { password },
      })
      .expect(200);

    const accessToken = loginRes.body.data.accessToken;
    const refreshToken = loginRes.body.data.refreshToken;

    // 4. Optionally create org account
    let orgAccountId: string | null = null;
    if (opts.withOrgAccount) {
      const accountRes = await apiClient()
        .post('/api/me/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      orgAccountId = accountRes.body.data.account.id;
    }

    return new TestUser({
      email,
      password,
      name,
      accessToken,
      refreshToken,
      accountId,
      orgAccountId,
    });
  }

  // -------------------------------------------------------------------------
  // Convenience: auth header
  // -------------------------------------------------------------------------

  /** Return the Authorization header value for this user. */
  get authHeader(): string {
    return `Bearer ${this.accessToken}`;
  }

  // -------------------------------------------------------------------------
  // Organization operations
  // -------------------------------------------------------------------------

  /** Create an organization under this user's org account scope. */
  async createOrganization(name: string): Promise<OrganizationResult> {
    if (!this.orgAccountId) {
      throw new Error('TestUser has no org account. Create with { withOrgAccount: true }.');
    }

    const res = await apiClient()
      .post('/api/organizations')
      .set('Authorization', this.authHeader)
      .send({
        name,
        scope: { id: this.orgAccountId, tenant: 'account' },
      })
      .expect(201);

    return {
      id: res.body.data.id,
      name: res.body.data.name,
      slug: res.body.data.slug,
    };
  }

  // -------------------------------------------------------------------------
  // Invitation operations
  // -------------------------------------------------------------------------

  /** Invite a member to an organization. Requires org-level scope. */
  async inviteMember(
    organizationId: string,
    email: string,
    roleId?: string
  ): Promise<InvitationResult> {
    const resolvedRoleId = roleId ?? (await getMemberRoleId(organizationId));
    if (!resolvedRoleId) {
      throw new Error(`No role found for organization ${organizationId}`);
    }

    const res = await apiClient()
      .post('/api/organization-invitations/invite')
      .set('Authorization', this.authHeader)
      .send({
        scope: { id: organizationId, tenant: 'organization' },
        email,
        roleId: resolvedRoleId,
      })
      .expect(201);

    return {
      id: res.body.data.id,
      email: res.body.data.email,
      status: res.body.data.status,
    };
  }

  /** Accept a pending invitation for this user's email. */
  async acceptInvitation(organizationId: string): Promise<void> {
    if (!this.orgAccountId) {
      throw new Error('TestUser has no org account. Create with { withOrgAccount: true }.');
    }

    const token = await getInvitationTokenForEmail(this.email, organizationId);
    if (!token)
      throw new Error(`No invitation token found for ${this.email} in org ${organizationId}`);

    const res = await apiClient()
      .post('/api/organization-invitations/accept')
      .set('Authorization', this.authHeader)
      .send({
        scope: { id: this.orgAccountId, tenant: 'account' },
        token,
        userData: {
          name: this.name,
          username: `e2e-${nextId()}`,
          password: this.password,
        },
      });

    if (![200, 201].includes(res.status)) {
      throw new Error(`Accept invitation failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
  }

  // -------------------------------------------------------------------------
  // Project operations
  // -------------------------------------------------------------------------

  /** Create a project under an organization scope. */
  async createProject(organizationId: string, name: string): Promise<ProjectResult> {
    const res = await apiClient()
      .post('/api/projects')
      .set('Authorization', this.authHeader)
      .send({
        name,
        description: `Created by E2E test user ${this.email}`,
        scope: { id: organizationId, tenant: 'organization' },
      });

    // Intentionally return the full response info so callers can assert status
    return {
      id: res.body.data?.id ?? '',
      name: res.body.data?.name ?? '',
      slug: res.body.data?.slug ?? '',
      // @ts-expect-error -- attach status for assertion in tests
      _status: res.status,
      // @ts-expect-error -- attach full body for debugging
      _body: res.body,
    };
  }

  /**
   * Try to create a project and return the raw response (for negative tests
   * that need to assert on status codes like 403).
   */
  async tryCreateProject(
    organizationId: string,
    name: string
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await apiClient()
      .post('/api/projects')
      .set('Authorization', this.authHeader)
      .send({
        name,
        description: `Created by E2E test user ${this.email}`,
        scope: { id: organizationId, tenant: 'organization' },
      });

    return { status: res.status, body: res.body as Record<string, unknown> };
  }

  // -------------------------------------------------------------------------
  // Profile / data operations
  // -------------------------------------------------------------------------

  /** Get own profile via GET /api/me. */
  async getProfile(): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await apiClient().get('/api/me').set('Authorization', this.authHeader);

    return { status: res.status, body: res.body as Record<string, unknown> };
  }

  /** Export own data via GET /api/me/export (GDPR Art. 15/20). */
  async exportData(): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await apiClient().get('/api/me/export').set('Authorization', this.authHeader);

    return { status: res.status, body: res.body as Record<string, unknown> };
  }

  /** Delete own account via DELETE /api/me/accounts (GDPR Art. 17). */
  async deleteAccount(
    hardDelete = false
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await apiClient()
      .delete('/api/me/accounts')
      .set('Authorization', this.authHeader)
      .send({ hardDelete });

    return { status: res.status, body: res.body as Record<string, unknown> };
  }

  // -------------------------------------------------------------------------
  // Raw request helpers (for custom / negative tests)
  // -------------------------------------------------------------------------

  /** Make an authenticated GET request. */
  async get(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await apiClient().get(path).set('Authorization', this.authHeader);

    return { status: res.status, body: res.body as Record<string, unknown> };
  }

  /** Make an authenticated POST request. */
  async post(
    path: string,
    body?: Record<string, unknown>
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const req = apiClient().post(path).set('Authorization', this.authHeader);

    if (body) req.send(body);
    const res = await req;

    return { status: res.status, body: res.body as Record<string, unknown> };
  }

  /** Make an authenticated DELETE request. */
  async delete(
    path: string,
    body?: Record<string, unknown>
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const req = apiClient().delete(path).set('Authorization', this.authHeader);

    if (body) req.send(body);
    const res = await req;

    return { status: res.status, body: res.body as Record<string, unknown> };
  }
}

// ---------------------------------------------------------------------------
// Standalone helpers (for tests that don't need a full TestUser)
// ---------------------------------------------------------------------------

/** Make an unauthenticated request (for negative auth tests). */
export function unauthenticatedClient() {
  return apiClient();
}
