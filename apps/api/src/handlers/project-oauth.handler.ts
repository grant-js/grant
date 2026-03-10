import {
  type ProjectAppPublicInfo,
  type ProjectConsentInfo,
  Scope,
  Tenant,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { config } from '@/config';
import { type ProjectOAuthProvider, PROJECT_OAUTH_PROVIDERS } from '@/config/env.config';
import {
  PROJECT_OAUTH_CONSENT_KEY_PREFIX,
  PROJECT_OAUTH_CONSENT_TTL_SECONDS,
  PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX,
  PROJECT_OAUTH_EMAIL_TOKEN_TTL_SECONDS,
  PROJECT_OAUTH_STATE_KEY_PREFIX,
  PROJECT_OAUTH_STATE_TTL_SECONDS,
} from '@/constants/cache.constants';
import { CacheKey, IEntityCacheAdapter } from '@/lib/cache';
import {
  AuthenticationError,
  BadRequestError,
  ConfigurationError,
  NotFoundError,
} from '@/lib/errors';
import { buildJwksIssuerUrl } from '@/lib/jwks.lib';
import { createLogger } from '@/lib/logger';
import type { IProjectOAuthProvider } from '@/lib/project-oauth';
import { generateSecureToken } from '@/lib/token.lib';

import type { AuthHandler } from './auth.handler';
import type {
  IAccountProjectService,
  IAccountService,
  IEmailService,
  IOrganizationProjectService,
  IOrganizationUserService,
  IProjectAppService,
  IProjectPermissionService,
  IProjectUserService,
  IUserAuthenticationMethodService,
  IUserRoleService,
  IUserService,
} from '@grantjs/core';
import type { Grant } from '@grantjs/core';
import type { IGitHubOAuthService } from '@grantjs/core';

/** Used to add a user id to the users scope cache when OAuth adds/ensures project membership. */
export interface IUsersScopeCacheUpdater {
  addUserIdToScopeCache(scope: Scope, userId: string): Promise<void>;
}

export interface ProjectOAuthState {
  projectAppId: string;
  redirectUri: string;
  clientState?: string;
  provider?: ProjectOAuthProvider;
  /** Requested scope slugs from authorize query (subset of app scopes). */
  requestedScopeSlugs?: string[];
  /** Frontend locale for consent/entry redirects (e.g. en, de). */
  locale?: string;
}

export interface ProjectOAuthEmailTokenPayload {
  projectAppId: string;
  redirectUri: string;
  stateId: string;
  email: string;
  clientState?: string;
  /** Requested scope slugs from email request (subset of app scopes). */
  requestedScopeSlugs?: string[];
  /** Frontend locale for consent redirect and email content (e.g. en, de). */
  locale?: string;
}

export interface InitiateProjectAuthorizeResult {
  authorizationUrl: string;
}

export interface HandleProjectCallbackResult {
  redirectUri: string;
  accessToken: string;
  expiresIn: number;
  clientState?: string;
}

export interface HandleProjectCallbackConsentRedirectResult {
  redirectToConsent: true;
  consentUrl: string;
}

export interface ProjectOAuthConsentPayload {
  projectAppId: string;
  redirectUri: string;
  clientState?: string;
  userId: string;
  scope: Scope;
  signingScope: Scope;
  /** Effective requested scopes for this flow (subset of app scopes); used for consent display and token. */
  requestedScopeSlugs?: string[];
}

export class ProjectOAuthHandler {
  private readonly logger = createLogger('ProjectOAuthHandler');

  constructor(
    private readonly projectApps: IProjectAppService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly projectUsers: IProjectUserService,
    private readonly userRoles: IUserRoleService,
    private readonly accountProjects: IAccountProjectService,
    private readonly organizationProjects: IOrganizationProjectService,
    private readonly accounts: IAccountService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly authHandler: AuthHandler,
    private readonly githubOAuth: IGitHubOAuthService,
    private readonly grant: Grant,
    private readonly cache: IEntityCacheAdapter,
    private readonly email: IEmailService,
    private readonly users: IUserService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly usersScopeCacheUpdater: IUsersScopeCacheUpdater
  ) {}

  /** Parse OAuth scope param (space-delimited) into slug array. */
  private parseScopeParam(scopeParam?: string | null): string[] {
    if (!scopeParam || typeof scopeParam !== 'string') return [];
    return scopeParam
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** Intersection of requested slugs with app-allowed scopes; invalid or unknown slugs are dropped. */
  private effectiveRequestedScopes(appScopes: string[], requestedSlugs: string[]): string[] {
    const allowedSet = new Set(appScopes);
    return requestedSlugs.filter((s) => allowedSet.has(s));
  }

  /**
   * Build frontend URL with locale for redirects (consent, email entry).
   * If locale is provided and supported, use it. Else if configuredUrl already contains a supported
   * locale segment (e.g. /en/), use it as-is. Otherwise use config.i18n.defaultLocale.
   */
  private buildFrontendUrlWithLocale(
    configuredUrl: string,
    path: string,
    locale?: string | null
  ): string {
    const supported = new Set<string>(config.i18n.supportedLocales);
    const effectiveLocale =
      locale && supported.has(locale)
        ? locale
        : (() => {
            try {
              const parsed = new URL(configuredUrl);
              const firstSegment = parsed.pathname.replace(/^\//, '').split('/')[0];
              if (firstSegment && supported.has(firstSegment)) {
                return firstSegment;
              }
            } catch {
              // invalid URL, fall through
            }
            return config.i18n.defaultLocale;
          })();
    const base = config.security.frontendUrl.replace(/\/$/, '');
    return `${base}/${effectiveLocale}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async getProjectAppPublicInfo(
    clientId: string,
    scopeParam?: string | null,
    redirectUriParam?: string | null
  ): Promise<ProjectAppPublicInfo> {
    const app = await this.projectApps.getProjectAppByClientId(clientId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    if (redirectUriParam?.trim()) {
      const allowedUris = app.redirectUris ?? [];
      if (!allowedUris.length || !allowedUris.includes(redirectUriParam.trim())) {
        throw new BadRequestError('redirect_uri is not allowed for this app');
      }
    }
    const appScopeSlugs = app.scopes ?? [];
    const requestedSlugs = this.parseScopeParam(scopeParam);
    const scopeSlugs =
      requestedSlugs.length > 0
        ? this.effectiveRequestedScopes(appScopeSlugs, requestedSlugs)
        : appScopeSlugs;
    const scopes = await this.projectPermissions.getScopeSlugLabelsForProject(
      app.projectId,
      scopeSlugs
    );
    return {
      name: app.name ?? null,
      enabledProviders: app.enabledProviders ?? null,
      scopes,
    };
  }

  async initiateProjectAuthorize(
    clientId: string,
    redirectUri: string,
    clientState?: string,
    provider: ProjectOAuthProvider = UserAuthenticationMethodProvider.Github,
    scopeParam?: string | null,
    locale?: string | null
  ): Promise<InitiateProjectAuthorizeResult> {
    const app = await this.projectApps.getProjectAppByClientId(clientId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }

    const allowedUris = app.redirectUris ?? [];
    if (!allowedUris.length || !allowedUris.includes(redirectUri)) {
      throw new BadRequestError('redirect_uri is not allowed for this app');
    }

    const enabledList = app.enabledProviders ?? [];
    const providerAllowed = enabledList.length === 0 || enabledList.includes(provider);
    if (!providerAllowed) {
      throw new BadRequestError(`Provider "${provider}" is not enabled for this app`);
    }
    if (!PROJECT_OAUTH_PROVIDERS.includes(provider)) {
      throw new BadRequestError(`Unknown provider: ${provider}`);
    }

    const appScopeSlugs = app.scopes ?? [];
    const requestedSlugs = this.parseScopeParam(scopeParam);
    const requestedScopeSlugs =
      requestedSlugs.length > 0
        ? this.effectiveRequestedScopes(appScopeSlugs, requestedSlugs)
        : undefined;

    const stateToken = generateSecureToken(
      Math.max(1, Math.floor(PROJECT_OAUTH_STATE_TTL_SECONDS / 60)),
      32
    );
    const stateId = stateToken.token;
    const statePayload: ProjectOAuthState = {
      projectAppId: app.id,
      redirectUri,
      clientState,
      provider,
      ...(requestedScopeSlugs?.length ? { requestedScopeSlugs } : {}),
      ...(locale?.trim() ? { locale: locale.trim() } : {}),
    };
    const key = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}` as CacheKey;
    await this.cache.oauth.set(key, statePayload, PROJECT_OAUTH_STATE_TTL_SECONDS);

    const providerImpl = this.getProviderRegistry()[provider];
    const authorizationUrl = providerImpl.getAuthorizeUrl({
      clientId,
      redirectUri,
      stateId,
      clientState,
      appName: app.name ?? undefined,
    });
    return { authorizationUrl };
  }

  /**
   * Registry of project OAuth providers. PROJECT_OAUTH_PROVIDERS (config) is the subset of
   * UserAuthenticationMethodProvider (schema) supported here. Add a new provider: implement below,
   * add to PROJECT_OAUTH_PROVIDERS, then add callback handling in the project callback route.
   */
  private getProviderRegistry(): Record<ProjectOAuthProvider, IProjectOAuthProvider> {
    return {
      github: {
        getAuthorizeUrl: (params) => {
          if (!this.githubOAuth.isConfigured()) {
            throw new ConfigurationError('GitHub OAuth is not configured');
          }
          return this.githubOAuth.getProjectAuthorizationUrl(params.stateId);
        },
      },
      email: {
        getAuthorizeUrl: (params) => {
          const baseUrl = this.buildFrontendUrlWithLocale(
            config.projectOAuth.emailEntryUrl,
            '/auth/project/email'
          );
          const url = new URL(baseUrl);
          url.searchParams.set('client_id', params.clientId);
          url.searchParams.set('redirect_uri', params.redirectUri);
          url.searchParams.set('state', params.stateId);
          if (params.clientState) url.searchParams.set('client_state', params.clientState);
          return url.toString();
        },
      },
    };
  }

  /**
   * Request a project OAuth magic link for email provider.
   * Validates client_id/redirect_uri, stores one-time token in cache, sends magic link email.
   * When state is omitted or empty (e.g. user opened email page directly), a state is generated
   * and stored so the callback and error redirects work.
   */
  async requestProjectEmailMagicLink(
    clientId: string,
    redirectUri: string,
    stateId: string | undefined,
    email: string,
    clientState?: string,
    scopeParam?: string | null,
    locale?: string | null
  ): Promise<void> {
    const app = await this.projectApps.getProjectAppByClientId(clientId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    const allowedUris = app.redirectUris ?? [];
    if (!allowedUris.length || !allowedUris.includes(redirectUri)) {
      throw new BadRequestError('redirect_uri is not allowed for this app');
    }
    const enabledList = app.enabledProviders ?? [];
    const providerAllowed = enabledList.length === 0 || enabledList.includes('email');
    if (!providerAllowed) {
      throw new BadRequestError('Provider "email" is not enabled for this app');
    }

    const appScopeSlugs = app.scopes ?? [];
    const requestedSlugs = this.parseScopeParam(scopeParam);
    const requestedScopeSlugs =
      requestedSlugs.length > 0
        ? this.effectiveRequestedScopes(appScopeSlugs, requestedSlugs)
        : undefined;

    let effectiveStateId = stateId?.trim();
    if (!effectiveStateId) {
      const stateToken = generateSecureToken(
        Math.max(1, Math.floor(PROJECT_OAUTH_STATE_TTL_SECONDS / 60)),
        32
      );
      effectiveStateId = stateToken.token;
      const statePayload: ProjectOAuthState = {
        projectAppId: app.id,
        redirectUri,
      };
      const stateKey = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${effectiveStateId}` as CacheKey;
      await this.cache.oauth.set(stateKey, statePayload, PROJECT_OAUTH_STATE_TTL_SECONDS);
    }

    const oneTimeToken = generateSecureToken(
      Math.max(1, Math.floor(PROJECT_OAUTH_EMAIL_TOKEN_TTL_SECONDS / 60)),
      32
    );
    const effectiveLocale = locale?.trim() || undefined;
    const payload: ProjectOAuthEmailTokenPayload = {
      projectAppId: app.id,
      redirectUri,
      stateId: effectiveStateId,
      email: email.trim().toLowerCase(),
      clientState,
      ...(requestedScopeSlugs?.length ? { requestedScopeSlugs } : {}),
      ...(effectiveLocale ? { locale: effectiveLocale } : {}),
    };
    const key = `${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}${oneTimeToken.token}` as CacheKey;
    await this.cache.oauth.set(key, payload, PROJECT_OAUTH_EMAIL_TOKEN_TTL_SECONDS);

    const baseUrl = config.app.url.replace(/\/$/, '');
    const callbackUrl = `${baseUrl}/api/auth/project/callback?token=${encodeURIComponent(oneTimeToken.token)}&state=${encodeURIComponent(effectiveStateId)}&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    await this.email.sendProjectOAuthMagicLink({
      to: payload.email,
      magicLinkUrl: callbackUrl,
      appName: app.name ?? undefined,
      ...(effectiveLocale ? { locale: effectiveLocale } : {}),
    });
  }

  /**
   * Get entry URL params from state (for error redirect back to project OAuth entry).
   * Reads without deleting so the route can use this when the callback throws.
   */
  async getProjectEntryParamsFromState(
    stateId: string
  ): Promise<{ clientId: string; redirectUri: string; state: string; locale?: string } | null> {
    const key = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}` as CacheKey;
    const state = await this.cache.oauth.get<ProjectOAuthState>(key);
    if (!state) return null;
    const app = await this.projectApps.getProjectAppById(state.projectAppId);
    if (!app) return null;
    return {
      clientId: app.clientId,
      redirectUri: state.redirectUri,
      state: stateId,
      ...(state.locale ? { locale: state.locale } : {}),
    };
  }

  async handleProjectCallback(
    code: string,
    stateId: string
  ): Promise<HandleProjectCallbackResult | HandleProjectCallbackConsentRedirectResult> {
    if (!this.githubOAuth.isConfigured()) {
      throw new ConfigurationError('GitHub OAuth is not configured');
    }

    const key = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}` as CacheKey;
    const state = await this.cache.oauth.get<ProjectOAuthState>(key);
    if (!state) {
      throw new AuthenticationError('Invalid or expired state');
    }
    const app = await this.projectApps.getProjectAppById(state.projectAppId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    const redirectUri = state.redirectUri;
    const allowedUris = app.redirectUris ?? [];
    if (!allowedUris.includes(redirectUri)) {
      throw new BadRequestError('redirect_uri mismatch');
    }

    const projectCallbackUrl =
      config.githubOAuth.projectCallbackUrl ?? config.githubOAuth.callbackUrl;
    const githubAccessToken = await this.githubOAuth.exchangeCodeForTokenWithRedirect(
      code,
      projectCallbackUrl
    );
    const githubUser = await this.githubOAuth.getUserInfo(githubAccessToken);
    const providerId = githubUser.id.toString();
    const providerData = {
      accessToken: githubAccessToken,
      githubId: githubUser.id,
      avatarUrl: githubUser.avatar_url,
      login: githubUser.login,
      email: githubUser.email,
      name: githubUser.name,
    };

    const userId = await this.authHandler.resolveUserIdFromGithubForProject(
      githubUser,
      providerId,
      providerData,
      undefined,
      { allowSignUp: app.allowSignUp ?? true }
    );

    const result = await this.ensureProjectMembershipAndBuildConsentRedirect({
      userId,
      app,
      redirectUri,
      clientState: state.clientState,
      requestedScopeSlugs: state.requestedScopeSlugs,
      locale: state.locale,
    });
    await this.cache.oauth.delete(key);
    return result;
  }

  /**
   * Handle project OAuth callback for email (magic link) flow.
   * Token and state come from callback URL query; payload is retrieved from cache and consumed.
   */
  async handleProjectCallbackEmailFlow(
    token: string,
    stateId: string
  ): Promise<HandleProjectCallbackResult | HandleProjectCallbackConsentRedirectResult> {
    const key = `${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}${token}` as CacheKey;
    const payload = await this.cache.oauth.get<ProjectOAuthEmailTokenPayload>(key);
    await this.cache.oauth.delete(key);
    if (!payload || payload.stateId !== stateId) {
      throw new AuthenticationError('Invalid or expired magic link');
    }

    const app = await this.projectApps.getProjectAppById(payload.projectAppId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    const redirectUri = payload.redirectUri;
    const allowedUris = app.redirectUris ?? [];
    if (!allowedUris.includes(redirectUri)) {
      throw new BadRequestError('redirect_uri mismatch');
    }

    const userId = await this.authHandler.resolveUserIdFromEmailForProject(
      payload.email,
      undefined,
      { allowSignUp: app.allowSignUp ?? true }
    );

    return this.ensureProjectMembershipAndBuildConsentRedirect({
      userId,
      app,
      redirectUri,
      clientState: payload.clientState,
      requestedScopeSlugs: payload.requestedScopeSlugs,
      locale: payload.locale,
    });
  }

  /**
   * Ensures the user is a project member, resolves scope, stores consent payload in cache,
   * and returns the consent redirect URL. Shared by GitHub and email callback flows.
   */
  private async ensureProjectMembershipAndBuildConsentRedirect(params: {
    userId: string;
    app: {
      id: string;
      projectId: string;
      allowSignUp?: boolean | null;
      signUpRoleId?: string | null;
    };
    redirectUri: string;
    clientState?: string;
    requestedScopeSlugs?: string[];
    /** Frontend locale for consent page URL (e.g. en, de). */
    locale?: string | null;
  }): Promise<HandleProjectCallbackConsentRedirectResult> {
    const { userId, app, redirectUri, clientState, requestedScopeSlugs, locale } = params;

    const projectUsers = await this.projectUsers.getProjectUsers({
      projectId: app.projectId,
      userId,
    });
    if (!projectUsers.length) {
      if (app.allowSignUp !== false) {
        await this.projectUsers.addProjectUser({
          projectId: app.projectId,
          userId,
        });
        const signUpRoleId = app.signUpRoleId;
        if (signUpRoleId) {
          await this.userRoles.addUserRole({ userId, roleId: signUpRoleId });
        }
      } else {
        throw new AuthenticationError('User is not a member of this project');
      }
    }

    const projectScope = await this.getProjectScopeForUsersCache(app.projectId);
    if (projectScope) {
      await this.usersScopeCacheUpdater.addUserIdToScopeCache(projectScope, userId);
    }

    const scope = await this.resolveScopeForUserAndProject(userId, app.projectId);
    if (!scope) {
      throw new AuthenticationError('Could not resolve scope for project');
    }

    const signingScope: Scope =
      scope.tenant === Tenant.AccountProjectUser
        ? { tenant: Tenant.AccountProject, id: scope.id.split(':').slice(0, 2).join(':') }
        : { tenant: Tenant.OrganizationProject, id: scope.id.split(':').slice(0, 2).join(':') };

    const consentToken = generateSecureToken(
      Math.max(1, Math.floor(PROJECT_OAUTH_CONSENT_TTL_SECONDS / 60)),
      32
    ).token;
    const consentPayload: ProjectOAuthConsentPayload = {
      projectAppId: app.id,
      redirectUri,
      clientState,
      userId,
      scope,
      signingScope,
      ...(requestedScopeSlugs?.length ? { requestedScopeSlugs } : {}),
    };
    const consentKey = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as CacheKey;
    await this.cache.oauth.set(consentKey, consentPayload, PROJECT_OAUTH_CONSENT_TTL_SECONDS);

    const consentBase = this.buildFrontendUrlWithLocale(
      config.projectOAuth.consentUrl,
      '/auth/project/consent',
      locale
    );
    const consentUrl = `${consentBase}?consent_token=${encodeURIComponent(consentToken)}`;
    return { redirectToConsent: true as const, consentUrl };
  }

  /**
   * Get app name, scopes, and current user display for the consent page (validates consent token but does not consume it).
   * Returns labels for the scopes the user will actually grant: intersection of the user's project
   * permissions and the requested/app scopes (same set that ends up in the access token).
   * Includes user display (name, email, pictureUrl) so the consent screen shows which account is consenting.
   */
  async getProjectConsentInfo(consentToken: string): Promise<ProjectConsentInfo> {
    const key = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as CacheKey;
    const payload = await this.cache.oauth.get<ProjectOAuthConsentPayload>(key);
    if (!payload) {
      throw new AuthenticationError('Invalid or expired consent token');
    }
    const app = await this.projectApps.getProjectAppById(payload.projectAppId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    const scopeSlugs = payload.requestedScopeSlugs?.length
      ? payload.requestedScopeSlugs
      : (app.scopes ?? []);
    const grantedSlugs = await this.grant.getGrantedScopeSlugs(
      payload.userId,
      payload.scope,
      scopeSlugs
    );
    const scopes = await this.projectPermissions.getScopeSlugLabelsForProject(
      app.projectId,
      grantedSlugs
    );

    let user: { displayName: string; email: string | null; pictureUrl: string | null } | null =
      null;
    try {
      const userPage = await this.users.getUsers({
        ids: [payload.userId],
        limit: 1,
        requestedFields: ['name', 'pictureUrl'],
      });
      const u = userPage.users?.[0];
      if (u) {
        const methods = await this.userAuthenticationMethods.getUserAuthenticationMethods({
          userId: payload.userId,
          requestedFields: ['provider', 'providerId', 'providerData'],
        });
        const emailMethod = methods?.find(
          (m) => m.provider === UserAuthenticationMethodProvider.Email
        );
        const githubMethod = methods?.find(
          (m) => m.provider === UserAuthenticationMethodProvider.Github
        );
        const githubData = githubMethod?.providerData as
          | { name?: string; email?: string; avatarUrl?: string }
          | undefined;

        const email =
          (emailMethod?.providerId as string | undefined)?.trim() ||
          (typeof githubData?.email === 'string' ? githubData.email : null) ||
          null;
        const displayName =
          (u.name ?? '')?.trim() ||
          (typeof githubData?.name === 'string' ? githubData.name : '') ||
          email ||
          '';
        const pictureUrl =
          (u.pictureUrl ?? '')?.trim() ||
          (typeof githubData?.avatarUrl === 'string' && githubData.avatarUrl.startsWith('http')
            ? githubData.avatarUrl
            : null) ||
          null;

        user = {
          displayName: displayName || '—',
          email,
          pictureUrl: pictureUrl || null,
        };
      }
    } catch (e) {
      this.logger.warn(
        { err: e, userId: payload.userId },
        'Failed to resolve user display for consent'
      );
    }

    return { name: app.name ?? null, scopes, user };
  }

  /**
   * Approve consent: issue token and return redirect URL to app with token in fragment.
   */
  async handleProjectConsentApprove(consentToken: string): Promise<{ redirectUrl: string }> {
    const key = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as CacheKey;
    const payload = await this.cache.oauth.get<ProjectOAuthConsentPayload>(key);
    await this.cache.oauth.delete(key);
    if (!payload) {
      throw new AuthenticationError('Invalid or expired consent token');
    }
    const app = await this.projectApps.getProjectAppById(payload.projectAppId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    const effectiveScopeSlugs = payload.requestedScopeSlugs?.length
      ? payload.requestedScopeSlugs
      : undefined;
    const accessToken = await this.signProjectScopedToken(
      payload.userId,
      app,
      payload.scope,
      payload.signingScope,
      effectiveScopeSlugs
    );
    const expiresIn = (config.jwt?.accessTokenExpirationMinutes ?? 60) * 60;
    const url = new URL(payload.redirectUri);
    url.hash = `access_token=${encodeURIComponent(accessToken)}&expires_in=${expiresIn}&token_type=Bearer`;
    if (payload.clientState) url.hash += `&state=${encodeURIComponent(payload.clientState)}`;
    return { redirectUrl: url.toString() };
  }

  /**
   * Deny consent: return redirect URL to app with error in fragment.
   */
  async handleProjectConsentDeny(consentToken: string): Promise<{ redirectUrl: string }> {
    const key = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as CacheKey;
    const payload = await this.cache.oauth.get<ProjectOAuthConsentPayload>(key);
    await this.cache.oauth.delete(key);
    if (!payload) {
      throw new AuthenticationError('Invalid or expired consent token');
    }
    const url = new URL(payload.redirectUri);
    url.hash = `error=access_denied&error_description=${encodeURIComponent('User denied consent')}`;
    if (payload.clientState) url.hash += `&state=${encodeURIComponent(payload.clientState)}`;
    return { redirectUrl: url.toString() };
  }

  /**
   * Sign a project-scoped token. If the app has scopes configured (or effectiveScopeSlugs from
   * the authorize request), issues a project-app token with granted scopes (intersection of
   * effective scopes and user's project permissions); otherwise issues an API key-style token.
   * JWT scope is the project-level scope (signingScope) so authorization uses accountProject/
   * organizationProject directly; user is identified by sub.
   */
  private async signProjectScopedToken(
    userId: string,
    app: { clientId: string; scopes?: string[] | null },
    userScope: Scope,
    signingScope: Scope,
    effectiveScopeSlugs?: string[]
  ): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + (config.jwt?.accessTokenExpirationMinutes ?? 60) * 60;
    const jtiToken = generateSecureToken(1, 16);
    const iss = buildJwksIssuerUrl(signingScope);
    const basePayload = {
      sub: userId,
      aud: app.clientId,
      iss,
      exp,
      iat,
      jti: jtiToken.token,
      scope: signingScope,
    };

    const scopeSlugs = effectiveScopeSlugs?.length ? effectiveScopeSlugs : (app.scopes ?? []);
    if (scopeSlugs.length > 0) {
      const grantedScopes = await this.grant.getGrantedScopeSlugs(userId, userScope, scopeSlugs);
      return this.grant.signProjectAppToken(
        { ...basePayload, scopes: grantedScopes },
        { signingScope }
      );
    }
    return this.grant.signApiKeyToken(basePayload, { signingScope });
  }

  /**
   * Returns the project-level scope (AccountProject or OrganizationProject) for the
   * users scope cache, so that addUserIdToScopeCache can be called after adding a user
   * to the project. GetUsers uses this scope to look up cached user ids.
   */
  private async getProjectScopeForUsersCache(projectId: string): Promise<Scope | null> {
    try {
      const accountProject = await this.accountProjects.getAccountProject({ projectId });
      return {
        tenant: Tenant.AccountProject,
        id: `${accountProject.accountId}:${projectId}`,
      };
    } catch {
      // not an account project
    }
    try {
      const orgProject = await this.organizationProjects.getOrganizationProject({ projectId });
      return {
        tenant: Tenant.OrganizationProject,
        id: `${orgProject.organizationId}:${projectId}`,
      };
    } catch {
      // not an org project
    }
    return null;
  }

  /**
   * Resolves the OAuth scope for a user in a project. Returns AccountProjectUser or
   * OrganizationProjectUser scope when the user is the account owner, an org member,
   * or any project member (project_users). This allows project OAuth to work for all
   * users who have been added to the project, not only account owners / org members.
   */
  private async resolveScopeForUserAndProject(
    userId: string,
    projectId: string
  ): Promise<Scope | null> {
    const projectUsersList = await this.projectUsers.getProjectUsers({
      projectId,
      userId,
    });
    if (!projectUsersList.length) {
      return null;
    }

    try {
      const accountProject = await this.accountProjects.getAccountProject({ projectId });
      return {
        tenant: Tenant.AccountProjectUser,
        id: `${accountProject.accountId}:${projectId}:${userId}`,
      };
    } catch {
      // not an account project
    }

    try {
      const orgProject = await this.organizationProjects.getOrganizationProject({ projectId });
      return {
        tenant: Tenant.OrganizationProjectUser,
        id: `${orgProject.organizationId}:${projectId}:${userId}`,
      };
    } catch {
      // not an org project
    }

    return null;
  }
}
