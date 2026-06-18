import {
  AccountType,
  EmailVerificationProofType,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { register } from '@/graphql/resolvers/auth/mutations/register.resolver';

describe('register resolver', () => {
  it('passes invitation email verification proof to the auth handler', async () => {
    const authRegister = vi.fn().mockResolvedValue({
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
      requiresEmailVerification: false,
    });
    const setHeader = vi.fn();
    const proof = {
      type: EmailVerificationProofType.OrganizationInvitation,
      token: 'invitation-token',
      emailProofToken: 'email-proof-token',
    };
    const registerResolver = register as Extract<typeof register, (...args: never[]) => unknown>;

    await registerResolver(
      {},
      {
        input: {
          type: AccountType.Organization,
          provider: UserAuthenticationMethodProvider.Email,
          providerId: 'invitee@example.com',
          providerData: { password: 'secret' },
          emailVerificationProof: proof,
        },
      },
      {
        handlers: {
          auth: {
            register: authRegister,
          },
        },
        res: {
          cookie: vi.fn(),
          setHeader,
        },
        locale: 'en',
        userAgent: 'test',
        ipAddress: '127.0.0.1',
        requestLogger: { info: vi.fn() },
        requestBaseUrl: 'http://localhost:4001',
      } as never,
      {} as never
    );

    expect(authRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerificationProof: proof,
      }),
      'en',
      'test',
      '127.0.0.1',
      expect.anything(),
      'http://localhost:4001'
    );
  });
});
