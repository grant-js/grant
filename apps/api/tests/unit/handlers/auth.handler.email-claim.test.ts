/**
 * Unit tests: claiming an unverified Email identity (for example one a CDM import created) on a
 * mailbox proof — an authoritative OAuth address, or an organization invitation's proof.
 */
import {
  AccountType,
  EmailVerificationProofType,
  OrganizationInvitationStatus,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthHandler } from '@/handlers/auth.handler';
import { hashSecret } from '@/lib/token.lib';

const PASSWORD = 'Xe9#mK2!vQ7z';
const EMAIL = 'imported@example.com';
const USER_ID = 'imported-user';
const METHOD_ID = 'imported-email-method';
const INVITATION_TOKEN = 'invitation-token';
const EMAIL_PROOF_TOKEN = 'email-proof-token';
const tx = {};

const mockWithTransaction = vi.fn((fn: (transaction: unknown) => Promise<unknown>) => fn(tx));

const mockUserAuthenticationMethods = {
  getUserAuthenticationMethodByProvider: vi.fn(),
  getUserAuthenticationMethodByEmail: vi.fn(),
  getUserAuthenticationMethods: vi.fn(),
  claimUnverifiedEmailMethod: vi.fn(),
  processProvider: vi.fn(),
  createUserAuthenticationMethod: vi.fn(),
  updateUserAuthenticationMethod: vi.fn(),
  ensureVerifiedContactEmail: vi.fn(),
};
const mockUsers = {
  createUser: vi.fn(),
  getUsers: vi.fn(),
  updateUser: vi.fn(),
  countHumanUsers: vi.fn(),
};
const mockAccounts = { createAccount: vi.fn() };
const mockAccountRoles = { seedAccountRoles: vi.fn() };
const mockUserRoles = { addUserRole: vi.fn() };
const mockUserMfa = { hasActiveMfaEnrollment: vi.fn() };
const mockUserSessions = { createSession: vi.fn() };
const mockOrganizationInvitations = { getInvitationByToken: vi.fn() };
const mockCredentials = { setPassword: vi.fn(), verifyPassword: vi.fn() };
const mockCache = { get: vi.fn(), set: vi.fn(), delete: vi.fn(), clear: vi.fn() };

function createHandler(): AuthHandler {
  return new AuthHandler(
    mockUserAuthenticationMethods as never,
    mockUsers as never,
    mockAccounts as never,
    mockAccountRoles as never,
    mockUserRoles as never,
    mockUserMfa as never,
    mockUserSessions as never,
    { sendOtp: vi.fn() } as never,
    { getAuth: vi.fn() } as never,
    mockOrganizationInvitations as never,
    mockCredentials as never,
    {
      recordFailure: vi.fn(async () => ({ failedAttempts: 1, lockedUntil: null, locked: false })),
      reset: vi.fn(async () => undefined),
    } as never,
    mockCache as never,
    {} as never,
    { withTransaction: mockWithTransaction } as never,
    {} as never
  );
}

function importedEmailMethod(overrides: Record<string, unknown> = {}) {
  return {
    id: METHOD_ID,
    userId: USER_ID,
    provider: UserAuthenticationMethodProvider.Email,
    providerId: EMAIL,
    providerData: {},
    isVerified: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function githubMethod() {
  return {
    id: 'github-method',
    userId: USER_ID,
    provider: UserAuthenticationMethodProvider.Github,
    providerId: '42',
    isVerified: true,
  };
}

function givenIdentity(methods: Record<string, unknown>[] = [importedEmailMethod()]) {
  mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(methods[0]);
  mockUserAuthenticationMethods.getUserAuthenticationMethods.mockResolvedValue(methods);
}

function invitationProof() {
  return {
    type: EmailVerificationProofType.OrganizationInvitation,
    token: INVITATION_TOKEN,
    emailProofToken: EMAIL_PROOF_TOKEN,
  };
}

describe('AuthHandler: claiming an unverified Email identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation((fn: (transaction: unknown) => Promise<unknown>) =>
      fn(tx)
    );
    givenIdentity();
    mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(false);
    mockUserAuthenticationMethods.claimUnverifiedEmailMethod.mockResolvedValue(
      importedEmailMethod({ isVerified: true })
    );
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { githubId: '42' },
      isVerified: true,
      name: 'Imported',
      password: PASSWORD,
    });
    mockUserAuthenticationMethods.createUserAuthenticationMethod.mockResolvedValue({
      id: 'new-method',
    });
    mockUsers.getUsers.mockResolvedValue({
      totalCount: 1,
      users: [{ id: USER_ID, accounts: [{ id: 'account-1', type: AccountType.Organization }] }],
    });
    mockUserSessions.createSession.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    mockAccountRoles.seedAccountRoles.mockResolvedValue([]);
    mockAccounts.createAccount.mockResolvedValue({ id: 'account-new', type: AccountType.Personal });
    mockOrganizationInvitations.getInvitationByToken.mockResolvedValue({
      id: 'invitation-1',
      email: EMAIL,
      status: OrganizationInvitationStatus.Pending,
      expiresAt: new Date(Date.now() + 60_000),
      emailVerificationProofTokenHash: hashSecret(EMAIL_PROOF_TOKEN),
    });
  });

  describe('console OAuth link (linkOAuthAuthToExistingUser with claimEmail)', () => {
    function link(claimEmail: string | null = EMAIL) {
      return createHandler().linkOAuthAuthToExistingUser({
        userId: USER_ID,
        provider: UserAuthenticationMethodProvider.Github,
        providerId: '42',
        providerData: { githubId: '42' },
        ...(claimEmail ? { claimEmail } : {}),
      });
    }

    it('claims the identity before linking the provider and signing in', async () => {
      const result = await link();

      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).toHaveBeenCalledWith(
        { methodId: METHOD_ID, proof: 'github' },
        tx
      );
      const claimOrder =
        mockUserAuthenticationMethods.claimUnverifiedEmailMethod.mock.invocationCallOrder[0];
      expect(claimOrder).toBeLessThan(
        mockUserAuthenticationMethods.createUserAuthenticationMethod.mock.invocationCallOrder[0]!
      );
      expect(claimOrder).toBeLessThan(mockUserSessions.createSession.mock.invocationCallOrder[0]!);
      expect(result.requiresEmailVerification).toBe(false);
    });

    it('does not claim on a plain link (connect, or an already verified address)', async () => {
      await link(null);
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
    });

    it('refuses when the user can already sign in another way', async () => {
      givenIdentity([importedEmailMethod(), githubMethod()]);

      await expect(link()).rejects.toThrow('Email is not verified');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
      expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).not.toHaveBeenCalled();
      expect(mockUserSessions.createSession).not.toHaveBeenCalled();
    });

    it('refuses when the user has an MFA factor enrolled', async () => {
      mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(true);

      await expect(link()).rejects.toThrow('Email is not verified');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
    });

    it('refuses when the stored address only matches as a pattern', async () => {
      givenIdentity([importedEmailMethod({ providerId: 'imp0rted@example.com' })]);

      await expect(link('imp_rted@example.com')).rejects.toThrow('Email is not verified');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
    });

    it('refuses when the address belongs to another user than the one linked', async () => {
      givenIdentity([importedEmailMethod({ userId: 'someone-else' })]);

      await expect(link()).rejects.toThrow('Email is not verified');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
    });

    it('refuses when the address was verified meanwhile', async () => {
      givenIdentity([importedEmailMethod({ isVerified: true })]);

      await expect(link()).rejects.toThrow('Email is not verified');
    });
  });

  describe('project OAuth (resolveUserIdFromOAuthForProject)', () => {
    function resolve(emailAuthoritative: boolean | undefined) {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      return createHandler().resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: EMAIL,
          emailVerified: true,
          ...(emailAuthoritative === undefined ? {} : { emailAuthoritative }),
          name: 'Imported',
          providerData: { googleId: 'google-sub-1' },
        },
        tx as never
      );
    }

    it('claims and links an imported identity when Google is authoritative', async () => {
      await expect(resolve(true)).resolves.toBe(USER_ID);

      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).toHaveBeenCalledWith(
        { methodId: METHOD_ID, proof: 'google' },
        tx
      );
      expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          provider: UserAuthenticationMethodProvider.Google,
        }),
        tx
      );
      expect(mockUsers.createUser).not.toHaveBeenCalled();
    });

    it.each([false, undefined])(
      'refuses as before when the provider is not authoritative (%s)',
      async (emailAuthoritative) => {
        await expect(resolve(emailAuthoritative)).rejects.toThrow('Email is not verified');
        expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
        expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).not.toHaveBeenCalled();
      }
    );

    it('refuses when the user can already sign in another way', async () => {
      givenIdentity([importedEmailMethod(), githubMethod()]);

      await expect(resolve(true)).rejects.toThrow('Email is not verified');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
    });
  });

  describe('register with an organization invitation proof', () => {
    function register(withProof = true) {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(
        importedEmailMethod()
      );
      return createHandler().register({
        type: AccountType.Organization,
        provider: UserAuthenticationMethodProvider.Email,
        providerId: EMAIL,
        providerData: { password: PASSWORD },
        ...(withProof ? { emailVerificationProof: invitationProof() } : {}),
      });
    }

    it('claims the imported identity, sets the platform password and signs in', async () => {
      mockUsers.getUsers.mockResolvedValue({
        totalCount: 1,
        users: [{ id: USER_ID, accounts: [] }],
      });
      mockAccounts.createAccount.mockResolvedValue({
        id: 'account-new',
        type: AccountType.Organization,
      });

      const result = await register();

      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).toHaveBeenCalledWith(
        { methodId: METHOD_ID, proof: 'organization-invitation' },
        tx
      );
      expect(mockCredentials.setPassword).toHaveBeenCalledWith(
        { scope: { scope: 'platform' }, userId: USER_ID, password: PASSWORD, source: 'register' },
        tx
      );
      expect(
        mockUserAuthenticationMethods.claimUnverifiedEmailMethod.mock.invocationCallOrder[0]
      ).toBeLessThan(mockCredentials.setPassword.mock.invocationCallOrder[0]!);
      expect(mockAccounts.createAccount).toHaveBeenCalledWith(
        { type: AccountType.Organization, ownerId: USER_ID },
        tx
      );
      expect(mockUserSessions.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          userAuthenticationMethodId: METHOD_ID,
          isVerified: true,
        }),
        tx,
        undefined
      );
      expect(mockUsers.createUser).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        account: { id: 'account-new' },
        requiresEmailVerification: false,
        verificationExpiry: null,
        email: EMAIL,
      });
    });

    it('reuses an account the user already has', async () => {
      const result = await register();

      expect(mockAccounts.createAccount).not.toHaveBeenCalled();
      expect(result.account).toMatchObject({ id: 'account-1' });
    });

    it('keeps refusing without a proof', async () => {
      await expect(register(false)).rejects.toThrow('An account with this email already exists');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
      expect(mockCredentials.setPassword).not.toHaveBeenCalled();
    });

    it('keeps refusing when the user can already sign in another way', async () => {
      givenIdentity([importedEmailMethod(), githubMethod()]);

      await expect(register()).rejects.toThrow('An account with this email already exists');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
      expect(mockCredentials.setPassword).not.toHaveBeenCalled();
    });

    it('keeps refusing a verified address', async () => {
      givenIdentity([importedEmailMethod({ isVerified: true })]);

      await expect(register()).rejects.toThrow('An account with this email already exists');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
    });

    it('rejects a proof for another address', async () => {
      mockOrganizationInvitations.getInvitationByToken.mockResolvedValue({
        id: 'invitation-1',
        email: 'someone-else@example.com',
        status: OrganizationInvitationStatus.Pending,
        expiresAt: new Date(Date.now() + 60_000),
        emailVerificationProofTokenHash: hashSecret(EMAIL_PROOF_TOKEN),
      });

      await expect(register()).rejects.toThrow('Invitation proof does not match email address');
      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).not.toHaveBeenCalled();
    });
  });

  /**
   * A claim hands the identity to the person, so they take the name a first-time sign-up
   * through the same path gets: the provider's profile name for Google or GitHub, the address
   * before `@` for an e-mail registration. The name an import gave them stays in each project's
   * display name and is not touched here.
   */
  describe('the claimed user takes the name a first-time sign-up would get', () => {
    function givenGlobalName(name: string) {
      mockUsers.getUsers.mockResolvedValue({
        totalCount: 1,
        users: [
          { id: USER_ID, name, accounts: [{ id: 'account-1', type: AccountType.Organization }] },
        ],
      });
    }
    function givenSignUpName(name: string) {
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: { githubId: '42' },
        isVerified: true,
        name,
        password: PASSWORD,
      });
    }
    function consoleLink(claimEmail: string | null = EMAIL) {
      return createHandler().linkOAuthAuthToExistingUser({
        userId: USER_ID,
        provider: UserAuthenticationMethodProvider.Github,
        providerId: '42',
        providerData: { githubId: '42' },
        ...(claimEmail ? { claimEmail } : {}),
      });
    }

    it('console GitHub/Google claim: the provider profile name, after the claim', async () => {
      givenGlobalName('Name From The Import');
      givenSignUpName('Ada From GitHub');

      await consoleLink();

      expect(mockUsers.updateUser).toHaveBeenCalledTimes(1);
      expect(mockUsers.updateUser).toHaveBeenCalledWith(USER_ID, { name: 'Ada From GitHub' }, tx);
      expect(
        mockUserAuthenticationMethods.claimUnverifiedEmailMethod.mock.invocationCallOrder[0]
      ).toBeLessThan(mockUsers.updateUser.mock.invocationCallOrder[0]!);
    });

    it('project-app OAuth claim: the name a first-time project sign-up gets', async () => {
      givenGlobalName('Name From The Import');
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);

      await createHandler().resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: EMAIL,
          emailVerified: true,
          emailAuthoritative: true,
          name: 'Ada From Google',
          providerData: { googleId: 'google-sub-1' },
        },
        tx as never
      );

      expect(mockUsers.updateUser).toHaveBeenCalledWith(USER_ID, { name: 'Ada From Google' }, tx);
    });

    it('register with an invitation proof: the name an e-mail registration gets', async () => {
      givenGlobalName('Name From The Import');
      givenSignUpName('imported');
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(
        importedEmailMethod()
      );

      await createHandler().register({
        type: AccountType.Organization,
        provider: UserAuthenticationMethodProvider.Email,
        providerId: EMAIL,
        providerData: { password: PASSWORD },
        emailVerificationProof: invitationProof(),
      });

      expect(mockUsers.updateUser).toHaveBeenCalledWith(USER_ID, { name: 'imported' }, tx);
    });

    it('writes nothing when the user already has that name', async () => {
      givenGlobalName('Ada From GitHub');
      givenSignUpName('Ada From GitHub');

      await consoleLink();

      expect(mockUserAuthenticationMethods.claimUnverifiedEmailMethod).toHaveBeenCalled();
      expect(mockUsers.updateUser).not.toHaveBeenCalled();
    });

    it('never renames on a plain link, a later sign-in or connect (no claim)', async () => {
      givenGlobalName('Their Own Name');
      givenSignUpName('Ada From GitHub');

      await consoleLink(null);

      expect(mockUsers.updateUser).not.toHaveBeenCalled();
    });

    it('never renames when the claim is refused', async () => {
      givenGlobalName('Their Own Name');
      givenSignUpName('Ada From GitHub');
      givenIdentity([importedEmailMethod(), githubMethod()]);

      await expect(consoleLink()).rejects.toThrow('Email is not verified');
      expect(mockUsers.updateUser).not.toHaveBeenCalled();
    });
  });
});
