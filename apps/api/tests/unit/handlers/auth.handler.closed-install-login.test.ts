/**
 * Login on a closed install (`AUTH_PUBLIC_SIGNUP_ENABLED=false`).
 *
 * Registration is gated by `assertPlatformSelfSignupAllowed`; login used to give any
 * identity without an account a Personal account on its first platform login, so CDM
 * imports and project-app users could enter the console that registration keeps shut.
 * Login now follows the same policy and, when it refuses, still signs the user in --
 * account-less, reaching only user-scoped settings.
 */
import {
  AccountType,
  EmailVerificationProofType,
  OrganizationInvitationStatus,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashSecret } from '@/lib/token.lib';

const { mockAuthCfg } = vi.hoisted(() => ({
  mockAuthCfg: { publicSignupEnabled: true, minAalAtLogin: 'aal1' as 'aal1' | 'aal2' },
}));

vi.mock('@/config', () => ({
  config: {
    auth: mockAuthCfg,
    app: { url: 'http://localhost:4000', isDevelopment: false },
    i18n: { defaultLocale: 'en' as const },
    logging: { level: 'silent', prettyPrint: false },
    token: { bcryptRounds: 4 },
  },
}));

vi.mock('@/i18n/helpers', () => ({ translateStatic: (key: string) => key }));

const { AuthHandler } = await import('@/handlers/auth.handler');

const PASSWORD = 'Xe9#mK2!vQ7z';
const NEW_PASSWORD = 'Zr4$pL8@wN3c';
const EMAIL = 'imported@example.com';
const INVITATION_TOKEN = 'invitation-token';
const EMAIL_PROOF_TOKEN = 'email-proof-token';
const USER_ID = 'user-1';
const tx = {};

const mockWithTransaction = vi.fn((fn: (transaction: unknown) => Promise<unknown>) => fn(tx));

const mockUserAuthenticationMethods = {
  getUserAuthenticationMethodByProvider: vi.fn(),
  getUserAuthenticationMethodByEmail: vi.fn(),
  processProvider: vi.fn(),
  createUserAuthenticationMethod: vi.fn(),
  updateUserAuthenticationMethod: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  invalidateAllUserSessions: vi.fn(),
  ensureVerifiedContactEmail: vi.fn(),
};
const mockUsers = { getUsers: vi.fn(), countHumanUsers: vi.fn(), updateUser: vi.fn() };
const mockAccounts = { createAccount: vi.fn() };
const mockAccountRoles = { seedAccountRoles: vi.fn() };
const mockUserRoles = { addUserRole: vi.fn() };
const mockUserMfa = { hasActiveMfaEnrollment: vi.fn() };
const mockUserSessions = {
  createSession: vi.fn(),
  getUserSessions: vi.fn(),
  refreshSessionLastUsed: vi.fn(),
  signSession: vi.fn(),
};
const mockEmail = { sendOtp: vi.fn(), sendPasswordReset: vi.fn() };
const mockOrganizationInvitations = { getInvitationByToken: vi.fn() };
const mockOrganizationUsers = { getUserOrganizationMemberships: vi.fn() };
const mockCache = { get: vi.fn(), set: vi.fn(), delete: vi.fn(), clear: vi.fn() };

function createHandler() {
  return new AuthHandler(
    mockUserAuthenticationMethods as never,
    mockUsers as never,
    mockAccounts as never,
    mockAccountRoles as never,
    mockUserRoles as never,
    mockUserMfa as never,
    mockUserSessions as never,
    mockEmail as never,
    { getAuth: vi.fn(), isPersonalScope: vi.fn() } as never,
    mockOrganizationInvitations as never,
    mockCache as never,
    {} as never,
    { withTransaction: mockWithTransaction } as never,
    {
      getUserOrganizationMemberships: mockOrganizationUsers.getUserOrganizationMemberships,
    } as never
  );
}

const PERSONAL = { id: 'account-1', type: AccountType.Personal };

type Method = {
  provider: UserAuthenticationMethodProvider;
  providerId: string;
  providerData: Record<string, unknown>;
};

const METHODS: Array<[string, Method]> = [
  [
    'password',
    {
      provider: UserAuthenticationMethodProvider.Email,
      providerId: EMAIL,
      providerData: { password: PASSWORD },
    },
  ],
  [
    'GitHub',
    {
      provider: UserAuthenticationMethodProvider.Github,
      providerId: 'gh-42',
      providerData: { login: 'ada' },
    },
  ],
  [
    'Google',
    {
      provider: UserAuthenticationMethodProvider.Google,
      providerId: 'google-42',
      providerData: { email: EMAIL, emailVerified: true },
    },
  ],
];

/** An identity that exists but has never used the console. */
function stubExistingIdentity(method: Method, accounts: unknown[]) {
  mockUserAuthenticationMethods.processProvider.mockResolvedValue({
    providerData: method.providerData,
    isVerified: true,
    name: 'Imported',
  });
  mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
    id: 'auth-method-1',
    userId: USER_ID,
    isVerified: true,
    createdAt: new Date(),
    providerData: { hashedPassword: hashSecret(PASSWORD) },
  });
  mockUsers.getUsers.mockResolvedValue({ totalCount: 1, users: [{ id: USER_ID, accounts }] });
}

function login(method: Method, extra: Record<string, unknown> = {}) {
  return createHandler().login({ input: { ...method, ...extra } });
}

function pendingInvitation() {
  return {
    id: 'invitation-1',
    email: EMAIL,
    status: OrganizationInvitationStatus.Pending,
    expiresAt: new Date(Date.now() + 60_000),
    emailVerificationProofTokenHash: hashSecret(EMAIL_PROOF_TOKEN),
  };
}

const invitationProof = {
  type: EmailVerificationProofType.OrganizationInvitation,
  token: INVITATION_TOKEN,
  emailProofToken: EMAIL_PROOF_TOKEN,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthCfg.publicSignupEnabled = true;
  mockWithTransaction.mockImplementation((fn: (transaction: unknown) => Promise<unknown>) =>
    fn(tx)
  );
  mockAccounts.createAccount.mockResolvedValue(PERSONAL);
  mockAccountRoles.seedAccountRoles.mockResolvedValue([]);
  mockUserRoles.addUserRole.mockResolvedValue({});
  mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(false);
  mockUserSessions.getUserSessions.mockResolvedValue({ userSessions: [] });
  mockUserSessions.createSession.mockResolvedValue({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  });
  mockOrganizationInvitations.getInvitationByToken.mockResolvedValue(pendingInvitation());
  mockOrganizationUsers.getUserOrganizationMemberships.mockResolvedValue([]);
});

describe.each(METHODS)('login by %s of an identity with no account', (_label, method) => {
  it('closed install: signs the user in without creating an account', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(2500);
    stubExistingIdentity(method, []);

    const result = await login(method);

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.accounts).toEqual([]);
    expect(mockOrganizationUsers.getUserOrganizationMemberships).toHaveBeenCalledWith(USER_ID, tx);
    expect(mockAccounts.createAccount).not.toHaveBeenCalled();
    expect(mockAccountRoles.seedAccountRoles).not.toHaveBeenCalled();
    expect(mockUserRoles.addUserRole).not.toHaveBeenCalled();
    expect(mockUserSessions.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
      tx,
      undefined
    );
  });

  it('open install: creates the Personal account on first login (unchanged)', async () => {
    mockAuthCfg.publicSignupEnabled = true;
    stubExistingIdentity(method, []);
    mockUsers.getUsers
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [] }] })
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [PERSONAL] }] });

    const result = await login(method);

    expect(mockUsers.countHumanUsers).not.toHaveBeenCalled();
    expect(mockAccounts.createAccount).toHaveBeenCalledWith(
      { type: AccountType.Personal, ownerId: USER_ID },
      tx
    );
    expect(mockAccountRoles.seedAccountRoles).toHaveBeenCalledWith(PERSONAL.id, tx);
    expect(result.accounts).toEqual([PERSONAL]);
  });

  it('closed install, bootstrap (no human users): creates the Personal account', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(0);
    stubExistingIdentity(method, []);
    mockUsers.getUsers
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [] }] })
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [PERSONAL] }] });

    const result = await login(method);

    expect(mockAccounts.createAccount).toHaveBeenCalledTimes(1);
    expect(result.accounts).toEqual([PERSONAL]);
  });

  it('closed install, user who already has an account: unchanged and no policy lookup', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    stubExistingIdentity(method, [PERSONAL]);

    const result = await login(method);

    expect(mockUsers.countHumanUsers).not.toHaveBeenCalled();
    expect(mockAccounts.createAccount).not.toHaveBeenCalled();
    expect(result.accounts).toEqual([PERSONAL]);
  });

  it('closed install: a reused session is still account-less and creates nothing', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(10);
    stubExistingIdentity(method, []);
    mockUserSessions.getUserSessions.mockResolvedValue({
      userSessions: [{ id: 'session-1', mfaVerifiedAt: null }],
    });
    mockUserSessions.signSession.mockResolvedValue({
      accessToken: 'reused-access',
      refreshToken: 'reused-refresh',
    });

    const result = await login(method);

    expect(result.accessToken).toBe('reused-access');
    expect(result.accounts).toEqual([]);
    expect(mockAccounts.createAccount).not.toHaveBeenCalled();
  });
});

const MEMBERSHIP = [
  { organizationId: 'org-1', organizationName: 'Acme', role: 'Member', joinedAt: new Date() },
];

describe.each(METHODS)(
  'login by %s of an organization member who has no account, closed install',
  (_label, method) => {
    it('creates the Personal account, as before: an administrator admitted them', async () => {
      mockAuthCfg.publicSignupEnabled = false;
      mockUsers.countHumanUsers.mockResolvedValue(2500);
      mockOrganizationUsers.getUserOrganizationMemberships.mockResolvedValue(MEMBERSHIP);
      stubExistingIdentity(method, []);
      mockUsers.getUsers
        .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [] }] })
        .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [PERSONAL] }] });

      const result = await login(method);

      expect(mockOrganizationUsers.getUserOrganizationMemberships).toHaveBeenCalledWith(
        USER_ID,
        tx
      );
      expect(mockAccounts.createAccount).toHaveBeenCalledWith(
        { type: AccountType.Personal, ownerId: USER_ID },
        tx
      );
      expect(result.accounts).toEqual([PERSONAL]);
    });

    it('open install: no membership lookup is needed', async () => {
      mockAuthCfg.publicSignupEnabled = true;
      stubExistingIdentity(method, []);
      mockUsers.getUsers
        .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [] }] })
        .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [PERSONAL] }] });

      await login(method);

      expect(mockOrganizationUsers.getUserOrganizationMemberships).not.toHaveBeenCalled();
    });
  }
);

describe('login with an organization invitation proof on a closed install', () => {
  const password = METHODS[0][1];

  it('creates the Personal account for an account-less identity with a valid proof', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    stubExistingIdentity(password, []);
    mockUsers.getUsers
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [] }] })
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [PERSONAL] }] });

    const result = await login(password, { emailVerificationProof: invitationProof });

    expect(mockUsers.countHumanUsers).not.toHaveBeenCalled();
    expect(mockAccounts.createAccount).toHaveBeenCalledTimes(1);
    expect(result.accounts).toEqual([PERSONAL]);
  });

  it('rejects a proof for a different email and creates nothing', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    stubExistingIdentity(password, []);
    mockOrganizationInvitations.getInvitationByToken.mockResolvedValue({
      ...pendingInvitation(),
      email: 'someone-else@example.com',
    });

    await expect(login(password, { emailVerificationProof: invitationProof })).rejects.toThrow(
      'Invitation proof does not match email address'
    );

    expect(mockAccounts.createAccount).not.toHaveBeenCalled();
    expect(mockUserSessions.createSession).not.toHaveBeenCalled();
  });

  it('rejects a proof presented with a social provider and creates nothing', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    const github = METHODS[1][1];
    stubExistingIdentity(github, []);

    await expect(login(github, { emailVerificationProof: invitationProof })).rejects.toThrow(
      'only supported for email authentication'
    );

    expect(mockAccounts.createAccount).not.toHaveBeenCalled();
  });
});

describe('forgot password -> reset -> login on a closed install', () => {
  it('leaves the user signed in without an account', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(2500);

    // A CDM-imported identity: Email method, no password, no account.
    const authMethod = {
      id: 'auth-method-1',
      userId: USER_ID,
      isVerified: false,
      createdAt: new Date(),
      providerData: {} as Record<string, unknown>,
    };
    mockUserAuthenticationMethods.requestPasswordReset.mockResolvedValue({
      token: 'reset-token',
      validUntil: Date.now() + 60_000,
    });
    mockUserAuthenticationMethods.resetPassword.mockImplementation(
      async (_token: string, newPassword: string) => {
        authMethod.providerData = { hashedPassword: hashSecret(newPassword) };
        return USER_ID;
      }
    );
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(
      authMethod
    );
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { password: NEW_PASSWORD },
      isVerified: false,
      name: 'Imported',
    });
    mockUsers.getUsers.mockResolvedValue({
      totalCount: 1,
      users: [{ id: USER_ID, accounts: [] }],
    });

    const handler = createHandler();
    await handler.requestPasswordReset(EMAIL);
    await handler.resetPassword('reset-token', NEW_PASSWORD);
    const result = await handler.login({
      input: {
        provider: UserAuthenticationMethodProvider.Email,
        providerId: EMAIL,
        providerData: { password: NEW_PASSWORD },
      },
    });

    expect(mockEmail.sendPasswordReset).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('access-token');
    expect(result.accounts).toEqual([]);
    expect(mockAccounts.createAccount).not.toHaveBeenCalled();
  });
});

describe('linkOAuthAuthToExistingUser for a user with no account', () => {
  const github = METHODS[1][1];

  function stubLink(accounts: unknown[]) {
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: github.providerData,
      isVerified: true,
      name: 'Imported',
    });
    mockUserAuthenticationMethods.createUserAuthenticationMethod.mockResolvedValue({
      id: 'auth-method-2',
    });
    mockUsers.getUsers.mockResolvedValue({ totalCount: 1, users: [{ id: USER_ID, accounts }] });
  }

  it('closed install: signs the user in without creating an account', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(2500);
    stubLink([]);

    const result = await createHandler().linkOAuthAuthToExistingUser({
      userId: USER_ID,
      provider: github.provider,
      providerId: github.providerId,
      providerData: github.providerData,
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.accounts).toEqual([]);
    expect(mockAccounts.createAccount).not.toHaveBeenCalled();
  });

  it('open install: creates the Personal account', async () => {
    mockAuthCfg.publicSignupEnabled = true;
    mockUsers.getUsers
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [] }] })
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [PERSONAL] }] });
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: github.providerData,
      isVerified: true,
      name: 'Imported',
    });
    mockUserAuthenticationMethods.createUserAuthenticationMethod.mockResolvedValue({
      id: 'auth-method-2',
    });

    const result = await createHandler().linkOAuthAuthToExistingUser({
      userId: USER_ID,
      provider: github.provider,
      providerId: github.providerId,
      providerData: github.providerData,
    });

    expect(mockAccounts.createAccount).toHaveBeenCalledTimes(1);
    expect(result.accounts).toEqual([PERSONAL]);
  });

  it('closed install: an organization member gets the Personal account', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(2500);
    mockOrganizationUsers.getUserOrganizationMemberships.mockResolvedValue(MEMBERSHIP);
    stubLink([]);
    mockUsers.getUsers
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [] }] })
      .mockResolvedValueOnce({ totalCount: 1, users: [{ id: USER_ID, accounts: [PERSONAL] }] });

    const result = await createHandler().linkOAuthAuthToExistingUser({
      userId: USER_ID,
      provider: github.provider,
      providerId: github.providerId,
      providerData: github.providerData,
    });

    expect(mockAccounts.createAccount).toHaveBeenCalledTimes(1);
    expect(result.accounts).toEqual([PERSONAL]);
  });

  it('closed install: a user who already has an account keeps it', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    stubLink([PERSONAL]);

    const result = await createHandler().linkOAuthAuthToExistingUser({
      userId: USER_ID,
      provider: github.provider,
      providerId: github.providerId,
      providerData: github.providerData,
    });

    expect(mockUsers.countHumanUsers).not.toHaveBeenCalled();
    expect(result.accounts).toEqual([PERSONAL]);
  });
});
