/**
 * Unit tests: AuthHandler resolveUserIdFromGithubForProject and resolveUserIdFromEmailForProject
 * (project OAuth user resolution).
 */
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthHandler } from '@/handlers/auth.handler';

const mockWithTransaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({}));

const mockUserAuthenticationMethods = {
  ensureVerifiedContactEmail: vi.fn(),
  getUserAuthenticationMethodByProvider: vi.fn(),
  getUserAuthenticationMethodByEmail: vi.fn(),
  processProvider: vi.fn(),
  createUserAuthenticationMethod: vi.fn(),
  updateUserAuthenticationMethod: vi.fn(),
  resendVerificationEmail: vi.fn(),
  getUserAuthenticationMethod: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  invalidateAllUserSessions: vi.fn(),
};
const mockUsers = {
  createUser: vi.fn(),
  getUsers: vi.fn(),
  updateUser: vi.fn(),
  deleteOwnUser: vi.fn(),
};
const mockAccounts = { createAccount: vi.fn(), getOwnerAccounts: vi.fn(), deleteAccount: vi.fn() };
const mockAccountRoles = { seedAccountRoles: vi.fn() };
const mockUserRoles = { addUserRole: vi.fn(), getUserRoles: vi.fn() };
const mockUserMfa = { setupTotp: vi.fn(), verifyTotp: vi.fn() };
const mockUserSessions = { createSession: vi.fn() };
const mockEmail = {
  sendOtp: vi.fn(),
  sendPasswordReset: vi.fn(),
  sendInvitation: vi.fn(),
  sendProjectOAuthMagicLink: vi.fn(),
};
const mockAuth = { getAuth: vi.fn() };
const mockOrganizationInvitations = { getInvitationByToken: vi.fn() };
const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  oauth: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
};
const mockScopeServices = {};
const mockDb = { withTransaction: mockWithTransaction };

function createHandler(): AuthHandler {
  return new AuthHandler(
    mockUserAuthenticationMethods as never,
    mockUsers as never,
    mockAccounts as never,
    mockAccountRoles as never,
    mockUserRoles as never,
    mockUserMfa as never,
    mockUserSessions as never,
    mockEmail as never,
    mockAuth as never,
    mockOrganizationInvitations as never,
    mockCache as never,
    mockScopeServices as never,
    mockDb as never
  );
}

const tx = {};

describe('AuthHandler project OAuth resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(tx));
  });

  describe('resolveUserIdFromGithubForProject', () => {
    const githubUser = {
      id: 42,
      login: 'octocat',
      email: 'octocat@example.com',
      name: 'Octocat',
      avatar_url: 'https://avatars.github.com/42',
    };
    const providerId = '42';
    const providerData = { accessToken: 'gh-token', login: 'octocat' };

    it('returns existing userId when user is found by GitHub provider', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
        userId: 'existing-user-id',
      });
      const handler = createHandler();
      const userId = await handler.resolveUserIdFromGithubForProject(
        githubUser,
        providerId,
        providerData,
        tx as never
      );
      expect(userId).toBe('existing-user-id');
      expect(
        mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider
      ).toHaveBeenCalledWith(UserAuthenticationMethodProvider.Github, providerId, undefined, tx);
      expect(mockUsers.createUser).not.toHaveBeenCalled();
    });

    it('links GitHub to existing user found by email and returns userId', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
        userId: 'email-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: true,
      });
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: { normalized: true },
        isVerified: true,
      });
      const handler = createHandler();
      const userId = await handler.resolveUserIdFromGithubForProject(
        githubUser,
        providerId,
        providerData,
        tx as never
      );
      expect(userId).toBe('email-user-id');
      expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'email-user-id',
          provider: UserAuthenticationMethodProvider.Github,
          providerId,
        }),
        tx
      );
      expect(mockUsers.createUser).not.toHaveBeenCalled();
    });

    it('creates user and GitHub auth method when new', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: { normalized: true },
        isVerified: true,
      });
      mockUsers.createUser.mockResolvedValue({ id: 'new-user-id' });
      const handler = createHandler();
      const userId = await handler.resolveUserIdFromGithubForProject(
        githubUser,
        providerId,
        providerData,
        tx as never
      );
      expect(userId).toBe('new-user-id');
      expect(mockUsers.createUser).toHaveBeenCalledWith({ name: 'Octocat' }, tx);
      expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user-id',
          provider: UserAuthenticationMethodProvider.Github,
          providerId,
        }),
        tx
      );
    });

    it('creates a user with the GitHub avatar URL', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: { avatarUrl: 'https://avatars.githubusercontent.com/u/42?v=4' },
        isVerified: true,
      });
      mockUsers.createUser.mockResolvedValue({ id: 'new-user-id' });
      const handler = createHandler();
      await handler.resolveUserIdFromGithubForProject(
        githubUser,
        providerId,
        { ...providerData, avatarUrl: 'https://avatars.githubusercontent.com/u/42?v=4' },
        tx as never
      );
      expect(mockUsers.createUser).toHaveBeenCalledWith(
        { name: 'Octocat', pictureUrl: 'https://avatars.githubusercontent.com/u/42?v=4' },
        tx
      );
    });

    it('refuses to link or register when the matching email method is unverified', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
        userId: 'email-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: false,
      });
      const handler = createHandler();
      await expect(
        handler.resolveUserIdFromGithubForProject(githubUser, providerId, providerData, tx as never)
      ).rejects.toThrow('Email is not verified');
      expect(mockUsers.createUser).not.toHaveBeenCalled();
      expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).not.toHaveBeenCalled();
    });
  });

  describe('resolveUserIdFromEmailForProject', () => {
    it('returns existing userId when user is found by email', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
        userId: 'existing-email-user-id',
      });
      const handler = createHandler();
      const userId = await handler.resolveUserIdFromEmailForProject(
        'user@example.com',
        tx as never
      );
      expect(userId).toBe('existing-email-user-id');
      expect(mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail).toHaveBeenCalledWith(
        'user@example.com',
        tx
      );
      expect(mockUsers.createUser).not.toHaveBeenCalled();
    });

    it('marks an existing unverified email auth method verified after email magic-link proof', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
        id: 'email-method-id',
        userId: 'existing-email-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: false,
      });
      const handler = createHandler();

      const userId = await handler.resolveUserIdFromEmailForProject(
        'user@example.com',
        tx as never
      );

      expect(userId).toBe('existing-email-user-id');
      expect(mockUserAuthenticationMethods.updateUserAuthenticationMethod).toHaveBeenCalledWith(
        'email-method-id',
        { isVerified: true },
        tx
      );
      expect(mockUsers.createUser).not.toHaveBeenCalled();
      expect(mockAccounts.createAccount).not.toHaveBeenCalled();
    });

    it('does not update an existing verified email auth method', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
        id: 'email-method-id',
        userId: 'existing-email-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: true,
      });
      const handler = createHandler();

      const userId = await handler.resolveUserIdFromEmailForProject(
        'user@example.com',
        tx as never
      );

      expect(userId).toBe('existing-email-user-id');
      expect(mockUserAuthenticationMethods.updateUserAuthenticationMethod).not.toHaveBeenCalled();
    });

    it('does not create a user when sign-up is disabled and no email identity exists', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
      const handler = createHandler();

      await expect(
        handler.resolveUserIdFromEmailForProject('newuser@example.com', tx as never, {
          allowSignUp: false,
        })
      ).rejects.toThrow('Sign-up is disabled for this app');

      expect(mockUsers.createUser).not.toHaveBeenCalled();
      expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).not.toHaveBeenCalled();
    });

    it('creates user and email auth method when new', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
      mockUsers.createUser.mockResolvedValue({ id: 'new-email-user-id' });
      const handler = createHandler();
      const userId = await handler.resolveUserIdFromEmailForProject(
        'newuser@example.com',
        tx as never
      );
      expect(userId).toBe('new-email-user-id');
      expect(mockUsers.createUser).toHaveBeenCalledWith({ name: 'newuser' }, tx);
      expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-email-user-id',
          provider: UserAuthenticationMethodProvider.Email,
          providerId: 'newuser@example.com',
          isVerified: true,
        }),
        tx
      );
    });
  });

  describe('resolveUserIdFromOAuthForProject (Google)', () => {
    it('links Google to an existing verified email user', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
        userId: 'email-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: true,
      });
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: { googleId: 'google-sub-1' },
        isVerified: true,
      });
      const handler = createHandler();
      const userId = await handler.resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: 'user@example.com',
          emailVerified: true,
          name: 'Ada',
          providerData: { googleId: 'google-sub-1' },
        },
        tx as never
      );
      expect(userId).toBe('email-user-id');
      expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'email-user-id',
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
        }),
        tx
      );
    });

    it('creates a user with the Google picture URL', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: {
          googleId: 'google-sub-1',
          avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
        },
        isVerified: true,
      });
      mockUsers.createUser.mockResolvedValue({ id: 'new-google-user' });
      const handler = createHandler();
      const userId = await handler.resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: 'user@example.com',
          emailVerified: true,
          name: 'Ada',
          providerData: {
            googleId: 'google-sub-1',
            avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
          },
        },
        tx as never
      );
      expect(userId).toBe('new-google-user');
      expect(mockUsers.createUser).toHaveBeenCalledWith(
        { name: 'Ada', pictureUrl: 'https://lh3.googleusercontent.com/a/photo' },
        tx
      );
    });

    it('sets picture from Google when linking to a user with an empty picture', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
        userId: 'email-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: true,
      });
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: {
          googleId: 'google-sub-1',
          avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
        },
        isVerified: true,
      });
      mockUsers.getUsers.mockResolvedValue({
        users: [{ id: 'email-user-id', pictureUrl: null }],
        totalCount: 1,
      });
      const handler = createHandler();
      await handler.resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: 'user@example.com',
          emailVerified: true,
          name: 'Ada',
          providerData: {
            googleId: 'google-sub-1',
            avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
          },
        },
        tx as never
      );
      expect(mockUsers.updateUser).toHaveBeenCalledWith(
        'email-user-id',
        { pictureUrl: 'https://lh3.googleusercontent.com/a/photo' },
        tx
      );
    });

    it('does not override an existing custom picture when linking Google', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
        userId: 'email-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: true,
      });
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: {
          googleId: 'google-sub-1',
          avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
        },
        isVerified: true,
      });
      mockUsers.getUsers.mockResolvedValue({
        users: [{ id: 'email-user-id', pictureUrl: 'https://cdn.example.com/custom.png' }],
        totalCount: 1,
      });
      const handler = createHandler();
      await handler.resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: 'user@example.com',
          emailVerified: true,
          name: 'Ada',
          providerData: {
            googleId: 'google-sub-1',
            avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
          },
        },
        tx as never
      );
      expect(mockUsers.updateUser).not.toHaveBeenCalled();
    });

    it('binds a verified contact email when creating a Google user', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: { googleId: 'google-sub-1' },
        isVerified: true,
      });
      mockUsers.createUser.mockResolvedValue({ id: 'new-google-user' });
      const handler = createHandler();
      await handler.resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: 'Ada@Example.com',
          emailVerified: true,
          name: 'Ada',
          providerData: { googleId: 'google-sub-1' },
        },
        tx as never
      );
      expect(mockUserAuthenticationMethods.ensureVerifiedContactEmail).toHaveBeenCalledWith(
        'new-google-user',
        'Ada@Example.com',
        true,
        tx
      );
    });

    it('does not treat an unverified IdP email as a contact mailbox', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
      mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
      mockUserAuthenticationMethods.processProvider.mockResolvedValue({
        providerData: { googleId: 'google-sub-1' },
        isVerified: false,
      });
      mockUsers.createUser.mockResolvedValue({ id: 'new-google-user' });
      const handler = createHandler();
      await handler.resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: 'user@example.com',
          emailVerified: false,
          name: 'Ada',
          providerData: { googleId: 'google-sub-1' },
        },
        tx as never
      );
      expect(mockUserAuthenticationMethods.ensureVerifiedContactEmail).toHaveBeenCalledWith(
        'new-google-user',
        'user@example.com',
        false,
        tx
      );
    });

    it('backfills a verified contact email for an existing Google method', async () => {
      mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
        userId: 'existing-user-id',
      });
      const handler = createHandler();
      await handler.resolveUserIdFromOAuthForProject(
        {
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          email: 'user@example.com',
          emailVerified: true,
          name: 'Ada',
          providerData: { googleId: 'google-sub-1' },
        },
        tx as never
      );
      expect(mockUserAuthenticationMethods.ensureVerifiedContactEmail).toHaveBeenCalledWith(
        'existing-user-id',
        'user@example.com',
        true,
        tx
      );
    });
  });
});
