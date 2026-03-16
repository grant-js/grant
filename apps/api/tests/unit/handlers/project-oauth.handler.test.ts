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
  PROJECT_OAUTH_CONSENT_KEY_PREFIX,
  PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX,
  PROJECT_OAUTH_STATE_KEY_PREFIX,
} from '@/constants/cache.constants';
import { ProjectOAuthHandler } from '@/handlers/project-oauth.handler';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    projectOAuth: {
      emailEntryUrl: 'https://app.example.com/auth/project/email',
      consentUrl: 'https://app.example.com/auth/project/consent',
    },
    app: {
      url: 'https://api.example.com',
      isDevelopment: false,
      nodeEnv: 'test',
      version: 'test',
    },
    jwt: { accessTokenExpirationMinutes: 15 },
    token: { defaultValidityMinutes: 10, defaultTokenLength: 32 },
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
};
const mockProjectUsers = {
  getProjectUsers: vi.fn(),
  addProjectUser: vi.fn(),
};
const mockUserRoles = { addUserRole: vi.fn() };
const mockAccountProjects = { getAccountProject: vi.fn() };
const mockOrganizationProjects = { getOrganizationProject: vi.fn() };
const mockAccounts = { getAccounts: vi.fn() };
const mockOrganizationUsers = { getOrganizationUsers: vi.fn() };
const mockAuthHandler = {
  resolveUserIdFromGithubForProject: vi.fn(),
  resolveUserIdFromEmailForProject: vi.fn(),
};
const mockGithubOAuth = {
  isConfigured: vi.fn(),
  getProjectAuthorizationUrl: vi.fn(),
  exchangeCodeForTokenWithRedirect: vi.fn(),
  getUserInfo: vi.fn(),
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

const mockProjectPermissions = {
  getScopeSlugLabelsForProject: vi.fn(),
  getAllowedScopeSlugsForProject: vi.fn(),
};

function createHandler(): ProjectOAuthHandler {
  return new ProjectOAuthHandler(
    mockProjectApps as never,
    mockProjectPermissions as never,
    mockProjectUsers as never,
    mockUserRoles as never,
    mockAccountProjects as never,
    mockOrganizationProjects as never,
    mockAccounts as never,
    mockOrganizationUsers as never,
    mockAuthHandler as never,
    mockGithubOAuth as never,
    mockGrant as never,
    mockCache as never,
    mockEmail as never,
    mockUsers as never,
    mockUserAuthenticationMethods as never,
    mockUsersScopeCacheUpdater as never
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
    mockGithubOAuth.isConfigured.mockReturnValue(true);
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
        UserAuthenticationMethodProvider.Github
      );
      expect(result.authorizationUrl).toBe('https://github.com/login/oauth/authorize?state=abc');
      expect(mockCacheOauth.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${PROJECT_OAUTH_STATE_KEY_PREFIX}`)),
        expect.objectContaining({
          projectAppId: validApp.id,
          redirectUri: 'https://example.com/callback',
          provider: UserAuthenticationMethodProvider.Github,
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
        UserAuthenticationMethodProvider.Email
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
          UserAuthenticationMethodProvider.Github
        )
      ).rejects.toThrow('GitHub OAuth is not configured');
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
        'read write'
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
        scopes: [{ slug: 'read', name: 'Read', description: 'Read access' }],
      });
      expect(mockProjectPermissions.getScopeSlugLabelsForProject).toHaveBeenCalledWith(
        validApp.projectId,
        ['read']
      );
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
      mockCacheOauth.get.mockResolvedValue(consentPayload);
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
    };

    it('throws AuthenticationError when consent token is invalid or expired', async () => {
      mockCacheOauth.get.mockResolvedValue(null);
      const handler = createHandler();
      await expect(handler.handleProjectConsentApprove('invalid-token')).rejects.toThrow(
        'Invalid or expired consent token'
      );
    });

    it('deletes consent key and returns redirectUrl with access_token in fragment', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      const handler = createHandler();
      const result = await handler.handleProjectConsentApprove('consent-token-123');
      expect(result.redirectUrl).toContain('https://example.com/callback');
      expect(result.redirectUrl).toContain('access_token=');
      expect(result.redirectUrl).toContain('expires_in=');
      expect(result.redirectUrl).toContain('token_type=Bearer');
      expect(result.redirectUrl).toContain('state=client-state');
      expect(mockCacheOauth.get).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}consent-token-123`
      );
      expect(mockCacheOauth.delete).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}consent-token-123`
      );
      expect(mockGrant.signApiKeyToken).toHaveBeenCalled();
    });

    it('includes state in fragment when clientState is present', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      const handler = createHandler();
      const result = await handler.handleProjectConsentApprove('token');
      const hash = new URL(result.redirectUrl).hash;
      expect(hash).toContain('state=');
      expect(hash).toContain('client-state');
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

    it('deletes consent key and returns redirectUrl with error=access_denied in fragment', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      const handler = createHandler();
      const result = await handler.handleProjectConsentDeny('consent-token-123');
      expect(result.redirectUrl).toContain('https://example.com/callback');
      expect(result.redirectUrl).toContain('error=access_denied');
      expect(result.redirectUrl).toContain('error_description=');
      expect(mockCacheOauth.delete).toHaveBeenCalledWith(
        `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}consent-token-123`
      );
    });

    it('includes state in fragment when clientState is present', async () => {
      mockCacheOauth.get.mockResolvedValue(consentPayload);
      const handler = createHandler();
      const result = await handler.handleProjectConsentDeny('token');
      const hash = new URL(result.redirectUrl).hash;
      expect(hash).toContain('state=');
      expect(hash).toContain('client-state');
    });
  });

  describe('handleProjectCallback (GitHub)', () => {
    const stateId = 'state-123';
    const statePayload = {
      projectAppId: validApp.id,
      redirectUri: 'https://example.com/callback',
      clientState: 'client-state',
    };
    const _scope: Scope = {
      tenant: Tenant.OrganizationProjectUser,
      id: 'org-id:project-id:user-id',
    };

    beforeEach(() => {
      mockCacheOauth.get.mockResolvedValue(statePayload);
      mockGithubOAuth.exchangeCodeForTokenWithRedirect.mockResolvedValue('gh-token');
      mockGithubOAuth.getUserInfo.mockResolvedValue({
        id: 1,
        login: 'user',
        email: 'user@example.com',
        name: 'User',
        avatar_url: 'https://avatars.github.com/1',
      });
      mockAuthHandler.resolveUserIdFromGithubForProject.mockResolvedValue('user-id');
      mockProjectUsers.getProjectUsers.mockResolvedValue([
        { userId: 'user-id', projectId: validApp.projectId },
      ]);
      mockAccountProjects.getAccountProject.mockRejectedValue(new Error('not account project'));
      mockOrganizationProjects.getOrganizationProject.mockResolvedValue({
        organizationId: 'org-id',
      });
      mockOrganizationUsers.getOrganizationUsers.mockResolvedValue([{ userId: 'user-id' }]);
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
        }),
        expect.any(Number)
      );
      expect(mockAuthHandler.resolveUserIdFromGithubForProject).toHaveBeenCalled();
      expect(mockGrant.signApiKeyToken).not.toHaveBeenCalled();
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
      mockOrganizationUsers.getOrganizationUsers.mockResolvedValue([{ userId: 'user-id' }]);
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
});
