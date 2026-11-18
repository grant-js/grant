/**
 * E2E: claiming an identity the CDM import created, on a mailbox proof.
 *
 * A CDM import (`users[].key.findBy: email`) leaves a global user with one unverified Email
 * method, no platform credential and, when the document carries one, a project credential.
 * The console lets that person claim the identity only on a mailbox proof, and only while
 * nothing else can sign in as them (no other method, no MFA):
 *
 * - Register carrying an organization invitation's email proof;
 * - Google sign-in on an address Google is authoritative for (Gmail, or `hd` equal to the
 *   address's domain), and GitHub sign-in on a verified address.
 *
 * A claim keeps the user id and the project credential, marks the Email method verified,
 * removes any platform password set before the proof, revokes earlier sessions and writes an
 * audit row with the proof. Everything else is refused and changes nothing.
 *
 * Social sign-in runs against the stub IdP in `tests/e2e/stub-idp` (docker-compose.e2e.yml):
 * the authorization code is the base64url JSON profile the IdP asserts.
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true and JOB_PROVIDER=node-cron. All addresses
 * are synthetic.
 */
import { CdmFindBy, CdmPasswordAlgorithm, ProjectSyncJobStatus } from '@grantjs/schema';
import { genSaltSync, hashSync } from 'bcrypt';
import { afterAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import { cdmWithRoleTemplate } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import {
  closeDbHelper,
  getInvitationTokenForEmail,
  query,
  setInvitationEmailProofTokenHash,
} from '../helpers/db-tokens';
import { postImport, resolveJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

const DOMAIN = 'test.grant.dev';
const CONSOLE_PASSWORD = 'Rw4&jN8!pL3x';
const IMPORTED_HASH = hashSync('Imported-Passw0rd-1', genSaltSync(4, 'a'));
const EMAIL_PROOF_TOKEN = 'imported-identity-claim-email-proof';

let counter = 0;
function uid(): string {
  return `${Date.now()}-${++counter}`;
}

type IdentityRow = Record<string, unknown> & {
  method_id: string;
  user_id: string;
  is_verified: boolean;
  providers: string[];
  platform_credentials: string;
  project_credentials: string;
  live_sessions: string;
};

/** The person behind an Email method: methods, credentials and live sessions, by count. */
async function identityOf(email: string): Promise<IdentityRow> {
  const rows = await query<IdentityRow>`
    SELECT
      m.id::text AS method_id,
      m.user_id::text AS user_id,
      m.is_verified,
      (SELECT ARRAY_AGG(o.provider ORDER BY o.provider) FROM user_authentication_methods o
        WHERE o.user_id = m.user_id AND o.deleted_at IS NULL) AS providers,
      (SELECT COUNT(*) FROM user_credentials c
        WHERE c.user_id = m.user_id AND c.deleted_at IS NULL)::text AS platform_credentials,
      (SELECT COUNT(*) FROM project_user_credentials p
        WHERE p.user_id = m.user_id AND p.deleted_at IS NULL)::text AS project_credentials,
      (SELECT COUNT(*) FROM user_sessions s
        WHERE s.user_id = m.user_id AND s.deleted_at IS NULL)::text AS live_sessions
    FROM user_authentication_methods m
    WHERE m.provider = 'email' AND m.provider_id = ${email} AND m.deleted_at IS NULL
  `;
  expect(rows).toHaveLength(1);
  return rows[0]!;
}

/** The proofs recorded by claim audit rows on an Email method. */
async function claimProofsOf(methodId: string): Promise<string[]> {
  const rows = await query<{ proof: string }>`
    SELECT a.metadata::jsonb ->> 'proof' AS proof
    FROM user_authentication_method_audit_logs a
    WHERE a.user_authentication_method_id = ${methodId}::uuid
      AND a.metadata::jsonb ->> 'operation' = 'claim-unverified-email'
    ORDER BY a.created_at
  `;
  return rows.map((row) => row.proof);
}

/** Imports `email` into a new project of `owner`'s account, with a legacy password hash. */
async function importIdentity(owner: TestUser, email: string): Promise<IdentityRow> {
  const projectRes = await apiClient()
    .post('/api/projects')
    .set('Authorization', owner.authHeader)
    .send({ name: `E2E Claim ${uid()}`, scope: { id: owner.accountId, tenant: 'account' } })
    .expect(201);
  const projectId = projectRes.body.data.id as string;
  const scope = scopeForAccountProject(owner.accountId, projectId);
  const roleKey = `claim-${uid()}`;
  const cdm: CdmDocumentInput = cdmWithRoleTemplate(roleKey, {
    users: [
      {
        key: { value: email, findBy: CdmFindBy.Email },
        name: 'Imported Person',
        roles: [roleKey],
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: [],
        metadata: null,
        password: { algorithm: CdmPasswordAlgorithm.Bcrypt, hash: IMPORTED_HASH },
      },
    ],
  });

  const imported = await postImport(owner.authHeader, projectId, scope, cdm);
  expect(imported.status).toBe(202);
  await resolveJob(
    owner.authHeader,
    projectId,
    scope,
    imported.job,
    ProjectSyncJobStatus.Completed
  );

  const identity = await identityOf(email);
  expect(identity).toMatchObject({
    is_verified: false,
    providers: ['email'],
    platform_credentials: '0',
    project_credentials: '1',
  });
  return identity;
}

/** Invites `email` to `organizationId` and returns the proof the emailed link carries. */
async function invitationProofFor(owner: TestUser, organizationId: string, email: string) {
  await owner.inviteMember(organizationId, email);
  const token = await getInvitationTokenForEmail(email, organizationId);
  expect(token).toBeTruthy();
  await setInvitationEmailProofTokenHash(token!, hashSync(EMAIL_PROOF_TOKEN, 4));
  return { type: 'ORGANIZATION_INVITATION', token, emailProofToken: EMAIL_PROOF_TOKEN };
}

function register(email: string, emailVerificationProof?: Record<string, unknown>) {
  return apiClient()
    .post('/api/auth/register')
    .send({
      name: 'Invited Person',
      type: 'personal',
      provider: 'email',
      providerId: email,
      providerData: { password: CONSOLE_PASSWORD },
      ...(emailVerificationProof ? { emailVerificationProof } : {}),
    });
}

function login(email: string, password: string) {
  return apiClient()
    .post('/api/auth/login')
    .send({ provider: 'email', providerId: email, providerData: { password } });
}

type GoogleProfile = { sub: string; email: string; email_verified: boolean; hd?: string };
type GithubProfile = {
  id: number;
  login: string;
  emails: Array<{ email: string; primary: boolean; verified: boolean }>;
};

/**
 * Console social sign-in against the stub IdP: start the flow for its `state`, then call the
 * callback with the profile as the code. Returns where the API sends the browser.
 */
async function socialSignIn(
  provider: 'google' | 'github',
  profile: GoogleProfile | GithubProfile
): Promise<{ location: string; signedIn: boolean }> {
  const start = await apiClient().get(`/api/auth/${provider}`).redirects(0).expect(302);
  const state = new URL(start.headers.location as string).searchParams.get('state');
  expect(state).toBeTruthy();

  const code = Buffer.from(JSON.stringify(profile)).toString('base64url');
  const callback = await apiClient()
    .get(`/api/auth/${provider}/callback`)
    .query({ code, state })
    .redirects(0)
    .expect(302);

  const location = callback.headers.location as string;
  const cookies = ([] as string[]).concat(callback.headers['set-cookie'] ?? []);
  return {
    location,
    signedIn: !location.includes('error=') && cookies.some((c) => /refresh/i.test(c)),
  };
}

async function addMethodForE2e(userId: string, provider: string, providerId: string) {
  await query`
    INSERT INTO user_authentication_methods (user_id, provider, provider_id, provider_data, is_verified)
    VALUES (${userId}::uuid, ${provider}, ${providerId}, '{}'::jsonb, true)
  `;
}

async function enableMfaFactorForE2e(userId: string) {
  await query`
    INSERT INTO user_mfa_factors (user_id, type, encrypted_secret, secret_iv, secret_tag, is_enabled)
    VALUES (${userId}::uuid, 'totp', 'e2e-not-a-secret', 'e2e-iv', 'e2e-tag', true)
  `;
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Imported identity claim - Register with an invitation proof', () => {
  it('claims the imported identity: same user, verified, console password set, project password kept', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Claim Invite Org');
    const email = `e2e-claim-register-${uid()}@${DOMAIN}`;
    const before = await importIdentity(owner, email);
    const proof = await invitationProofFor(owner, org.id, email);

    const res = await register(email, proof);

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.requiresEmailVerification).toBe(false);
    expect(res.body.data.account.ownerId).toBe(before.user_id);

    const after = await identityOf(email);
    expect(after).toMatchObject({
      method_id: before.method_id,
      user_id: before.user_id,
      is_verified: true,
      providers: ['email'],
      platform_credentials: '1',
      project_credentials: '1',
    });
    expect(await claimProofsOf(before.method_id)).toEqual(['organization-invitation']);

    expect((await login(email, CONSOLE_PASSWORD)).status).toBe(200);
  });

  it('refuses Register without the proof (409) and changes nothing', async () => {
    const owner = await TestUser.create();
    const email = `e2e-claim-noproof-${uid()}@${DOMAIN}`;
    const before = await importIdentity(owner, email);

    const res = await register(email);

    expect(res.status).toBe(409);
    expect(await identityOf(email)).toEqual(before);
    expect(await claimProofsOf(before.method_id)).toEqual([]);
  });

  it('refuses a proof issued for another address and changes nothing', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Claim Other Address Org');
    const invited = `e2e-claim-invited-${uid()}@${DOMAIN}`;
    const email = `e2e-claim-other-${uid()}@${DOMAIN}`;
    const before = await importIdentity(owner, email);
    const proof = await invitationProofFor(owner, org.id, invited);

    const res = await register(email, proof);

    expect(res.status).toBe(400);
    expect(await identityOf(email)).toEqual(before);
  });

  it('refuses an identity that is already verified (409); its password keeps working', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Claim Verified Org');
    const member = await TestUser.create();
    const proof = await invitationProofFor(owner, org.id, member.email);

    const res = await register(member.email, proof);

    expect(res.status).toBe(409);
    expect((await login(member.email, member.password)).status).toBe(200);
    expect((await login(member.email, CONSOLE_PASSWORD)).status).not.toBe(200);
  });

  it('refuses an identity that has another sign-in method (409)', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Claim Other Method Org');
    const email = `e2e-claim-linked-${uid()}@${DOMAIN}`;
    const imported = await importIdentity(owner, email);
    await addMethodForE2e(imported.user_id, 'github', `e2e-${uid()}`);
    const before = await identityOf(email);
    const proof = await invitationProofFor(owner, org.id, email);

    const res = await register(email, proof);

    expect(res.status).toBe(409);
    expect(await identityOf(email)).toEqual(before);
  });

  it('refuses an identity with an MFA factor enrolled (409)', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Claim MFA Org');
    const email = `e2e-claim-mfa-${uid()}@${DOMAIN}`;
    const before = await importIdentity(owner, email);
    await enableMfaFactorForE2e(before.user_id);
    const proof = await invitationProofFor(owner, org.id, email);

    const res = await register(email, proof);

    expect(res.status).toBe(409);
    expect(await identityOf(email)).toEqual(before);
  });
});

describe('Imported identity claim - Google and GitHub sign-in', () => {
  it('Google, on a Workspace address (`hd` equals the domain), claims and links', async () => {
    const owner = await TestUser.create();
    const email = `e2e-claim-google-hd-${uid()}@${DOMAIN}`;
    const before = await importIdentity(owner, email);

    const result = await socialSignIn('google', {
      sub: `e2e-google-${uid()}`,
      email,
      email_verified: true,
      hd: DOMAIN,
    });

    expect(result.signedIn).toBe(true);
    expect(await identityOf(email)).toMatchObject({
      user_id: before.user_id,
      is_verified: true,
      providers: ['email', 'google'],
      project_credentials: '1',
    });
    expect(await claimProofsOf(before.method_id)).toEqual(['google']);
  });

  it('Google, on a Gmail address, claims and links', async () => {
    const owner = await TestUser.create();
    const email = `e2e-claim-gmail-${uid()}@gmail.com`;
    const before = await importIdentity(owner, email);

    const result = await socialSignIn('google', {
      sub: `e2e-google-${uid()}`,
      email,
      email_verified: true,
    });

    expect(result.signedIn).toBe(true);
    expect(await identityOf(email)).toMatchObject({
      user_id: before.user_id,
      is_verified: true,
      providers: ['email', 'google'],
    });
    expect(await claimProofsOf(before.method_id)).toEqual(['google']);
  });

  it('Google, on a company address of a consumer account (no `hd`), is refused and changes nothing', async () => {
    const owner = await TestUser.create();
    const email = `e2e-claim-google-nohd-${uid()}@${DOMAIN}`;
    const before = await importIdentity(owner, email);

    const result = await socialSignIn('google', {
      sub: `e2e-google-${uid()}`,
      email,
      email_verified: true,
    });

    expect(result.signedIn).toBe(false);
    expect(result.location).toContain('error=emailUnverified');
    expect(await identityOf(email)).toEqual(before);
    expect(await claimProofsOf(before.method_id)).toEqual([]);
  });

  it('GitHub, on its primary verified address, claims and links', async () => {
    const owner = await TestUser.create();
    const email = `e2e-claim-github-${uid()}@${DOMAIN}`;
    const before = await importIdentity(owner, email);

    const result = await socialSignIn('github', {
      id: 1_000_000 + Math.floor(Math.random() * 1_000_000_000),
      login: `e2e-${uid()}`,
      emails: [{ email, primary: true, verified: true }],
    });

    expect(result.signedIn).toBe(true);
    expect(await identityOf(email)).toMatchObject({
      user_id: before.user_id,
      is_verified: true,
      providers: ['email', 'github'],
      project_credentials: '1',
    });
    expect(await claimProofsOf(before.method_id)).toEqual(['github']);
  });

  it('removes a console password set without a mailbox proof and revokes its sessions (pre-hijacking)', async () => {
    const email = `e2e-claim-prehijack-${uid()}@${DOMAIN}`;
    const squatter = await register(email);
    expect(squatter.status).toBe(201);
    const squatterRefreshToken = squatter.body.data.refreshToken as string;
    const before = await identityOf(email);
    expect(before).toMatchObject({ is_verified: false, platform_credentials: '1' });

    const result = await socialSignIn('google', {
      sub: `e2e-google-${uid()}`,
      email,
      email_verified: true,
      hd: DOMAIN,
    });

    expect(result.signedIn).toBe(true);
    expect(await identityOf(email)).toMatchObject({
      user_id: before.user_id,
      is_verified: true,
      providers: ['email', 'google'],
      platform_credentials: '0',
    });
    expect((await login(email, CONSOLE_PASSWORD)).status).not.toBe(200);
    const refresh = await apiClient()
      .post('/api/auth/refresh')
      .send({ refreshToken: squatterRefreshToken });
    expect(refresh.status).not.toBe(200);
  });
});
