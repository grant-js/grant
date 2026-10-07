/**
 * Closed-install public surface on the shared e2e stack.
 *
 * The e2e API is fail-open (`ORIGIN_VERIFY_SECRET` unset, `AUTH_PUBLIC_SIGNUP_ENABLED`
 * default true) so existing register flows stay green. 403-without-header, second
 * platform self-signup, and last-human delete live in unit/integration tests that
 * toggle those flags. This file asserts the public policy fields, invitation
 * register, Project App allowSignUp, and that a non-last user can still delete.
 */
import { AuthSignupPolicyDocument, CreateProjectAppDocument } from '@grantjs/schema';
import { hashSync } from 'bcrypt';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import {
  closeDbHelper,
  getInvitationTokenForEmail,
  setInvitationEmailProofTokenHash,
} from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

describe('closed-install public policy (shared e2e stack)', () => {
  it('GET /health succeeds without an origin-verify header (fail-open default)', async () => {
    const res = await apiClient().get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/auth/providers includes publicSignupEnabled and bootstrapOpen', async () => {
    const res = await apiClient().get('/api/auth/providers').expect(200);

    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.publicSignupEnabled).toBe('boolean');
    expect(typeof res.body.data.bootstrapOpen).toBe('boolean');
    expect(res.body.data.publicSignupEnabled).toBe(true);
    expect(res.body.data.bootstrapOpen).toBe(false);
  });

  it('GraphQL authSignupPolicy matches the REST providers fields', async () => {
    const res = await graphqlRequest<{
      authSignupPolicy: { publicSignupEnabled: boolean; bootstrapOpen: boolean };
    }>({
      query: print(AuthSignupPolicyDocument),
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.authSignupPolicy.publicSignupEnabled).toBe(true);
    expect(res.body.data?.authSignupPolicy.bootstrapOpen).toBe(false);
  });

  it('organization invitation still registers a new user', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Closed-install Invite Org');
    const inviteeEmail = `e2e-closed-invite-${Date.now()}@test.grant.dev`;
    const inviteePassword = 'Rw4&jN8!pL3x';
    const emailProofToken = 'closed-install-email-proof';

    await owner.inviteMember(org.id, inviteeEmail);
    const invitationToken = await getInvitationTokenForEmail(inviteeEmail, org.id);
    expect(invitationToken).toBeTruthy();
    await setInvitationEmailProofTokenHash(invitationToken!, hashSync(emailProofToken, 10));

    const regRes = await apiClient()
      .post('/api/auth/register')
      .send({
        name: 'Closed Invitee',
        type: 'personal',
        provider: 'email',
        providerId: inviteeEmail,
        providerData: { password: inviteePassword },
        emailVerificationProof: {
          type: 'ORGANIZATION_INVITATION',
          token: invitationToken,
          emailProofToken,
        },
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.account.id).toBeTruthy();
  });

  it('Project App allowSignUp remains writable independently of platform signup', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Closed-install App Org');
    const projectRes = await owner.tryCreateProject(org.id, 'Closed-install App Project');
    expect(projectRes.status).toBe(201);
    const projectId = (projectRes.body as { data?: { id: string } }).data?.id;
    expect(projectId).toBeTruthy();

    const res = await graphqlRequest<{
      createProjectApp: { id: string; allowSignUp: boolean };
    }>({
      query: print(CreateProjectAppDocument),
      variables: {
        input: {
          scope: { tenant: 'organizationProject', id: `${org.id}:${projectId}` },
          name: 'Closed-install App',
          redirectUris: ['https://app.example.com/callback'],
          scopes: [],
          allowSignUp: false,
        },
      },
      accessToken: owner.accessToken,
    });

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.createProjectApp.allowSignUp).toBe(false);
  });

  it('a non-last human can still delete their account', async () => {
    const user = await TestUser.create();
    const res = await user.deleteAccount(false);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
