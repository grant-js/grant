/**
 * MFA journeys against the real E2E stack: TOTP enrollment (REST), org MFA policy (GraphQL),
 * recovery-code step-up, and invalid-code rejection. Rate limiting is disabled in compose.
 */
import { AUTH_REFRESH_TOKEN_KEY } from '@grantjs/constants';
import { generateSync } from 'otplib';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

function totpCode(secret: string): string {
  return generateSync({ secret, period: 30 });
}

/** Decode JWT payload (middle segment) without verification — E2E only. */
function decodeJwtPayload(accessToken: string): {
  mfaVerified?: boolean;
  acr?: string;
  amr?: string[];
  mfa_auth_time?: number;
} {
  const parts = accessToken.split('.');
  const json = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(json) as {
    mfaVerified?: boolean;
    acr?: string;
    amr?: string[];
    mfa_auth_time?: number;
  };
}

const M_CREATE_ENROLLMENT = /* GraphQL */ `
  mutation CreateMyMfaEnrollment {
    createMyMfaEnrollment {
      factorId
      secret
      otpAuthUrl
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

const M_MY_MFA_DEVICES = /* GraphQL */ `
  query MyMfaDevices {
    myMfaDevices {
      id
      isPrimary
      isEnabled
    }
  }
`;

const M_GENERATE_RECOVERY = /* GraphQL */ `
  mutation GenerateMyMfaRecoveryCodes($input: GenerateMyMfaRecoveryCodesInput) {
    generateMyMfaRecoveryCodes(input: $input)
  }
`;

const M_UPDATE_ORG = /* GraphQL */ `
  mutation UpdateOrganization($id: ID!, $input: UpdateOrganizationInput!) {
    updateOrganization(id: $id, input: $input) {
      id
      name
      requireMfaForSensitiveActions
    }
  }
`;

afterAll(async () => {
  await closeDbHelper();
});

describe('E2E: MFA (TOTP, org policy, recovery)', () => {
  it('enrolls TOTP via REST setup + verify and lists enabled device', async () => {
    const user = await TestUser.create();

    const setup = await apiClient()
      .post('/api/auth/mfa/setup')
      .set('Authorization', user.authHeader)
      .expect(200);

    expect(setup.body.success).toBe(true);
    const secret = setup.body.data.secret as string;
    expect(secret.length).toBeGreaterThan(10);

    const verify = await apiClient()
      .post('/api/auth/mfa/verify')
      .set('Authorization', user.authHeader)
      .send({ code: totpCode(secret) })
      .expect(200);

    expect(verify.body.data.mfaVerified).toBe(true);
    user.accessToken = verify.body.data.accessToken;
    user.refreshToken = verify.body.data.refreshToken;

    const devices = await graphqlRequest<{ myMfaDevices: { id: string; isEnabled: boolean }[] }>({
      query: M_MY_MFA_DEVICES,
      accessToken: user.accessToken,
    });
    expect(devices.status).toBe(200);
    expect(devices.body.errors).toBeUndefined();
    const enabled = devices.body.data?.myMfaDevices?.filter((d) => d.isEnabled) ?? [];
    expect(enabled.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/auth/refresh returns an AAL2 access token after MFA verify (mfaVerifiedAt persisted)', async () => {
    const user = await TestUser.create();

    const setup = await apiClient()
      .post('/api/auth/mfa/setup')
      .set('Authorization', user.authHeader)
      .expect(200);
    const secret = setup.body.data.secret as string;

    const verify = await apiClient()
      .post('/api/auth/mfa/verify')
      .set('Authorization', user.authHeader)
      .send({ code: totpCode(secret) })
      .expect(200);

    expect(verify.body.data.mfaVerified).toBe(true);
    const refreshToken = verify.body.data.refreshToken as string;
    expect(refreshToken).toBeTruthy();

    const immediate = decodeJwtPayload(verify.body.data.accessToken as string);
    expect(immediate.mfaVerified).toBe(true);
    expect(immediate.acr).toBe('aal2');
    expect(immediate.amr).toEqual(['pwd', 'otp']);

    const refreshed = await apiClient()
      .post('/api/auth/refresh')
      .set('Cookie', `${AUTH_REFRESH_TOKEN_KEY}=${encodeURIComponent(refreshToken)}`)
      .expect(200);

    const newAccess = refreshed.body.data.accessToken as string;
    expect(newAccess).toBeTruthy();
    const afterRefresh = decodeJwtPayload(newAccess);
    expect(afterRefresh.mfaVerified).toBe(true);
    expect(afterRefresh.acr).toBe('aal2');
    expect(afterRefresh.amr).toEqual(['pwd', 'otp']);
    expect(typeof afterRefresh.mfa_auth_time).toBe('number');
  });

  it('rejects invalid TOTP on POST /api/auth/mfa/verify', async () => {
    const user = await TestUser.create();

    const setup = await apiClient()
      .post('/api/auth/mfa/setup')
      .set('Authorization', user.authHeader)
      .expect(200);
    const secret = setup.body.data.secret as string;

    const bad = await apiClient()
      .post('/api/auth/mfa/verify')
      .set('Authorization', user.authHeader)
      .send({ code: '000000' });

    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('UNAUTHENTICATED');

    const good = await apiClient()
      .post('/api/auth/mfa/verify')
      .set('Authorization', user.authHeader)
      .send({ code: totpCode(secret) })
      .expect(200);
    expect(good.body.data.mfaVerified).toBe(true);
  });

  it('recovery code verifies and satisfies org MFA guard for updateOrganization', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization(`MFA Org ${Date.now()}`);

    const enableMfa = await graphqlRequest({
      query: M_UPDATE_ORG,
      variables: {
        id: org.id,
        input: {
          scope: { tenant: 'organization', id: org.id },
          requireMfaForSensitiveActions: true,
        },
      },
      accessToken: owner.accessToken,
    });
    expect(enableMfa.status).toBe(200);
    expect(enableMfa.body.errors).toBeUndefined();

    const enroll = await graphqlRequest<{
      createMyMfaEnrollment: { factorId: string; secret: string };
    }>({
      query: M_CREATE_ENROLLMENT,
      accessToken: owner.accessToken,
    });
    expect(enroll.body.errors).toBeUndefined();
    const secret = enroll.body.data!.createMyMfaEnrollment.secret;

    const verified = await graphqlRequest<{ verifyMyMfaEnrollment: { success: boolean } }>({
      query: M_VERIFY_ENROLLMENT,
      variables: { input: { code: totpCode(secret) } },
      accessToken: owner.accessToken,
    });
    expect(verified.body.errors).toBeUndefined();
    expect(verified.body.data?.verifyMyMfaEnrollment?.success).toBe(true);

    const codesRes = await graphqlRequest<{ generateMyMfaRecoveryCodes: string[] }>({
      query: M_GENERATE_RECOVERY,
      variables: { input: {} },
      accessToken: owner.accessToken,
    });
    expect(codesRes.body.errors).toBeUndefined();
    const recoveryCode = codesRes.body.data!.generateMyMfaRecoveryCodes[0];
    expect(recoveryCode).toBeDefined();

    const blocked = await graphqlRequest({
      query: M_UPDATE_ORG,
      variables: {
        id: org.id,
        input: {
          scope: { tenant: 'organization', id: org.id },
          name: `Blocked ${Date.now()}`,
        },
      },
      accessToken: owner.accessToken,
    });
    expect(blocked.body.errors?.length).toBeGreaterThan(0);
    expect(blocked.body.errors?.[0]?.extensions?.reason).toBe('MFA_REQUIRED');

    const recovery = await apiClient()
      .post('/api/auth/mfa/recovery/verify')
      .set('Authorization', owner.authHeader)
      .send({ code: recoveryCode })
      .expect(200);
    owner.accessToken = recovery.body.data.accessToken;
    owner.refreshToken = recovery.body.data.refreshToken;

    const allowed = await graphqlRequest<{ updateOrganization: { name: string } }>({
      query: M_UPDATE_ORG,
      variables: {
        id: org.id,
        input: {
          scope: { tenant: 'organization', id: org.id },
          name: `Allowed ${Date.now()}`,
        },
      },
      accessToken: owner.accessToken,
    });
    expect(allowed.body.errors).toBeUndefined();
    expect(allowed.body.data?.updateOrganization?.name).toMatch(/^Allowed /);
  });
});
