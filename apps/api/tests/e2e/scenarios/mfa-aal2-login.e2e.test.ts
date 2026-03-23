/**
 * When the API is started with `AUTH_MIN_AAL_AT_LOGIN=aal2`, login should advertise
 * `requiresMfaStepUp` for users with an enabled MFA factor until `/api/auth/mfa/verify`.
 *
 * This file is skipped unless the host sets `E2E_EXPECT_MIN_AAL_AT_LOGIN=aal2` (documented in
 * docs/contributing/testing.md). Default docker-compose.e2e uses `aal1`.
 */
import { generateSync } from 'otplib';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const M_CREATE_ENROLLMENT = /* GraphQL */ `
  mutation CreateMyMfaEnrollment {
    createMyMfaEnrollment {
      secret
    }
  }
`;

const M_VERIFY_ENROLLMENT = /* GraphQL */ `
  mutation VerifyMyMfaEnrollment($input: VerifyMyMfaEnrollmentInput!) {
    verifyMyMfaEnrollment(input: $input) {
      success
    }
  }
`;

afterAll(async () => {
  await closeDbHelper();
});

const expectAal2 = process.env.E2E_EXPECT_MIN_AAL_AT_LOGIN === 'aal2';

describe.skipIf(!expectAal2)('E2E: login MFA step-up (AUTH_MIN_AAL_AT_LOGIN=aal2)', () => {
  it('login returns requiresMfaStepUp then verify clears step-up', async () => {
    const user = await TestUser.create();

    const enroll = await graphqlRequest<{ createMyMfaEnrollment: { secret: string } }>({
      query: M_CREATE_ENROLLMENT,
      accessToken: user.accessToken,
    });
    expect(enroll.body.errors).toBeUndefined();
    const secret = enroll.body.data!.createMyMfaEnrollment.secret;

    const verifyEnroll = await graphqlRequest({
      query: M_VERIFY_ENROLLMENT,
      variables: { input: { code: generateSync({ secret, period: 30 }) } },
      accessToken: user.accessToken,
    });
    expect(verifyEnroll.body.errors).toBeUndefined();

    const loginRes = await apiClient()
      .post('/api/auth/login')
      .send({
        provider: 'email',
        providerId: user.email,
        providerData: { password: user.password },
      })
      .expect(200);

    expect(loginRes.body.data.requiresMfaStepUp).toBe(true);

    const freshToken = loginRes.body.data.accessToken as string;
    const verify = await apiClient()
      .post('/api/auth/mfa/verify')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ code: generateSync({ secret, period: 30 }) })
      .expect(200);

    expect(verify.body.data.mfaVerified).toBe(true);
  });
});
