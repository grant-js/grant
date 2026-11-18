/**
 * E2E: link a project user to the existing identity that holds an address.
 *
 * An operator creates a project user with no email (an identity shell, like a keyed
 * import), and another member of the organization already holds the address. Owner and
 * Admin may link the shell to that identity; Dev and Viewer may not. After the link the
 * identity is the project member, the shell is soft-deleted, and the project log holds one
 * `project.user_identity_linked` (ids only) and no removal or deletion event. REST and
 * GraphQL answer the same; the refusals are 404 (not a member) and 409 (holder outside the
 * organization, or already a member).
 */
import { CreateUserDocument, LinkProjectUserIdentityDocument, Tenant } from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const ROLE_ADMIN = 'roles.names.organizationAdmin';
const ROLE_DEV = 'roles.names.organizationDev';
const ROLE_VIEWER = 'roles.names.organizationViewer';

interface IdBody {
  data?: { id: string };
}

afterAll(async () => {
  await closeDbHelper();
});

async function userIdOf(email: string): Promise<string> {
  const rows = await query<{ user_id: string }>`
    SELECT user_id::text AS user_id FROM user_authentication_methods
    WHERE provider = 'email' AND provider_id = ${email.toLowerCase()} AND deleted_at IS NULL
  `;
  expect(rows[0], `no identity holds ${email}`).toBeDefined();
  return rows[0].user_id;
}

async function liveMemberIds(projectId: string): Promise<string[]> {
  const rows = await query<{ user_id: string }>`
    SELECT user_id::text AS user_id FROM project_users
    WHERE project_id = ${projectId}::uuid AND deleted_at IS NULL
  `;
  return rows.map((r) => r.user_id);
}

function isForbidden(res: {
  body: { errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
}): boolean {
  return Boolean(
    res.body.errors?.some((e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN')
  );
}

describe('Project user identity link', () => {
  let owner: TestUser;
  let admin: TestUser;
  let dev: TestUser;
  let viewer: TestUser;
  let holderA: TestUser;
  let holderB: TestUser;
  let outsider: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let stamp: string;

  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });

  const gql = <T>(
    token: string,
    document: Parameters<typeof print>[0],
    variables: Record<string, unknown>
  ) => graphqlRequest<T>({ query: print(document), accessToken: token, variables });

  /** A project user with no way to sign in. */
  async function createShell(name: string): Promise<string> {
    const res = await gql<{ createUser?: { id: string } }>(owner.accessToken, CreateUserDocument, {
      input: { name, scope: projectScope() },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    return res.body.data!.createUser!.id;
  }

  const link = (token: string, userId: string, email: string) =>
    gql<{ linkProjectUserIdentity?: { id: string } }>(token, LinkProjectUserIdentityDocument, {
      input: { userId, email, scope: projectScope() },
    });

  it('Setup: org, project, operators, two holders in the organization, one outside it', async () => {
    stamp = `${Date.now()}`;
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Link Identity Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Link Identity Project');
    expect(projectRes.status).toBe(201);
    projectId = (projectRes.body as IdBody).data!.id;

    const adminRoleId = await getOrganizationRoleIdByName(org.id, ROLE_ADMIN);
    const devRoleId = await getOrganizationRoleIdByName(org.id, ROLE_DEV);
    const viewerRoleId = await getOrganizationRoleIdByName(org.id, ROLE_VIEWER);
    expect(adminRoleId && devRoleId && viewerRoleId).toBeTruthy();

    const invite = async (label: string, roleId: string): Promise<TestUser> => {
      const email = `e2e-link-${label}-${stamp}@test.grant.dev`;
      await owner.inviteMember(org.id, email, roleId);
      const user = await TestUser.create({ email, withOrgAccount: true });
      await user.acceptInvitation(org.id);
      return user;
    };
    admin = await invite('admin', adminRoleId!);
    dev = await invite('dev', devRoleId!);
    viewer = await invite('viewer', viewerRoleId!);
    holderA = await invite('holder-a', viewerRoleId!);
    holderB = await invite('holder-b', viewerRoleId!);
    outsider = await TestUser.create({
      email: `e2e-link-outsider-${stamp}@test.grant.dev`,
      withOrgAccount: true,
    });
  });

  it('Dev and Viewer are denied', async () => {
    const shell = await createShell('E2E Link Denied');
    expect(isForbidden(await link(dev.accessToken, shell, holderA.email))).toBe(true);
    expect(isForbidden(await link(viewer.accessToken, shell, holderA.email))).toBe(true);
    expect(await liveMemberIds(projectId)).toContain(shell);
  });

  it('Admin links a shell to the holder: the holder is the member, the shell is retired', async () => {
    const shell = await createShell('E2E Link Shell A');
    const holderId = await userIdOf(holderA.email);
    const since = new Date();

    const res = await link(admin.accessToken, shell, `  ${holderA.email.toUpperCase()} `);

    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.linkProjectUserIdentity?.id).toBe(holderId);
    const members = await liveMemberIds(projectId);
    expect(members).toContain(holderId);
    expect(members).not.toContain(shell);

    const retired = await query<{ deleted: boolean }>`
      SELECT deleted_at IS NOT NULL AS deleted FROM users WHERE id = ${shell}::uuid
    `;
    expect(retired[0]?.deleted).toBe(true);

    const events = await query<{ type: string; payload: unknown }>`
      SELECT type, payload FROM event_log
      WHERE scope_id = ${`${org.id}:${projectId}`} AND created_at >= ${since}
        AND (subject_user_id = ${holderId}::uuid OR subject_user_id = ${shell}::uuid)
    `;
    expect(events.map((e) => e.type)).toEqual(['project.user_identity_linked']);
    expect(JSON.stringify(events[0].payload)).not.toContain(holderA.email.toLowerCase());
  });

  it('Owner links over REST, and the refusals answer 404 and 409', async () => {
    const shell = await createShell('E2E Link Shell B');
    const post = (userId: string, email: string) =>
      apiClient()
        .post(`/api/users/${userId}/link-identity`)
        .set('Authorization', owner.authHeader)
        .send({ scope: projectScope(), email });

    // Holder outside the organization: the same conflict set-email gives.
    const outside = await post(shell, outsider.email);
    expect(outside.status).toBe(409);

    // Holder already a member (holder A was linked above).
    const member = await post(shell, holderA.email);
    expect(member.status).toBe(409);

    // Not a member of the project: holder A's own id is a member, a random id is not.
    const notMember = await post('00000000-0000-4000-8000-000000000000', holderB.email);
    expect(notMember.status).toBe(404);

    expect(await liveMemberIds(projectId)).toContain(shell);

    const ok = await post(shell, holderB.email);
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect((ok.body as IdBody).data?.id).toBe(await userIdOf(holderB.email));
    expect(await liveMemberIds(projectId)).not.toContain(shell);
  });
});
