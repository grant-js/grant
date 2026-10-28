/**
 * E2E: API-key nested authenticationMethods read lock.
 *
 * OrganizationProject and AccountProject keys with User:Query (Owner and
 * Viewer via User Common) can request another member's
 * authenticationMethods { provider providerId isVerified } and receive the
 * Email mailbox. This is User:Query, not ProjectUserCommon or
 * UserAuthenticationMethod:Read. If keys cannot read nested methods, stop —
 * do not add ProjectUser.email.
 */
import {
  CreateApiKeyDocument,
  CreateUserDocument,
  Tenant,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, getOrganizationRoleIdByName } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const SENTINEL = 'sentinel-set-email@example.test';
const ACCOUNT_SENTINEL = 'sentinel-set-email-account@example.test';
const ROLE_OWNER = 'roles.names.organizationOwner';
const ROLE_VIEWER = 'roles.names.organizationViewer';

const USERS_AUTH_METHODS_QUERY = `
  query UsersAuthMethods($scope: Scope!, $ids: [ID!]) {
    users(scope: $scope, ids: $ids) {
      users {
        id
        authenticationMethods {
          provider
          providerId
          isVerified
        }
      }
    }
  }
`;

interface IdBody {
  data?: { id: string };
}

interface AuthMethod {
  provider: string;
  providerId: string;
  isVerified: boolean;
}

interface UsersAuthMethodsData {
  users?: {
    users?: Array<{
      id: string;
      authenticationMethods?: AuthMethod[] | null;
    }>;
  };
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Operator set-email nested read', () => {
  let owner: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let memberId: string;
  let uniqueStamp: string;
  let ownerRoleId: string;
  let viewerRoleId: string;

  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });

  const gql = <T>(
    token: string,
    document: Parameters<typeof print>[0],
    variables: Record<string, unknown>
  ) => graphqlRequest<T>({ query: print(document), accessToken: token, variables });

  async function createProjectUser(
    token: string,
    name: string,
    email: string,
    scope: { tenant: Tenant; id: string }
  ): Promise<string> {
    const res = await gql<{ createUser?: { id: string } }>(token, CreateUserDocument, {
      input: { name, email, scope },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const id = res.body.data?.createUser?.id;
    expect(id).toBeTruthy();
    return id!;
  }

  async function createKey(
    token: string,
    input: { name: string; scope: { tenant: Tenant; id: string }; roleId?: string }
  ): Promise<{ clientId: string; clientSecret: string }> {
    const res = await gql<{ createApiKey?: { clientId: string; clientSecret: string } }>(
      token,
      CreateApiKeyDocument,
      { input }
    );
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const key = res.body.data?.createApiKey;
    expect(key?.clientId && key.clientSecret).toBeTruthy();
    return key!;
  }

  async function exchangeKey(
    clientId: string,
    clientSecret: string,
    scope: { tenant: Tenant; id: string }
  ): Promise<string> {
    const res = await apiClient().post('/api/auth/token').send({ clientId, clientSecret, scope });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const token = (res.body as { data?: { accessToken?: string } }).data?.accessToken;
    expect(token).toBeTruthy();
    return token!;
  }

  async function assertMailboxVisible(
    token: string,
    scope: { tenant: Tenant; id: string },
    userId: string,
    address: string
  ): Promise<void> {
    const res = await graphqlRequest<UsersAuthMethodsData>({
      query: USERS_AUTH_METHODS_QUERY,
      accessToken: token,
      variables: { scope, ids: [userId] },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const users = res.body.data?.users?.users ?? [];
    const user = users.find((row) => row.id === userId);
    expect(user, 'member must be visible on the User:Query list').toBeTruthy();
    const methods = user?.authenticationMethods;
    expect(
      methods,
      'STOP: API-key User:Query did not return nested authenticationMethods. Do not add ProjectUser.email.'
    ).toEqual(expect.any(Array));
    expect(
      methods?.length,
      'STOP: nested authenticationMethods was empty. Do not add ProjectUser.email.'
    ).toBeGreaterThan(0);
    const email = methods?.find(
      (method) =>
        method.provider === UserAuthenticationMethodProvider.Email && method.providerId === address
    );
    expect(email, JSON.stringify(methods)).toMatchObject({
      provider: UserAuthenticationMethodProvider.Email,
      providerId: address,
      isVerified: false,
    });
  }

  it('Setup: org, project, member with sentinel email', async () => {
    uniqueStamp = `${Date.now()}`;
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Set Email Read Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Set Email Read Project');
    expect(projectRes.status).toBe(201);
    projectId = (projectRes.body as IdBody).data!.id;

    const ownerId = await getOrganizationRoleIdByName(org.id, ROLE_OWNER);
    const viewerId = await getOrganizationRoleIdByName(org.id, ROLE_VIEWER);
    expect(ownerId && viewerId).toBeTruthy();
    ownerRoleId = ownerId!;
    viewerRoleId = viewerId!;

    memberId = await createProjectUser(
      owner.accessToken,
      'E2E Set Email Read Member',
      SENTINEL,
      projectScope()
    );
  });

  it('OrganizationProject Owner API key reads another member mailbox under User:Query', async () => {
    const key = await createKey(owner.accessToken, {
      name: `E2E read owner key ${uniqueStamp}`,
      scope: projectScope(),
      roleId: ownerRoleId,
    });
    const token = await exchangeKey(key.clientId, key.clientSecret, projectScope());
    await assertMailboxVisible(token, projectScope(), memberId, SENTINEL);
  });

  it('OrganizationProject Viewer API key reads another member mailbox under User:Query', async () => {
    const key = await createKey(owner.accessToken, {
      name: `E2E read viewer key ${uniqueStamp}`,
      scope: projectScope(),
      roleId: viewerRoleId,
    });
    const token = await exchangeKey(key.clientId, key.clientSecret, projectScope());
    await assertMailboxVisible(token, projectScope(), memberId, SENTINEL);
  });

  it('AccountProject API key reads another member mailbox under User:Query', async () => {
    const personal = await TestUser.create();
    const projectRes = await apiClient()
      .post('/api/projects')
      .set('Authorization', personal.authHeader)
      .send({
        name: `E2E Set Email Read Account Project ${uniqueStamp}`,
        description: 'Account-project nested mailbox read',
        scope: { id: personal.accountId, tenant: Tenant.Account },
      });
    expect(projectRes.status, JSON.stringify(projectRes.body)).toBe(201);
    const accountProjectId = (projectRes.body as IdBody).data!.id;
    const accountScope = {
      tenant: Tenant.AccountProject,
      id: `${personal.accountId}:${accountProjectId}`,
    };
    const accountMemberId = await createProjectUser(
      personal.accessToken,
      'E2E Set Email Read Account Member',
      ACCOUNT_SENTINEL,
      accountScope
    );
    const key = await createKey(personal.accessToken, {
      name: `E2E read account key ${uniqueStamp}`,
      scope: accountScope,
    });
    const token = await exchangeKey(key.clientId, key.clientSecret, accountScope);
    await assertMailboxVisible(token, accountScope, accountMemberId, ACCOUNT_SENTINEL);
  });
});
