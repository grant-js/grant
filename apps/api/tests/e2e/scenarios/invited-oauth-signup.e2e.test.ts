/**
 * E2E: an invited person with no Grant identity signs up with Google or GitHub.
 *
 * On a closed install (`AUTH_PUBLIC_SIGNUP_ENABLED=false`) a first-time social sign-up passes the
 * gate only when the provider vouched for the mailbox (Google: Gmail or `hd` equal to the
 * address's domain; GitHub: a verified address) and a pending, unexpired organization invitation
 * exists for it. Afterwards the invitation page accepts the invitation as that user.
 *
 * Social sign-in runs against the stub IdP in `tests/e2e/stub-idp`: the authorization code is
 * the base64url JSON profile the IdP asserts. All addresses are synthetic.
 *
 * The shared e2e stack is open (public signup on), so the gate cannot be observed there:
 * - On the shared stack the "sign-up, then accept" cases run (they exercise the whole path
 *   but prove nothing about the gate) and the "closed install" cases skip themselves.
 * - To exercise the gate, start a FRESH stack closed and run this file alone, so the owner
 *   below is the only human who bootstraps it:
 *
 *     E2E_AUTH_PUBLIC_SIGNUP_ENABLED=false pnpm test:e2e:up
 *     pnpm --filter grant-api test:e2e -- tests/e2e/scenarios/invited-oauth-signup.e2e.test.ts
 *     pnpm test:e2e:down
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, query } from '../helpers/db-tokens';
import { TestUser } from '../helpers/test-user';

const DOMAIN = 'test.grant.dev';

let counter = 0;
function uid(): string {
  return `${Date.now()}-${++counter}`;
}

let owner: TestUser;
let organizationId: string;
let publicSignupEnabled = true;

beforeAll(async () => {
  const providers = await apiClient().get('/api/auth/providers').expect(200);
  publicSignupEnabled = providers.body.data.publicSignupEnabled === true;
  // The first human on a closed stack is allowed (bootstrap); everyone after needs an invitation.
  owner = await TestUser.create({ withOrgAccount: true });
  organizationId = (await owner.createOrganization(`Invited OAuth Org ${uid()}`)).id;
});

afterAll(async () => {
  await closeDbHelper();
});

type GoogleProfile = { sub: string; email: string; email_verified: boolean; hd?: string };
type GithubProfile = {
  id: number;
  login: string;
  emails: Array<{ email: string; primary: boolean; verified: boolean }>;
};

/** Social sign-in against the stub IdP; returns where the API sends the browser and the session. */
async function socialSignIn(provider: 'google' | 'github', profile: GoogleProfile | GithubProfile) {
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
  const refreshCookie = cookies.find((c) => /refresh/i.test(c));
  const refreshToken = refreshCookie
    ? decodeURIComponent(refreshCookie.split(';')[0]!.split('=').slice(1).join('='))
    : null;
  return { location, signedIn: !location.includes('error=') && !!refreshToken, refreshToken };
}

function googleProfile(email: string, hd: string | undefined = DOMAIN): GoogleProfile {
  return { sub: `e2e-google-${uid()}`, email, email_verified: true, ...(hd ? { hd } : {}) };
}

function githubProfile(email: string): GithubProfile {
  return {
    id: 1_000_000 + Math.floor(Math.random() * 1_000_000_000),
    login: `e2e-${uid()}`,
    emails: [{ email, primary: true, verified: true }],
  };
}

async function userExists(email: string): Promise<boolean> {
  const rows = await query<{ id: string }>`
    SELECT m.id::text AS id FROM user_authentication_methods m
    WHERE m.provider = 'email' AND m.provider_id = ${email} AND m.deleted_at IS NULL
  `;
  return rows.length > 0;
}

async function isMember(email: string): Promise<boolean> {
  const rows = await query<{ user_id: string }>`
    SELECT ou.user_id::text AS user_id
    FROM organization_users ou
    JOIN user_authentication_methods m ON m.user_id = ou.user_id
    WHERE m.provider = 'email' AND m.provider_id = ${email} AND m.deleted_at IS NULL
      AND ou.organization_id = ${organizationId}::uuid AND ou.deleted_at IS NULL
  `;
  return rows.length > 0;
}

async function invitationToken(email: string): Promise<string> {
  const rows = await query<{ token: string }>`
    SELECT token FROM organization_invitations
    WHERE email = ${email} AND organization_id = ${organizationId}::uuid
      AND status = 'pending' AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `;
  expect(rows).toHaveLength(1);
  return rows[0]!.token;
}

/** What the invitation page does after the redirect: refresh the session, then accept. */
async function acceptAsSignedInUser(email: string, refreshToken: string) {
  const refreshed = await apiClient().post('/api/auth/refresh').send({ refreshToken });
  expect(refreshed.status).toBe(200);
  const accessToken = refreshed.body.data.accessToken as string;

  return apiClient()
    .post('/api/organization-invitations/accept')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ token: await invitationToken(email) });
}

describe('Invited Google / GitHub sign-up, then accept', () => {
  it('Google (`hd` equals the domain): account created, invitation accepted, membership exists', async () => {
    const email = `e2e-invited-google-${uid()}@${DOMAIN}`;
    await owner.inviteMember(organizationId, email);

    const result = await socialSignIn('google', googleProfile(email));

    expect(result.signedIn).toBe(true);
    expect(await userExists(email)).toBe(true);

    const accepted = await acceptAsSignedInUser(email, result.refreshToken!);
    expect(accepted.status).toBe(200);
    expect(await isMember(email)).toBe(true);
  });

  it('GitHub (verified address): account created, invitation accepted, membership exists', async () => {
    const email = `e2e-invited-github-${uid()}@${DOMAIN}`;
    await owner.inviteMember(organizationId, email);

    const result = await socialSignIn('github', githubProfile(email));

    expect(result.signedIn).toBe(true);
    expect(await userExists(email)).toBe(true);

    const accepted = await acceptAsSignedInUser(email, result.refreshToken!);
    expect(accepted.status).toBe(200);
    expect(await isMember(email)).toBe(true);
  });

  it('matches the invitation case-insensitively', async () => {
    const email = `e2e-invited-case-${uid()}@${DOMAIN}`;
    await owner.inviteMember(organizationId, email);

    const result = await socialSignIn('google', googleProfile(email.toUpperCase()));

    expect(result.signedIn).toBe(true);
  });
});

describe('Closed install: sign-up is refused without a qualifying invitation', () => {
  it('Google without an invitation: PUBLIC_SIGNUP_DISABLED, no account', async (ctx) => {
    if (publicSignupEnabled) ctx.skip();
    const email = `e2e-uninvited-google-${uid()}@${DOMAIN}`;

    const result = await socialSignIn('google', googleProfile(email));

    expect(result.signedIn).toBe(false);
    expect(result.location).toContain('error=');
    expect(await userExists(email)).toBe(false);
  });

  it('GitHub without an invitation: refused, no account', async (ctx) => {
    if (publicSignupEnabled) ctx.skip();
    const email = `e2e-uninvited-github-${uid()}@${DOMAIN}`;

    const result = await socialSignIn('github', githubProfile(email));

    expect(result.signedIn).toBe(false);
    expect(await userExists(email)).toBe(false);
  });

  it('Google without `hd` on a company address (not authoritative): refused despite the invitation', async (ctx) => {
    if (publicSignupEnabled) ctx.skip();
    const email = `e2e-invited-nohd-${uid()}@${DOMAIN}`;
    await owner.inviteMember(organizationId, email);

    const result = await socialSignIn('google', googleProfile(email, ''));

    expect(result.signedIn).toBe(false);
    expect(await userExists(email)).toBe(false);
  });

  it('REST register with provider google and spoofed providerData stays refused', async (ctx) => {
    if (publicSignupEnabled) ctx.skip();
    const email = `e2e-invited-spoof-${uid()}@${DOMAIN}`;
    await owner.inviteMember(organizationId, email);

    const res = await apiClient()
      .post('/api/auth/register')
      .send({
        name: 'Spoofer',
        type: 'personal',
        provider: 'google',
        providerId: `e2e-google-${uid()}`,
        providerData: { email, emailVerified: true, hd: DOMAIN, emailAuthoritative: true },
      });

    expect(res.status).toBe(400);
    expect(await userExists(email)).toBe(false);
  });
});
