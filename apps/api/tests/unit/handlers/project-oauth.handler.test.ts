/**
 * Unit tests: ProjectOAuthHandler
 *
 * Covers initiateProjectAuthorize, requestProjectEmailMagicLink,
 * handleProjectCallback (GitHub), handleProjectCallbackEmailFlow,
 * and indirect coverage of signProjectScopedToken / resolveScope via callback paths.
 */
import { Scope, Tenant, UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PROJECT_OAUTH_CODE_KEY_PREFIX,
  PROJECT_OAUTH_CONSENT_KEY_PREFIX,
  PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX,
  PROJECT_OAUTH_STATE_KEY_PREFIX,
} from '@/constants/cache.constants';
import { ProjectOAuthHandler } from '@/handlers/project-oauth.handler';
import { hashSecret } from '@/lib/token.lib';

const RFC_PKCE = {
  verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
};
const authorizePkce = {
  codeChallenge: RFC_PKCE.challenge,
  codeChallengeMethod: 'S256' as const,
};

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    projectOAuth: {
      emailEntryUrl: 'https://app.example.com/auth/project/email',
      consentUrl: 'https://app.example.com/auth/project/consent',
      stateTtlSeconds: 600,
      emailTokenTtlSeconds: 600,
      consentTtlSeconds: 600,
      authorizationCodeTtlSeconds: 60,
      refreshTokenExpirationDays: 30,
      requireByoSocial: false,
    },
    app: {
      url: 'https://api.example.com',
      isDevelopment: false,
      nodeEnv: 'test',
      version: 'test',
    },
    jwt: { accessTokenExpirationMinutes: 15 },
    token: { defaultValidityMinutes: 10, defaultTokenLength: 32, bcryptRounds: 4 },
    githubOAuth: {
      projectCallbackUrl: 'https://api.example.com/api/auth/project/callback',
      callbackUrl: 'https://api.example.com/api/auth/callback',
    },
    security: { frontendUrl: 'https://app.example.com' },
    i18n: { defaultLocale: 'en' as const, supportedLocales: ['en', 'de'] as const },
    logging: { level: 'silent' as const, prettyPrint: false },
  },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

const mockProjectApps = {
  getProjectAppByClientId: vi.fn(),
  getProjectAppById: vi.fn(),
  getClientSecretHash: vi.fn(),
};
const mockProjects = {
  getProjects: vi.fn().mockResolvedValue({ projects: [], totalCount: 0, hasNextPage: false }),
};
const mockProjectUsers = {
  getProjectUsers: vi.fn(),
  addProjectUser: vi.fn(),
  syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
};
const mockUserRoles = { addUserRole: vi.fn() };
const mockAccountProjects = { getAccountProject: vi.fn() };
const mockOrganizationProjects = { getOrganizationProject: vi.fn() };
const mockAccounts = { getAccounts: vi.fn() };
const mockOrganizationUsers = { getOrganizationUsers: vi.fn() };
const mockAuthHandler = {
  resolveUserIdFromGithubForProject: vi.fn(),
  resolveUserIdFromOAuthForProject: vi.fn(),
  resolveUserIdFromEmailForProject: vi.fn(),
};
const mockGithubOAuth = {
  isConfigured: vi.fn(),
  getProjectAuthorizationUrl: vi.fn(),
  getProjectCallbackUrl: vi
    .fn()
    .mockReturnValue('https://api.example.com/api/auth/project/callback'),
  exchangeCodeForTokenWithRedirect: vi.fn(),
  getOAuthUserInfo: vi.fn(),
  buildProviderData: vi.fn().mockReturnValue({
    accessToken: 'gh-token',
    githubId: '1',
    email: 'user@example.com',
  }),
};
const mockGoogleOAuth = {
  isConfigured: vi.fn().mockResolvedValue(false),
  getProjectAuthorizationUrl: vi.fn(),
  getProjectCallbackUrl: vi
    .fn()
    .mockReturnValue('https://api.example.com/api/auth/project/callback'),
  exchangeCodeForTokenWithRedirect: vi.fn(),
  getOAuthUserInfo: vi.fn(),
  buildProviderData: vi.fn(),
};
const mockGrant = {
  signApiKeyToken: vi.fn(),
  signProjectAppToken: vi.fn(),
  getGrantedScopeSlugs: vi.fn(),
};
const mockCacheOauth = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
const mockCache = { oauth: mockCacheOauth };
const mockEmail = { sendProjectOAuthMagicLink: vi.fn() };
const mockUsers = {
  getUsers: vi.fn().mockResolvedValue({ users: [], totalCount: 0, hasNextPage: false }),
};
const mockUserAuthenticationMethods = {
  getUserAuthenticationMethods: vi.fn().mockResolvedValue([]),
};
const mockUsersScopeCacheUpdater = {
  addUserIdToScopeCache: vi.fn().mockResolvedValue(undefined),
};
const mockProjectOAuthConnections = {
  listByProject: vi.fn().mockResolvedValue([]),
  getDecryptedCredentials: vi.fn().mockResolvedValue(null),
};

const mockProjectPermissions = {
  getScopeSlugLabelsForProject: vi.fn(),
  getAllowedScopeSlugsForProject: vi.fn(),
};
const mockProjectOAuthGrants = {
  createGrant: vi.fn(),
  rotateByRefreshToken: vi.fn(),
  revokeGrant: vi.fn(),
  revokeByRefreshToken: vi.fn(),
};

function createHandler(): ProjectOAuthHandler {
  return new ProjectOAuthHandler(
    mockProjectApps as never,
    mockProjects as never,
    mockProjectPermissions as never,
    mockProjectUsers as never,
    mockUserRoles as never,
    mockAccountProjects as never,
    mockOrganizationProjects as never,
    mockAccounts as never,
    mockOrganizationUsers as never,
    mockAuthHandler as never,
    mockGithubOAuth as never,
    mockGoogleOAuth as never,
    mockProjectOAuthConnections as never,
    mockGrant as never,
    mockCache as never,
    mockEmail as never,
    mockUsers as never,
    mockUserAuthenticationMethods as never,
    mockUsersScopeCacheUpdater as never,
    mockProjectOAuthGrants as never,
    {} as never,
    {} as never,
    {} as never
  );
}

const validApp = {
  id: 'app-id',
  clientId: 'client-uuid',
  projectId: 'project-id',
  redirectUris: ['https://example.com/callback'],
  enabledProviders: [] as string[],
  scopes: null as string[] | null,
  name: 'Test App',
};

describe('ProjectOAuthHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectApps.getProjectAppByClientId.mockResolvedValue(validApp);
    mockProjectApps.getProjectAppById.mockResolvedValue(validApp);
    mockProjects.getProjects.mockResolvedValue({ projects: [], totalCount: 0, hasNextPage: false });
    mockGithubOAuth.isConfigured.mockReturnValue(true);
    mockGoogleOAuth.isConfigured.mockResolvedValue(false);
    mockProjectOAuthConnections.listByProject.mockResolvedValue([]);
    mockProjectOAuthConnections.getDecryptedCredentials.mockResolvedValue(null);
    mockGithubOAuth.getProjectAuthorizationUrl.mockReturnValue(
      'https://github.com/login/oauth/authorize?state=xyz'
    );
    mockCacheOauth.set.mockResolvedValue(undefined);
    mockCacheOauth.get.mockResolvedValue(null);
    mockCacheOauth.delete.mockResolvedValue(undefined);
    mockGrant.signApiKeyToken.mockResolvedValue('jwt-token');
    mockGrant.signProjectAppToken.mockResolvedValue('jwt-project-app');
    mockGrant.getGrantedScopeSlugs.mockResolvedValue([]);
    mockEmail.sendProjectOAuthMagicLink.mockResolvedValue(undefined);
    mockProjectApps.getClientSecretHash.mockResolvedValue(null);
    mockProjectOAuthGrants.createGrant.mockResolvedValue({
      grant: { id: 'grant-id', projectAppId: validApp.id, userId: 'user-id' },
      refreshToken: 'new-refresh-token',
    });
    mockProjectOAuthGrants.rotateByRefreshToken.mockResolvedValue({
      grant: {
        id: 'grant-id',
        projectAppId: validApp.id,
        userId: 'user-id',
        scopeTenant: Tenant.OrganizationProject,
        scopeId: 'org-id:project-id',
        scopes: null,
      },
      refreshToken: 'rotated-refresh-token',
    });
    mockProjectOAuthGrants.revokeGrant.mockResolvedValue(undefined);
    mockUsers.getUsers.mockResolvedValue({ users: [], totalCount: 0, hasNextPage: false });
  });

  describe('initiateProjectAuthorize', () => {
    it('throws NotFoundError when app is not found', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue(null);
      const handler = createHandler();
      await expect(
        handler.initiateProjectAuthorize('unknown-client', 'https://example.com/callback')
      ).rejects.toThrow('ProjectApp');
    });

    it('throws BadRequestError when redirect_uri is not in allowlist', async () => {
      const handler = createHandler();
      await expect(
        handler.initiateProjectAuthorize(validApp.clientId, 'https://evil.com/cb')
      ).rejects.toThrow('redirect_uri is not allowed');
    });

    it('throws BadRequestError when provider is not enabled for app', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        enabledProviders: ['github'],
      });
      const handler = createHandler();
      await expect(
        handler.initiateProjectAuthorize(
          validApp.clientId,
          'https://example.com/callback',
          undefined,
          UserAuthenticationMethodProvider.Email
        )
      ).rejects.toThrow('not enabled for this app');
    });

    it('returns GitHub authorization URL when provider=github and GitHub is configured', async () => {
      mockGithubOAuth.getProjectAuthorizationUrl.mockReturnValue(
        'https://github.com/login/oauth/authorize?state=abc'
      );
      const handler = createHandler();
      const result = await handler.initiateProjectAuthorize(
        validApp.clientId,
        'https://example.com/callback',
        undefined,
        UserAuthenticationMethodProvider.Github,
        undefined,
        undefined,
        authorizePkce
      );
      expect(result.authorizationUrl).toBe('https://github.com/login/oauth/authorize?state=abc');
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_STATE_KEY_PREFIX}`)),
        expect.objectContaining({
          projectAppId: validApp.id,
          redirectUri: 'https://example.com/callback',
          provider: UserAuthenticationMethodProvider.Github,
          credentialSource: 'platform',
          codeChallenge: RFC_PKCE.challenge,
          codeChallengeMethod: 'S256',
        }),
        expect.any(Number)
      );
      expect(mockGithubOAuth.getProjectAuthorizationUrl).toHaveBeenCalledWith(
        expect.any(String),
        undefined
      );
    });

    it('returns Google authorization URL when provider=google and Google is configured', async () => {
      mockGoogleOAuth.isConfigured.mockResolvedValue(true);
      mockGoogleOAuth.getProjectAuthorizationUrl.mockReturnValue(
        'https://accounts.google.com/o/oauth2/v2/auth?state=abc'
      );
      const handler = createHandler();
      const result = await handler.initiateProjectAuthorize(
        validApp.clientId,
        'https://example.com/callback',
        undefined,
        UserAuthenticationMethodProvider.Google,
        undefined,
        undefined,
        authorizePkce
      );
      expect(result.authorizationUrl).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth?state=abc'
      );
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_STATE_KEY_PREFIX}`)),
        expect.objectContaining({
          projectAppId: validApp.id,
          redirectUri: 'https://example.com/callback',
          provider: UserAuthenticationMethodProvider.Google,
        }),
        expect.any(Number)
      );
    });

    it('returns email entry URL when provider=email', async () => {
      const handler = createHandler();
      const result = await handler.initiateProjectAuthorize(
        validApp.clientId,
        'https://example.com/callback',
        'client-state',
        UserAuthenticationMethodProvider.Email,
        undefined,
        undefined,
        authorizePkce
      );
      expect(result.authorizationUrl).toContain('/en/auth/project/email');
      expect(result.authorizationUrl).toContain('https://app.example.com');
      expect(result.authorizationUrl).toContain('client_id=');
      expect(result.authorizationUrl).toContain('redirect_uri=');
      expect(result.authorizationUrl).toContain('state=');
      expect(result.authorizationUrl).toContain('client_state=client-state');
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_STATE_KEY_PREFIX}`)),
        expect.objectContaining({ provider: UserAuthenticationMethodProvider.Email }),
        expect.any(Number)
      );
    });

    it('throws ConfigurationError when provider=github and GitHub is not configured', async () => {
      mockGithubOAuth.isConfigured.mockReturnValue(false);
      const handler = createHandler();
      await expect(
        handler.initiateProjectAuthorize(
          validApp.clientId,
          'https://example.com/callback',
          undefined,
          UserAuthenticationMethodProvider.Github,
          undefined,
          undefined,
          authorizePkce
        )
      ).rejects.toThrow('GitHub OAuth is not configured');
    });

    it('uses the project BYO client_id even when platform GitHub is not configured', async () => {
      mockGithubOAuth.isConfigured.mockReturnValue(false);
      mockProjectOAuthConnections.getDecryptedCredentials.mockResolvedValue({
        clientId: 'byo-github-client',
        clientSecret: 'byo-github-secret',
      });
      mockGithubOAuth.getProjectAuthorizationUrl.mockReturnValue(
        'https://github.com/login/oauth/authorize?client_id=byo-github-client'
      );
      const handler = createHandler();
      const result = await handler.initiateProjectAuthorize(
        validApp.clientId,
        'https://example.com/callback',
        undefined,
        UserAuthenticationMethodProvider.Github,
        undefined,
        undefined,
        authorizePkce
      );
      expect(result.authorizationUrl).toContain('client_id=byo-github-client');
      expect(mockGithubOAuth.getProjectAuthorizationUrl).toHaveBeenCalledWith(expect.any(String), {
        clientId: 'byo-github-client',
        clientSecret: 'byo-github-secret',
      });
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_STATE_KEY_PREFIX}`)),
        expect.objectContaining({ credentialSource: 'byo' }),
        expect.any(Number)
      );
    });

    it('throws ConfigurationError when require-BYO is on and no connection exists', async () => {
      mockConfig.projectOAuth.requireByoSocial = true;
      mockGithubOAuth.isConfigured.mockReturnValue(true);
      const handler = createHandler();
      await expect(
        handler.initiateProjectAuthorize(
          validApp.clientId,
          'https://example.com/callback',
          undefined,
          UserAuthenticationMethodProvider.Github,
          undefined,
          undefined,
          authorizePkce
        )
      ).rejects.toThrow('GitHub OAuth is not configured');
      mockConfig.projectOAuth.requireByoSocial = false;
    });

    it('stores requestedScopeSlugs in state when scope param is provided', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        scopes: ['read', 'write', 'admin'],
      });
      const handler = createHandler();
      await handler.initiateProjectAuthorize(
        validApp.clientId,
        'https://example.com/callback',
        undefined,
        UserAuthenticationMethodProvider.Github,
        'read write',
        undefined,
        authorizePkce
      );
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_STATE_KEY_PREFIX}`)),
        expect.objectContaining({
          projectAppId: validApp.id,
          redirectUri: 'https://example.com/callback',
          provider: UserAuthenticationMethodProvider.Github,
          requestedScopeSlugs: ['read', 'write'],
        }),
        expect.any(Number)
      );
    });

    it('throws BadRequestError when response_type is token', async () => {
      const handler = createHandler();
      await expect(
        handler.initiateProjectAuthorize(
          validApp.clientId,
          'https://example.com/callback',
          undefined,
          UserAuthenticationMethodProvider.Github,
          undefined,
          undefined,
          { responseType: 'token', codeChallenge: RFC_PKCE.challenge, codeChallengeMethod: 'S256' }
        )
      ).rejects.toThrow('response_type must be code');
    });

    it('throws BadRequestError when PKCE is missing', async () => {
      const handler = createHandler();
      await expect(
        handler.initiateProjectAuthorize(
          validApp.clientId,
          'https://example.com/callback',
          undefined,
          UserAuthenticationMethodProvider.Github
        )
      ).rejects.toThrow('code_challenge is required');
    });

    it('throws BadRequestError when code_challenge_method is plain', async () => {
      const handler = createHandler();
      await expect(
        handler.initiateProjectAuthorize(
          validApp.clientId,
          'https://example.com/callback',
          undefined,
          UserAuthenticationMethodProvider.Github,
          undefined,
          undefined,
          { codeChallenge: RFC_PKCE.challenge, codeChallengeMethod: 'plain' }
        )
      ).rejects.toThrow('code_challenge_method must be S256');
    });
  });

  describe('requestProjectEmailMagicLink', () => {
    it('throws NotFoundError when app is not found', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue(null);
      const handler = createHandler();
      await expect(
        handler.requestProjectEmailMagicLink(
          'unknown',
          'https://example.com/callback',
          'state-id',
          'user@example.com'
        )
      ).rejects.toThrow('ProjectApp');
    });

    it('throws BadRequestError when redirect_uri is not allowed', async () => {
      const handler = createHandler();
      await expect(
        handler.requestProjectEmailMagicLink(
          validApp.clientId,
          'https://evil.com/cb',
          'state-id',
          'user@example.com'
        )
      ).rejects.toThrow('redirect_uri is not allowed');
    });

    it('throws BadRequestError when email provider is not enabled', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        enabledProviders: ['github'],
      });
      const handler = createHandler();
      await expect(
        handler.requestProjectEmailMagicLink(
          validApp.clientId,
          'https://example.com/callback',
          'state-id',
          'user@example.com'
        )
      ).rejects.toThrow('Provider "email" is not enabled');
    });

    it('sets cache with email token prefix and sends magic link email', async () => {
      const handler = createHandler();
      await handler.requestProjectEmailMagicLink(
        validApp.clientId,
        'https://example.com/callback',
        'state-123',
        'user@example.com',
        'client-state'
      );
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}`)),
        expect.objectContaining({
          projectAppId: validApp.id,
          redirectUri: 'https://example.com/callback',
          stateId: 'state-123',
          email: 'user@example.com',
          clientState: 'client-state',
        }),
        expect.any(Number)
      );
      expect(mockEmail.sendProjectOAuthMagicLink).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          appName: validApp.name,
        })
      );
      expect(mockEmail.sendProjectOAuthMagicLink.mock.calls[0][0].magicLinkUrl).toContain(
        '/api/auth/project/callback'
      );
      expect(mockEmail.sendProjectOAuthMagicLink.mock.calls[0][0].magicLinkUrl).toContain('state=');
    });

    it('generates and caches state when state is omitted (direct email page link)', async () => {
      const handler = createHandler();
      await handler.requestProjectEmailMagicLink(
        validApp.clientId,
        'https://example.com/callback',
        undefined,
        'user@example.com'
      );
      const setCalls = mockCacheOauth.set.mock.calls;
      expect(setCalls.length).toBe(2);
      const stateKeyCall = setCalls.find(([key]) =>
        (key as string).startsWith(PROJECT_OAUTH_STATE_KEY_PREFIX)
      );
      const emailKeyCall = setCalls.find(([key]) =>
        (key as string).startsWith(PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX)
      );
      expect(stateKeyCall).toBeDefined();
      expect(emailKeyCall).toBeDefined();
      const statePayload = stateKeyCall![1] as { projectAppId: string; redirectUri: string };
      expect(statePayload.projectAppId).toBe(validApp.id);
      expect(statePayload.redirectUri).toBe('https://example.com/callback');
      const emailPayload = emailKeyCall![1] as { stateId: string };
      expect(emailPayload.stateId).toBeDefined();
      expect(emailPayload.stateId.length).toBeGreaterThan(0);
      expect(mockEmail.sendProjectOAuthMagicLink.mock.calls[0][0].magicLinkUrl).toContain(
        `state=${encodeURIComponent(emailPayload.stateId)}`
      );
    });

    it('stores requestedScopeSlugs in email payload when scope param is provided', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        scopes: ['read', 'write'],
      });
      const handler = createHandler();
      await handler.requestProjectEmailMagicLink(
        validApp.clientId,
        'https://example.com/callback',
        'state-456',
        'user@example.com',
        'client-state',
        'read'
      );
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}`)),
        expect.objectContaining({
          projectAppId: validApp.id,
          redirectUri: 'https://example.com/callback',
          stateId: 'state-456',
          email: 'user@example.com',
          clientState: 'client-state',
          requestedScopeSlugs: ['read'],
        }),
        expect.any(Number)
      );
    });
  });

  describe('getProjectAppPublicInfo', () => {
    beforeEach(() => {
      mockProjectPermissions.getScopeSlugLabelsForProject.mockResolvedValue([
        { slug: 'read', name: 'Read', description: null },
      ]);
    });

    it('throws NotFoundError when app is not found', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue(null);
      const handler = createHandler();
      await expect(handler.getProjectAppPublicInfo('unknown-client')).rejects.toThrow('ProjectApp');
    });

    it('throws BadRequestError when redirect_uri is provided and not in allowlist', async () => {
      const handler = createHandler();
      await expect(
        handler.getProjectAppPublicInfo(validApp.clientId, null, 'https://evil.com/cb')
      ).rejects.toThrow('redirect_uri is not allowed');
    });

    it('returns name, enabledProviders, and scopes on success', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        name: 'My App',
        enabledProviders: ['github', 'email'],
        scopes: ['read'],
      });
      mockProjectPermissions.getScopeSlugLabelsForProject.mockResolvedValue([
        { slug: 'read', name: 'Read', description: 'Read access' },
      ]);
      const handler = createHandler();
      const result = await handler.getProjectAppPublicInfo(validApp.clientId);
      expect(result).toEqual({
        name: 'My App',
        enabledProviders: ['github', 'email'],
        configuredProviders: ['github'],
        scopes: [{ slug: 'read', name: 'Read', description: 'Read access' }],
        pictureUrl: null,
        primaryColor: null,
        showHelpPanel: true,
        themeMode: null,
        projectName: null,
      });
      expect(mockProjectPermissions.getScopeSlugLabelsForProject).toHaveBeenCalledWith(
        validApp.projectId,
        ['read']
      );
    });

    it('returns resolved branding including app themeMode', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        name: 'Branded App',
        pictureUrl: 'https://cdn.example/app.png',
        primaryColor: '#AABBCC',
        showHelpPanel: false,
        themeMode: 'dark',
      });
      mockProjects.getProjects.mockResolvedValue({
        projects: [
          {
            name: 'Acme',
            pictureUrl: 'https://cdn.example/project.png',
            primaryColor: '#112233',
            showHelpPanel: true,
          },
        ],
        totalCount: 1,
        hasNextPage: false,
      });
      mockProjectPermissions.getScopeSlugLabelsForProject.mockResolvedValue([]);
      const handler = createHandler();
      await expect(handler.getProjectAppPublicInfo(validApp.clientId)).resolves.toMatchObject({
        name: 'Branded App',
        pictureUrl: 'https://cdn.example/app.png',
        primaryColor: '#AABBCC',
        showHelpPanel: false,
        themeMode: 'dark',
        projectName: 'Acme',
      });
    });

    it('reports BYO google as configured when platform Google env is empty', async () => {
      mockGoogleOAuth.isConfigured.mockResolvedValue(false);
      mockGithubOAuth.isConfigured.mockReturnValue(false);
      mockProjectOAuthConnections.listByProject.mockResolvedValue([
        { provider: 'google', clientId: 'byo-google', isConfigured: true },
      ]);
      const handler = createHandler();
      const result = await handler.getProjectAppPublicInfo(validApp.clientId);
      expect(result.configuredProviders).toEqual(['google']);
    });

    it('returns scopes filtered by scope param when provided', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        scopes: ['read', 'write', 'admin'],
      });
      mockProjectPermissions.getScopeSlugLabelsForProject.mockResolvedValue([
        { slug: 'read', name: 'Read', description: null },
        { slug: 'write', name: 'Write', description: null },
      ]);
      const handler = createHandler();
      const result = await handler.getProjectAppPublicInfo(
        validApp.clientId,
        'read write',
        'https://example.com/callback'
      );
      expect(result.scopes).toHaveLength(2);
      expect(mockProjectPermissions.getScopeSlugLabelsForProject).toHaveBeenCalledWith(
        validApp.projectId,
        ['read', 'write']
      );
    });
  });

  describe('getProjectEntryParamsFromState', () => {
    it('returns null when state is not in cache', async () => {
      mockCacheOauth.get.mockResolvedValue(null);
      const handler = createHandler();
      const result = await handler.getProjectEntryParamsFromState('unknown-state');
      expect(result).toBeNull();
      expect(mockCacheOauth.get).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_STATE_KEY_PREFIX}unknown-state`
      );
    });

    it('returns null when state is in cache but app is not found', async () => {
      mockCacheOauth.get.mockResolvedValue({
        projectAppId: validApp.id,
        redirectUri: 'https://example.com/callback',
        clientState: 'cs',
      });
      mockProjectApps.getProjectAppById.mockResolvedValue(null);
      const handler = createHandler();
      const result = await handler.getProjectEntryParamsFromState('state-123');
      expect(result).toBeNull();
    });

    it('returns clientId, redirectUri, state when state is in cache and app exists', async () => {
      const statePayload = {
        projectAppId: validApp.id,
        redirectUri: 'https://example.com/callback',
        clientState: 'cs',
      };
      mockCacheOauth.get.mockResolvedValue(statePayload);
      const handler = createHandler();
      const result = await handler.getProjectEntryParamsFromState('state-123');
      expect(result).toEqual({
        clientId: validApp.clientId,
        redirectUri: 'https://example.com/callback',
        state: 'state-123',
      });
      expect(mockCacheOauth.get).toHaveBeenCalledWith(`${PROJECT_OAUTH_STATE_KEY_PREFIX}state-123`);
      expect(mockProjectApps.getProjectAppById).toHaveBeenCalledWith(validApp.id);
    });
  });

  describe('getProjectConsentInfo', () => {
    const consentPayload = {
      projectAppId: validApp.id,
      redirectUri: 'https://example.com/callback',
      clientState: 'client-state',
      userId: 'user-id',
      scope: { tenant: Tenant.OrganizationProjectUser, id: 'org-id:project-id:user-id' },
      signingScope: { tenant: Tenant.OrganizationProject, id: 'org-id:project-id' },
      requestedScopeSlugs: ['read'],
    };

    it('throws AuthenticationError when consent token is invalid or expired', async () => {
      mockCacheOauth.get.mockResolvedValue(null);
      const handler = createHandler();
      await expect(handler.getProjectConsentInfo('invalid-token')).rejects.toThrow(
        'Invalid or expired consent token'
      );
      expect(mockCacheOauth.get).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}invalid-token`
      );
    });

    it('returns name and scopes on success (granted = intersection of user permissions and request)', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      mockProjectApps.getProjectAppById.mockResolvedValue({
        ...validApp,
        name: 'Consent App',
        scopes: ['read', 'write'],
      });
      mockGrant.getGrantedScopeSlugs.mockResolvedValue(['read']);
      mockProjectPermissions.getScopeSlugLabelsForProject.mockResolvedValue([
        { slug: 'read', name: 'Read', description: null },
      ]);
      const handler = createHandler();
      const result = await handler.getProjectConsentInfo('consent-token-123');
      expect(result).toEqual({
        name: 'Consent App',
        scopes: [{ slug: 'read', name: 'Read', description: null }],
        user: null,
        pictureUrl: null,
        primaryColor: null,
        showHelpPanel: true,
        themeMode: null,
        projectName: null,
      });
      expect(mockCacheOauth.get).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}consent-token-123`
      );
      expect(mockGrant.getGrantedScopeSlugs).toHaveBeenCalledWith(
        consentPayload.userId,
        consentPayload.scope,
        ['read']
      );
      expect(mockProjectPermissions.getScopeSlugLabelsForProject).toHaveBeenCalledWith(
        validApp.projectId,
        ['read']
      );
    });

    it('uses granted scopes (user permissions ∩ app scopes) when payload has no requestedScopeSlugs', async () => {
      mockCacheOauth.get.mockResolvedValue({ ...consentPayload, requestedScopeSlugs: undefined });
      mockProjectApps.getProjectAppById.mockResolvedValue({
        ...validApp,
        name: 'App',
        scopes: ['read', 'write'],
      });
      mockGrant.getGrantedScopeSlugs.mockResolvedValue(['read', 'write']);
      mockProjectPermissions.getScopeSlugLabelsForProject.mockResolvedValue([
        { slug: 'read', name: 'Read', description: null },
        { slug: 'write', name: 'Write', description: null },
      ]);
      const handler = createHandler();
      const result = await handler.getProjectConsentInfo('token');
      expect(result.scopes).toHaveLength(2);
      expect(result.user).toBeNull();
      expect(mockGrant.getGrantedScopeSlugs).toHaveBeenCalledWith(
        consentPayload.userId,
        consentPayload.scope,
        ['read', 'write']
      );
      expect(mockProjectPermissions.getScopeSlugLabelsForProject).toHaveBeenCalledWith(
        validApp.projectId,
        ['read', 'write']
      );
    });

    it('returns user display (displayName, email, pictureUrl) when user is resolved', async () => {
      mockCacheOauth.get.mockResolvedValue({
        ...consentPayload,
        provider: UserAuthenticationMethodProvider.Github,
      });
      mockProjectApps.getProjectAppById.mockResolvedValue({
        ...validApp,
        name: 'App',
        scopes: ['read'],
      });
      mockGrant.getGrantedScopeSlugs.mockResolvedValue(['read']);
      mockProjectPermissions.getScopeSlugLabelsForProject.mockResolvedValue([
        { slug: 'read', name: 'Read', description: null },
      ]);
      mockUsers.getUsers.mockResolvedValue({
        users: [
          {
            id: consentPayload.userId,
            name: 'Jane Doe',
            pictureUrl: 'https://example.com/avatar.png',
          },
        ],
        totalCount: 1,
        hasNextPage: false,
      });
      mockUserAuthenticationMethods.getUserAuthenticationMethods.mockResolvedValue([
        { provider: 'email', providerId: 'jane@example.com' },
      ]);
      const handler = createHandler();
      const result = await handler.getProjectConsentInfo('token');
      expect(result.user).toEqual({
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        pictureUrl: 'https://example.com/avatar.png',
        provider: UserAuthenticationMethodProvider.Github,
      });
    });
  });

  describe('handleProjectConsentApprove', () => {
    const consentPayload = {
      projectAppId: validApp.id,
      redirectUri: 'https://example.com/callback',
      clientState: 'client-state',
      userId: 'user-id',
      scope: { tenant: Tenant.OrganizationProjectUser, id: 'org-id:project-id:user-id' },
      signingScope: { tenant: Tenant.OrganizationProject, id: 'org-id:project-id' },
      codeChallenge: RFC_PKCE.challenge,
      codeChallengeMethod: 'S256' as const,
    };

    it('throws AuthenticationError when consent token is invalid or expired', async () => {
      mockCacheOauth.get.mockResolvedValue(null);
      const handler = createHandler();
      await expect(handler.handleProjectConsentApprove('invalid-token')).rejects.toThrow(
        'Invalid or expired consent token'
      );
    });

    it('throws BadRequestError when consent payload lacks codeChallenge', async () => {
      mockCacheOauth.get.mockResolvedValue({ ...consentPayload, codeChallenge: undefined });
      const handler = createHandler();
      await expect(handler.handleProjectConsentApprove('consent-token-123')).rejects.toThrow(
        'code_challenge is required'
      );
    });

    it('deletes consent key and returns redirectUrl with code in the query string', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      const handler = createHandler();
      const result = await handler.handleProjectConsentApprove('consent-token-123');
      const redirect = new URL(result.redirectUrl);
      expect(redirect.origin + redirect.pathname).toBe('https://example.com/callback');
      expect(redirect.searchParams.get('code')).toBeTruthy();
      expect(redirect.searchParams.get('state')).toBe('client-state');
      expect(redirect.hash).toBe('');
      expect(result.redirectUrl).not.toContain('access_token=');
      expect(mockCacheOauth.get).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}consent-token-123`
      );
      expect(mockCacheOauth.delete).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}consent-token-123`
      );
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_CODE_KEY_PREFIX}`)),
        expect.objectContaining({
          userId: 'user-id',
          projectAppId: validApp.id,
          codeChallenge: RFC_PKCE.challenge,
          clientId: validApp.clientId,
        }),
        60
      );
      expect(mockGrant.signApiKeyToken).not.toHaveBeenCalled();
    });

    it('includes state in the query string when clientState is present', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      const handler = createHandler();
      const result = await handler.handleProjectConsentApprove('token');
      const redirect = new URL(result.redirectUrl);
      expect(redirect.searchParams.get('state')).toBe('client-state');
      expect(redirect.hash).toBe('');
    });
  });

  describe('handleProjectConsentDeny', () => {
    const consentPayload = {
      projectAppId: validApp.id,
      redirectUri: 'https://example.com/callback',
      clientState: 'client-state',
      userId: 'user-id',
      scope: { tenant: Tenant.OrganizationProjectUser, id: 'org-id:project-id:user-id' },
      signingScope: { tenant: Tenant.OrganizationProject, id: 'org-id:project-id' },
    };

    it('throws AuthenticationError when consent token is invalid or expired', async () => {
      mockCacheOauth.get.mockResolvedValue(null);
      const handler = createHandler();
      await expect(handler.handleProjectConsentDeny('invalid-token')).rejects.toThrow(
        'Invalid or expired consent token'
      );
    });

    it('deletes consent key and returns redirectUrl with error=access_denied in the query string', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      const handler = createHandler();
      const result = await handler.handleProjectConsentDeny('consent-token-123');
      const redirect = new URL(result.redirectUrl);
      expect(redirect.origin + redirect.pathname).toBe('https://example.com/callback');
      expect(redirect.searchParams.get('error')).toBe('access_denied');
      expect(redirect.searchParams.get('error_description')).toBeTruthy();
      expect(redirect.hash).toBe('');
      expect(mockCacheOauth.delete).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}consent-token-123`
      );
    });

    it('includes state in the query string when clientState is present', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      const handler = createHandler();
      const result = await handler.handleProjectConsentDeny('token');
      const redirect = new URL(result.redirectUrl);
      expect(redirect.searchParams.get('state')).toBe('client-state');
      expect(redirect.hash).toBe('');
    });
  });

  describe('handleProjectCallback (GitHub)', () => {
    const stateId = 'state-123';
    const statePayload = {
      projectAppId: validApp.id,
      redirectUri: 'https://example.com/callback',
      clientState: 'client-state',
      provider: UserAuthenticationMethodProvider.Github,
      credentialSource: 'platform' as const,
    };
    const _scope: Scope = {
      tenant: Tenant.OrganizationProjectUser,
      id: 'org-id:project-id:user-id',
    };

    beforeEach(() => {
      mockCacheOauth.get.mockResolvedValue(statePayload);
      mockGithubOAuth.exchangeCodeForTokenWithRedirect.mockResolvedValue('gh-token');
      mockGithubOAuth.getOAuthUserInfo.mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        emailVerified: true,
        name: 'User',
        avatarUrl: 'https://avatars.github.com/1',
        username: 'user',
      });
      mockAuthHandler.resolveUserIdFromOAuthForProject.mockResolvedValue('user-id');
      mockProjectUsers.getProjectUsers.mockResolvedValue([
        { userId: 'user-id', projectId: validApp.projectId },
      ]);
      mockAccountProjects.getAccountProject.mockRejectedValue(new Error('not account project'));
      mockOrganizationProjects.getOrganizationProject.mockResolvedValue({
        organizationId: 'org-id',
      });
      mockOrganizationUsers.getOrganizationUsers.mockResolvedValue([
        { userId: 'user-id', roleId: 'role-1' },
      ]);
    });

    it('throws ConfigurationError when GitHub is not configured', async () => {
      mockGithubOAuth.isConfigured.mockReturnValue(false);
      const handler = createHandler();
      await expect(handler.handleProjectCallback('code', stateId)).rejects.toThrow(
        'GitHub OAuth is not configured'
      );
    });

    it('throws AuthenticationError when state is invalid or expired', async () => {
      mockCacheOauth.get.mockResolvedValue(null);
      const handler = createHandler();
      await expect(handler.handleProjectCallback('code', stateId)).rejects.toThrow(
        'Invalid or expired state'
      );
      expect(mockCacheOauth.delete).not.toHaveBeenCalled();
    });

    it('throws AuthenticationError when user is not in project_users and allowSignUp is false', async () => {
      mockProjectUsers.getProjectUsers.mockResolvedValue([]);
      mockProjectApps.getProjectAppById.mockResolvedValue({ ...validApp, allowSignUp: false });
      const handler = createHandler();
      await expect(handler.handleProjectCallback('code', stateId)).rejects.toThrow(
        'not a member of this project'
      );
      expect(mockProjectUsers.addProjectUser).not.toHaveBeenCalled();
    });

    it('adds user to project and continues when not in project_users and allowSignUp is true', async () => {
      mockProjectUsers.getProjectUsers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ userId: 'user-id', projectId: validApp.projectId }]);
      mockProjectUsers.addProjectUser.mockResolvedValue({
        id: 'pu-1',
        projectId: validApp.projectId,
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      mockUserRoles.addUserRole.mockResolvedValue({});
      const appWithSignUpRole = { ...validApp, allowSignUp: true, signUpRoleId: 'role-id-1' };
      mockProjectApps.getProjectAppById.mockResolvedValue(appWithSignUpRole);
      const handler = createHandler();
      const result = await handler.handleProjectCallback('code', stateId);
      expect(mockProjectUsers.addProjectUser).toHaveBeenCalledWith({
        projectId: validApp.projectId,
        userId: 'user-id',
      });
      expect(mockUserRoles.addUserRole).toHaveBeenCalledWith({
        userId: 'user-id',
        roleId: 'role-id-1',
      });
      expect(result).toMatchObject({
        redirectToConsent: true,
        consentUrl: expect.stringContaining('consent_token='),
      });
    });

    it('returns redirectToConsent and consentUrl on success', async () => {
      const handler = createHandler();
      const result = await handler.handleProjectCallback('code', stateId);
      expect(result).toMatchObject({
        redirectToConsent: true,
        consentUrl: expect.stringContaining('consent_token='),
      });
      expect(mockCacheOauth.get).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}`
      );
      expect(mockCacheOauth.delete).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}`
      );
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(/^oauth:project-consent:/),
        expect.objectContaining({
          projectAppId: validApp.id,
          redirectUri: 'https://example.com/callback',
          userId: 'user-id',
          provider: UserAuthenticationMethodProvider.Github,
        }),
        expect.any(Number)
      );
      expect(mockAuthHandler.resolveUserIdFromOAuthForProject).toHaveBeenCalled();
      expect(mockGrant.signApiKeyToken).not.toHaveBeenCalled();
    });

    it('exchanges the BYO client stored in state, not the platform secret', async () => {
      mockCacheOauth.get.mockResolvedValue({
        ...statePayload,
        provider: UserAuthenticationMethodProvider.Github,
        credentialSource: 'byo',
      });
      mockGithubOAuth.isConfigured.mockReturnValue(false);
      mockProjectOAuthConnections.getDecryptedCredentials.mockResolvedValue({
        clientId: 'byo-github-client',
        clientSecret: 'byo-github-secret',
      });
      const handler = createHandler();
      await handler.handleProjectCallback('code', stateId);
      expect(mockGithubOAuth.exchangeCodeForTokenWithRedirect).toHaveBeenCalledWith(
        'code',
        'https://api.example.com/api/auth/project/callback',
        { clientId: 'byo-github-client', clientSecret: 'byo-github-secret' }
      );
    });

    it('does not fall back to platform when BYO authorize state has no live connection', async () => {
      mockCacheOauth.get.mockResolvedValue({
        ...statePayload,
        provider: UserAuthenticationMethodProvider.Github,
        credentialSource: 'byo',
      });
      mockGithubOAuth.isConfigured.mockReturnValue(true);
      mockProjectOAuthConnections.getDecryptedCredentials.mockResolvedValue(null);
      const handler = createHandler();
      await expect(handler.handleProjectCallback('code', stateId)).rejects.toThrow(
        'no longer configured'
      );
      expect(mockGithubOAuth.exchangeCodeForTokenWithRedirect).not.toHaveBeenCalled();
    });

    it('exchanges with platform credentials when state says platform even if BYO exists', async () => {
      mockProjectOAuthConnections.getDecryptedCredentials.mockResolvedValue({
        clientId: 'byo-github-client',
        clientSecret: 'byo-github-secret',
      });
      const handler = createHandler();
      await handler.handleProjectCallback('code', stateId);
      expect(mockGithubOAuth.exchangeCodeForTokenWithRedirect).toHaveBeenCalledWith(
        'code',
        'https://api.example.com/api/auth/project/callback',
        undefined
      );
    });

    it('fails closed when callback state lacks credentialSource', async () => {
      mockCacheOauth.get.mockResolvedValue({
        projectAppId: validApp.id,
        redirectUri: 'https://example.com/callback',
        provider: UserAuthenticationMethodProvider.Github,
      });
      const handler = createHandler();
      await expect(handler.handleProjectCallback('code', stateId)).rejects.toThrow(
        'Invalid or expired state'
      );
      expect(mockGithubOAuth.exchangeCodeForTokenWithRedirect).not.toHaveBeenCalled();
    });
  });

  describe('handleProjectCallback (Google)', () => {
    const stateId = 'state-google';
    const statePayload = {
      projectAppId: validApp.id,
      redirectUri: 'https://example.com/callback',
      clientState: 'client-state',
      provider: UserAuthenticationMethodProvider.Google,
      credentialSource: 'platform' as const,
    };

    beforeEach(() => {
      mockCacheOauth.get.mockResolvedValue(statePayload);
      mockGoogleOAuth.isConfigured.mockResolvedValue(true);
      mockGoogleOAuth.exchangeCodeForTokenWithRedirect.mockResolvedValue('ya29.token');
      mockGoogleOAuth.getOAuthUserInfo.mockResolvedValue({
        id: 'google-sub-1',
        email: 'user@example.com',
        emailVerified: true,
        name: 'Ada',
        avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
      });
      mockGoogleOAuth.buildProviderData.mockReturnValue({
        accessToken: 'ya29.token',
        googleId: 'google-sub-1',
        email: 'user@example.com',
      });
      mockAuthHandler.resolveUserIdFromOAuthForProject.mockResolvedValue('user-id');
      mockProjectUsers.getProjectUsers.mockResolvedValue([
        { userId: 'user-id', projectId: validApp.projectId },
      ]);
      mockAccountProjects.getAccountProject.mockRejectedValue(new Error('not account project'));
      mockOrganizationProjects.getOrganizationProject.mockResolvedValue({
        organizationId: 'org-id',
      });
      mockOrganizationUsers.getOrganizationUsers.mockResolvedValue([
        { userId: 'user-id', roleId: 'role-1' },
      ]);
    });

    it('exchanges the code with the Google project callback URL', async () => {
      const handler = createHandler();
      const result = await handler.handleProjectCallback('code', stateId);
      expect(result).toMatchObject({
        redirectToConsent: true,
        consentUrl: expect.stringContaining('consent_token='),
      });
      expect(mockGoogleOAuth.exchangeCodeForTokenWithRedirect).toHaveBeenCalledWith(
        'code',
        'https://api.example.com/api/auth/project/callback',
        undefined
      );
      expect(mockGithubOAuth.exchangeCodeForTokenWithRedirect).not.toHaveBeenCalled();
      expect(mockAuthHandler.resolveUserIdFromOAuthForProject).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: UserAuthenticationMethodProvider.Google,
          providerId: 'google-sub-1',
          emailVerified: true,
        }),
        undefined,
        expect.anything()
      );
    });
  });

  describe('handleProjectCallbackEmailFlow', () => {
    const token = 'one-time-token';
    const stateId = 'state-123';
    const emailPayload = {
      projectAppId: validApp.id,
      redirectUri: 'https://example.com/callback',
      stateId,
      email: 'user@example.com',
      clientState: 'client-state',
    };

    beforeEach(() => {
      mockCacheOauth.get.mockResolvedValue(emailPayload);
      mockAuthHandler.resolveUserIdFromEmailForProject.mockResolvedValue('user-id');
      mockProjectUsers.getProjectUsers.mockResolvedValue([
        { userId: 'user-id', projectId: validApp.projectId },
      ]);
      mockAccountProjects.getAccountProject.mockRejectedValue(new Error('not account'));
      mockOrganizationProjects.getOrganizationProject.mockResolvedValue({
        organizationId: 'org-id',
      });
      mockOrganizationUsers.getOrganizationUsers.mockResolvedValue([
        { userId: 'user-id', roleId: 'role-1' },
      ]);
    });

    it('throws AuthenticationError when token is invalid or stateId mismatch', async () => {
      mockCacheOauth.get.mockResolvedValue(null);
      const handler = createHandler();
      await expect(handler.handleProjectCallbackEmailFlow(token, stateId)).rejects.toThrow(
        'Invalid or expired magic link'
      );

      mockCacheOauth.get.mockResolvedValue({ ...emailPayload, stateId: 'other-state' });
      await expect(handler.handleProjectCallbackEmailFlow(token, stateId)).rejects.toThrow(
        'Invalid or expired magic link'
      );
      expect(mockCacheOauth.delete).toHaveBeenCalled();
    });

    it('throws AuthenticationError when user is not in project_users and allowSignUp is false', async () => {
      mockProjectUsers.getProjectUsers.mockResolvedValue([]);
      mockProjectApps.getProjectAppById.mockResolvedValue({ ...validApp, allowSignUp: false });
      const handler = createHandler();
      await expect(handler.handleProjectCallbackEmailFlow(token, stateId)).rejects.toThrow(
        'not a member of this project'
      );
      expect(mockProjectUsers.addProjectUser).not.toHaveBeenCalled();
    });

    it('adds user to project and continues when not in project_users and allowSignUp is true', async () => {
      mockProjectUsers.getProjectUsers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ userId: 'user-id', projectId: validApp.projectId }]);
      mockProjectUsers.addProjectUser.mockResolvedValue({
        id: 'pu-1',
        projectId: validApp.projectId,
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      mockUserRoles.addUserRole.mockResolvedValue({});
      const appWithSignUpRole = { ...validApp, allowSignUp: true, signUpRoleId: 'role-id-1' };
      mockProjectApps.getProjectAppById.mockResolvedValue(appWithSignUpRole);
      const handler = createHandler();
      const result = await handler.handleProjectCallbackEmailFlow(token, stateId);
      expect(mockProjectUsers.addProjectUser).toHaveBeenCalledWith({
        projectId: validApp.projectId,
        userId: 'user-id',
      });
      expect(mockUserRoles.addUserRole).toHaveBeenCalledWith({
        userId: 'user-id',
        roleId: 'role-id-1',
      });
      expect(result).toMatchObject({
        redirectToConsent: true,
        consentUrl: expect.stringContaining('consent_token='),
      });
    });

    it('returns redirectToConsent and consentUrl on success', async () => {
      const handler = createHandler();
      const result = await handler.handleProjectCallbackEmailFlow(token, stateId);
      expect(result).toMatchObject({
        redirectToConsent: true,
        consentUrl: expect.stringContaining('consent_token='),
      });
      expect(mockCacheOauth.get).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}${token}`
      );
      expect(mockCacheOauth.delete).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}${token}`
      );
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(/^oauth:project-consent:/),
        expect.objectContaining({
          projectAppId: validApp.id,
          redirectUri: 'https://example.com/callback',
          userId: 'user-id',
          provider: UserAuthenticationMethodProvider.Email,
        }),
        expect.any(Number)
      );
      expect(mockAuthHandler.resolveUserIdFromEmailForProject).toHaveBeenCalledWith(
        'user@example.com',
        undefined,
        { allowSignUp: true }
      );
      expect(mockGrant.signApiKeyToken).not.toHaveBeenCalled();
    });
  });

  describe('handleProjectToken', () => {
    const codePayload = {
      userId: 'user-id',
      projectAppId: validApp.id,
      redirectUri: 'https://example.com/callback',
      scope: { tenant: Tenant.OrganizationProjectUser, id: 'org-id:project-id:user-id' },
      signingScope: { tenant: Tenant.OrganizationProject, id: 'org-id:project-id' },
      codeChallenge: RFC_PKCE.challenge,
      codeChallengeMethod: 'S256' as const,
      clientId: validApp.clientId,
    };

    beforeEach(() => {
      mockProjectUsers.getProjectUsers.mockResolvedValue([
        { userId: 'user-id', projectId: validApp.projectId },
      ]);
      mockOrganizationProjects.getOrganizationProject.mockResolvedValue({
        organizationId: 'org-id',
      });
      mockAccountProjects.getAccountProject.mockRejectedValue(new Error('not account'));
      mockUsers.getUsers.mockResolvedValue({
        users: [{ id: 'user-id' }],
        totalCount: 1,
        hasNextPage: false,
      });
    });

    it('exchanges an authorization code for access and refresh tokens (public + PKCE)', async () => {
      mockCacheOauth.get.mockResolvedValue(codePayload);
      const handler = createHandler();
      const result = await handler.handleProjectToken({
        grantType: 'authorization_code',
        clientId: validApp.clientId,
        redirectUri: 'https://example.com/callback',
        code: 'auth-code',
        codeVerifier: RFC_PKCE.verifier,
      });
      expect(result.accessToken).toBe('jwt-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.expiresIn).toBe(15 * 60);
      expect(mockCacheOauth.delete).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CODE_KEY_PREFIX}auth-code`
      );
      expect(mockProjectOAuthGrants.createGrant).toHaveBeenCalled();
      expect(mockGrant.signApiKeyToken).toHaveBeenCalledWith(
        expect.objectContaining({ jti: 'grant-id', aud: validApp.clientId }),
        expect.anything()
      );
    });

    it('rejects a wrong PKCE verifier with invalid_grant', async () => {
      mockCacheOauth.get.mockResolvedValue(codePayload);
      const handler = createHandler();
      await expect(
        handler.handleProjectToken({
          grantType: 'authorization_code',
          clientId: validApp.clientId,
          redirectUri: 'https://example.com/callback',
          code: 'auth-code',
          codeVerifier: 'a'.repeat(43),
        })
      ).rejects.toThrow('invalid_grant');
      expect(mockProjectOAuthGrants.createGrant).not.toHaveBeenCalled();
    });

    it('rejects a reused authorization code with invalid_grant', async () => {
      mockCacheOauth.get.mockResolvedValue(null);
      const handler = createHandler();
      await expect(
        handler.handleProjectToken({
          grantType: 'authorization_code',
          clientId: validApp.clientId,
          redirectUri: 'https://example.com/callback',
          code: 'already-used',
          codeVerifier: RFC_PKCE.verifier,
        })
      ).rejects.toThrow('invalid_grant');
    });

    it('rotates a refresh token and returns a new refresh token', async () => {
      const handler = createHandler();
      const result = await handler.handleProjectToken({
        grantType: 'refresh_token',
        clientId: validApp.clientId,
        refreshToken: 'current-refresh',
      });
      expect(result.refreshToken).toBe('rotated-refresh-token');
      expect(result.accessToken).toBe('jwt-token');
      expect(mockProjectOAuthGrants.rotateByRefreshToken).toHaveBeenCalledWith(
        'current-refresh',
        expect.anything()
      );
    });

    it('fails closed when an old refresh token is reused', async () => {
      mockProjectOAuthGrants.rotateByRefreshToken.mockResolvedValue(null);
      const handler = createHandler();
      await expect(
        handler.handleProjectToken({
          grantType: 'refresh_token',
          clientId: validApp.clientId,
          refreshToken: 'old-refresh',
        })
      ).rejects.toThrow('invalid_grant');
    });

    it('requires client_secret for confidential apps', async () => {
      mockProjectApps.getClientSecretHash.mockResolvedValue(
        hashSecret('confidential-secret-value')
      );
      const handler = createHandler();
      await expect(
        handler.handleProjectToken({
          grantType: 'authorization_code',
          clientId: validApp.clientId,
          redirectUri: 'https://example.com/callback',
          code: 'auth-code',
          codeVerifier: RFC_PKCE.verifier,
        })
      ).rejects.toThrow('invalid_client');
    });

    it('rejects unsupported grant types', async () => {
      const handler = createHandler();
      await expect(
        handler.handleProjectToken({
          grantType: 'client_credentials',
          clientId: validApp.clientId,
        })
      ).rejects.toThrow('unsupported_grant_type');
    });
  });
});
