import type {
  CredentialLockoutStatus,
  CredentialScope,
  IAccountProjectService,
  IAccountService,
  ICredentialLockoutService,
  ICredentialService,
  IEmailService,
  ILogger,
  IOrganizationProjectService,
  IOrganizationUserService,
  IProjectAppService,
  IProjectOAuthConnectionService,
  IProjectOAuthGrantService,
  IProjectPermissionService,
  IProjectService,
  IProjectUserService,
  IUserAuthenticationMethodService,
  IUserMfaService,
  IUserRoleService,
  IUserService,
  OAuthClientCredentials,
} from '@grantjs/core';
import type { Grant } from '@grantjs/core';
import type { IGitHubOAuthService, IGoogleOAuthService } from '@grantjs/core';
import {
  type ProjectAppPublicInfo,
  type ProjectConsentInfo,
  ProjectOAuthConnectionProvider,
  Scope,
  Tenant,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { config } from '@/config';
import {
  PROJECT_OAUTH_PROVIDERS,
  PROJECT_PASSWORD_PROVIDER,
  type ProjectOAuthProvider,
} from '@/config/env.config';
import {
  PROJECT_OAUTH_CODE_KEY_PREFIX,
  PROJECT_OAUTH_CONSENT_KEY_PREFIX,
  PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX,
  PROJECT_OAUTH_MFA_KEY_PREFIX,
  PROJECT_OAUTH_STATE_KEY_PREFIX,
} from '@/constants/cache.constants';
import { CacheKey, IEntityCacheAdapter } from '@/lib/cache';
import { verifyCredentialPassword } from '@/lib/credential-verifier.lib';
import {
  AuthenticationError,
  BadRequestError,
  ConfigurationError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import { buildJwksIssuerUrl } from '@/lib/jwks.lib';
import { createLogger } from '@/lib/logger';
import { resolveOAuthBranding } from '@/lib/oauth-branding.lib';
import { oauthPictureUrlFromProviderData } from '@/lib/oauth-picture.lib';
import type { IProjectOAuthProvider } from '@/lib/project-oauth';
import {
  generateAuthorizationCode,
  isValidPkceChallenge,
  verifyPkceS256,
} from '@/lib/project-oauth-pkce.lib';
import { isProjectProviderEnabled } from '@/lib/project-oauth-providers.lib';
import { generateSecureToken, verifySecret } from '@/lib/token.lib';

import type { AuthHandler } from './auth.handler';

/** Used to add a user id to the users scope cache when OAuth adds/ensures project membership. */
export interface IUsersScopeCacheUpdater {
  addUserIdToScopeCache(scope: Scope, userId: string): Promise<void>;
}

interface ProjectOAuthState {
  projectAppId: string;
  redirectUri: string;
  clientState?: string;
  provider?: ProjectOAuthProvider;
  /** Requested scope slugs from authorize query (subset of app scopes). */
  requestedScopeSlugs?: string[];
  /** Frontend locale for consent/entry redirects (e.g. en, de). */
  locale?: string;
  /** Which client started this flow; callback must reuse the same source. Never store secrets. */
  credentialSource?: 'byo' | 'platform';
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
}

interface ProjectOAuthEmailTokenPayload {
  projectAppId: string;
  redirectUri: string;
  stateId: string;
  email: string;
  clientState?: string;
  /** Requested scope slugs from email request (subset of app scopes). */
  requestedScopeSlugs?: string[];
  /** Frontend locale for consent redirect and email content (e.g. en, de). */
  locale?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
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

interface ProjectOAuthConsentPayload {
  projectAppId: string;
  redirectUri: string;
  clientState?: string;
  userId: string;
  scope: Scope;
  signingScope: Scope;
  /** Effective requested scopes for this flow (subset of app scopes); used for consent display and token. */
  requestedScopeSlugs?: string[];
  /** Provider used for this sign-in (email, github, google). */
  provider?: ProjectOAuthProvider;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
}

interface ProjectOAuthAuthorizationCodePayload {
  userId: string;
  projectAppId: string;
  redirectUri: string;
  clientState?: string;
  scope: Scope;
  signingScope: Scope;
  requestedScopeSlugs?: string[];
  codeChallenge: string;
  codeChallengeMethod?: 'S256';
  clientId: string;
}

/** A password sign-in that passed the password and now waits for the MFA code (ADR 0011 § 8). */
interface ProjectOAuthPasswordMfaPayload {
  userId: string;
  projectAppId: string;
  redirectUri: string;
  stateId: string;
  clientState?: string;
  requestedScopeSlugs?: string[];
  locale?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
  /** Wrong codes tried against this challenge; it is discarded at PROJECT_PASSWORD_MFA_MAX_ATTEMPTS. */
  attempts: number;
}

export interface ProjectPasswordSignInParams {
  clientId: string;
  redirectUri: string;
  /** The API's own state id, from the authorize step (it carries the PKCE challenge). */
  stateId: string;
  email: string;
  password: string;
  locale?: string | null;
}

export type ProjectPasswordSignInResult =
  { status: 'authenticated'; redirectUrl: string } | { status: 'mfa_required'; mfaToken: string };

export interface ProjectPasswordMfaParams {
  mfaToken: string;
  code: string;
  /** `totp` (default) or a one-time `recovery` code. */
  method?: 'totp' | 'recovery';
}

/**
 * Wrong MFA codes one challenge tolerates. The `(project, user)` lockout is the real
 * budget (every code attempt spends from it, in the database); this only stops one token
 * from being hammered until that lockout trips.
 */
const PROJECT_PASSWORD_MFA_MAX_ATTEMPTS = 5;

export interface HandleProjectTokenParams {
  grantType: string;
  clientId: string;
  redirectUri?: string;
  code?: string;
  codeVerifier?: string;
  refreshToken?: string;
  clientSecret?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface HandleProjectTokenResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string;
  scope?: string;
}

export interface InitiateProjectAuthorizePkce {
  responseType?: string | null;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
}

export class ProjectOAuthHandler {
  private readonly logger = createLogger('ProjectOAuthHandler');

  constructor(
    private readonly projectApps: IProjectAppService,
    private readonly projects: IProjectService,
    private readonly projectPermissions: IProjectPermissionService,
    private readonly projectUsers: IProjectUserService,
    private readonly userRoles: IUserRoleService,
    private readonly accountProjects: IAccountProjectService,
    private readonly organizationProjects: IOrganizationProjectService,
    private readonly accounts: IAccountService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly authHandler: AuthHandler,
    private readonly githubOAuth: IGitHubOAuthService,
    private readonly googleOAuth: IGoogleOAuthService,
    private readonly projectOAuthConnections: IProjectOAuthConnectionService,
    private readonly grant: Grant,
    private readonly cache: IEntityCacheAdapter,
    private readonly email: IEmailService,
    private readonly users: IUserService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly usersScopeCacheUpdater: IUsersScopeCacheUpdater,
    private readonly projectOAuthGrants: IProjectOAuthGrantService,
    private readonly credentials: ICredentialService,
    /**
     * Must write on a connection that survives the failing request (the pool, not the
     * request transaction): see `CreateServicesOptions.durableDb`.
     */
    private readonly credentialLockouts: ICredentialLockoutService,
    private readonly userMfa: IUserMfaService
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

  private socialConnectionProvider(
    provider: ProjectOAuthProvider
  ): ProjectOAuthConnectionProvider | null {
    if (provider === UserAuthenticationMethodProvider.Github) {
      return ProjectOAuthConnectionProvider.Github;
    }
    if (provider === UserAuthenticationMethodProvider.Google) {
      return ProjectOAuthConnectionProvider.Google;
    }
    return null;
  }

  private socialOAuthService(provider: ProjectOAuthConnectionProvider) {
    return provider === ProjectOAuthConnectionProvider.Google ? this.googleOAuth : this.githubOAuth;
  }

  private socialProviderLabel(provider: ProjectOAuthConnectionProvider): string {
    return provider === ProjectOAuthConnectionProvider.Google ? 'Google' : 'GitHub';
  }

  /**
   * BYO connection first; otherwise platform env when fallback is allowed.
   * Secrets are returned only for BYO and must not be logged or cached.
   */
  private async resolveSocialCredentials(
    projectId: string,
    provider: ProjectOAuthConnectionProvider
  ): Promise<
    { source: 'byo'; credentials: OAuthClientCredentials } | { source: 'platform' } | null
  > {
    const byo = await this.projectOAuthConnections.getDecryptedCredentials(projectId, provider);
    if (byo) {
      return { source: 'byo', credentials: byo };
    }
    if (config.projectOAuth.requireByoSocial) {
      return null;
    }
    const oauth = this.socialOAuthService(provider);
    if (!(await oauth.isConfigured())) {
      return null;
    }
    return { source: 'platform' };
  }

  private async listConfiguredSocialProviders(projectId: string): Promise<string[]> {
    const connections = await this.projectOAuthConnections.listByProject(projectId);
    const configured = new Set(
      connections.filter((row) => row.isConfigured).map((row) => row.provider)
    );
    if (!config.projectOAuth.requireByoSocial) {
      if (await this.githubOAuth.isConfigured()) {
        configured.add(ProjectOAuthConnectionProvider.Github);
      }
      if (await this.googleOAuth.isConfigured()) {
        configured.add(ProjectOAuthConnectionProvider.Google);
      }
    }
    return [ProjectOAuthConnectionProvider.Github, ProjectOAuthConnectionProvider.Google].filter(
      (provider) => configured.has(provider)
    );
  }

  /**
   * Callback must use the same client that started authorize. BYO source never
   * falls back to platform (that would mix a BYO client_id with the platform secret).
   */
  private async credentialsForCallback(
    projectId: string,
    provider: ProjectOAuthConnectionProvider,
    source: 'byo' | 'platform' | undefined
  ): Promise<OAuthClientCredentials | undefined> {
    if (source === 'byo') {
      const byo = await this.projectOAuthConnections.getDecryptedCredentials(projectId, provider);
      if (!byo) {
        throw new ConfigurationError(
          `${this.socialProviderLabel(provider)} OAuth connection is no longer configured`
        );
      }
      return byo;
    }
    if (source === 'platform') {
      const oauth = this.socialOAuthService(provider);
      if (!(await oauth.isConfigured())) {
        throw new ConfigurationError(
          `${this.socialProviderLabel(provider)} OAuth is not configured`
        );
      }
      return undefined;
    }

    throw new AuthenticationError('Invalid or expired state');
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
    const branding = await this.resolveAppBranding(app);
    const configuredProviders = await this.listConfiguredSocialProviders(app.projectId);
    return {
      name: app.name ?? null,
      enabledProviders: app.enabledProviders ?? null,
      configuredProviders,
      scopes,
      ...branding,
    };
  }

  async initiateProjectAuthorize(
    clientId: string,
    redirectUri: string,
    clientState?: string,
    provider: ProjectOAuthProvider = UserAuthenticationMethodProvider.Github,
    scopeParam?: string | null,
    locale?: string | null,
    pkce?: InitiateProjectAuthorizePkce
  ): Promise<InitiateProjectAuthorizeResult> {
    const app = await this.projectApps.getProjectAppByClientId(clientId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }

    const allowedUris = app.redirectUris ?? [];
    if (!allowedUris.length || !allowedUris.includes(redirectUri)) {
      throw new BadRequestError('redirect_uri is not allowed for this app');
    }

    if (!isProjectProviderEnabled(app.enabledProviders, provider)) {
      throw new BadRequestError(`Provider "${provider}" is not enabled for this app`);
    }
    if (!PROJECT_OAUTH_PROVIDERS.includes(provider)) {
      throw new BadRequestError(`Unknown provider: ${provider}`);
    }

    const { codeChallenge, codeChallengeMethod } = this.requireAuthorizePkce(pkce);

    const appScopeSlugs = app.scopes ?? [];
    const requestedSlugs = this.parseScopeParam(scopeParam);
    const requestedScopeSlugs =
      requestedSlugs.length > 0
        ? this.effectiveRequestedScopes(appScopeSlugs, requestedSlugs)
        : undefined;

    const stateToken = generateSecureToken(
      Math.max(1, Math.floor(config.projectOAuth.stateTtlSeconds / 60)),
      32
    );
    const stateId = stateToken.token;
    const connectionProvider = this.socialConnectionProvider(provider);
    let credentialSource: 'byo' | 'platform' | undefined;
    let byoCredentials: OAuthClientCredentials | undefined;
    if (connectionProvider) {
      const resolved = await this.resolveSocialCredentials(app.projectId, connectionProvider);
      if (!resolved) {
        throw new ConfigurationError(
          `${this.socialProviderLabel(connectionProvider)} OAuth is not configured`
        );
      }
      credentialSource = resolved.source;
      if (resolved.source === 'byo') {
        byoCredentials = resolved.credentials;
      }
    }
    const statePayload: ProjectOAuthState = {
      projectAppId: app.id,
      redirectUri,
      clientState,
      provider,
      codeChallenge,
      codeChallengeMethod,
      ...(requestedScopeSlugs?.length ? { requestedScopeSlugs } : {}),
      ...(locale?.trim() ? { locale: locale.trim() } : {}),
      ...(credentialSource ? { credentialSource } : {}),
    };
    const key = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}` as CacheKey;
    await this.cache.oauth.set(key, statePayload, config.projectOAuth.stateTtlSeconds);

    const providerImpl = this.getProviderRegistry();
    const authorizationUrl = await providerImpl[provider].getAuthorizeUrl({
      clientId,
      redirectUri,
      stateId,
      clientState,
      appName: app.name ?? undefined,
      credentials: byoCredentials,
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
        getAuthorizeUrl: (params) =>
          this.githubOAuth.getProjectAuthorizationUrl(params.stateId, params.credentials),
      },
      google: {
        getAuthorizeUrl: (params) =>
          this.googleOAuth.getProjectAuthorizationUrl(params.stateId, params.credentials),
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
      // The hosted email-and-password view. It reuses the email entry URL's configuration
      // (only its locale is read from it), so a deployment sets no extra variable.
      password: {
        getAuthorizeUrl: (params) => {
          const baseUrl = this.buildFrontendUrlWithLocale(
            config.projectOAuth.emailEntryUrl,
            '/auth/project/password'
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
    locale?: string | null,
    requestBaseUrl?: string
  ): Promise<void> {
    const app = await this.projectApps.getProjectAppByClientId(clientId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    const allowedUris = app.redirectUris ?? [];
    if (!allowedUris.length || !allowedUris.includes(redirectUri)) {
      throw new BadRequestError('redirect_uri is not allowed for this app');
    }
    if (!isProjectProviderEnabled(app.enabledProviders, 'email')) {
      throw new BadRequestError('Provider "email" is not enabled for this app');
    }

    const appScopeSlugs = app.scopes ?? [];
    const requestedSlugs = this.parseScopeParam(scopeParam);
    const requestedScopeSlugs =
      requestedSlugs.length > 0
        ? this.effectiveRequestedScopes(appScopeSlugs, requestedSlugs)
        : undefined;

    let effectiveStateId = stateId?.trim();
    let pkceFromState: { codeChallenge?: string; codeChallengeMethod?: 'S256' } = {};
    if (!effectiveStateId) {
      const stateToken = generateSecureToken(
        Math.max(1, Math.floor(config.projectOAuth.stateTtlSeconds / 60)),
        32
      );
      effectiveStateId = stateToken.token;
      const statePayload: ProjectOAuthState = {
        projectAppId: app.id,
        redirectUri,
      };
      const stateKey = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${effectiveStateId}` as CacheKey;
      await this.cache.oauth.set(stateKey, statePayload, config.projectOAuth.stateTtlSeconds);
    } else {
      const stateKey = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${effectiveStateId}` as CacheKey;
      const existingState = await this.cache.oauth.get<ProjectOAuthState>(stateKey);
      if (existingState?.codeChallenge) {
        pkceFromState = {
          codeChallenge: existingState.codeChallenge,
          ...(existingState.codeChallengeMethod
            ? { codeChallengeMethod: existingState.codeChallengeMethod }
            : {}),
        };
      }
    }

    const oneTimeToken = generateSecureToken(
      Math.max(1, Math.floor(config.projectOAuth.emailTokenTtlSeconds / 60)),
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
      ...pkceFromState,
    };
    const key = `${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}${oneTimeToken.token}` as CacheKey;
    await this.cache.oauth.set(key, payload, config.projectOAuth.emailTokenTtlSeconds);

    const baseUrl = (requestBaseUrl ?? config.app.url).replace(/\/$/, '');
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
    const key = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}` as CacheKey;
    const state = await this.cache.oauth.get<ProjectOAuthState>(key);
    if (!state) {
      throw new AuthenticationError('Invalid or expired state');
    }
    const provider = state.provider ?? UserAuthenticationMethodProvider.Github;
    if (
      provider !== UserAuthenticationMethodProvider.Github &&
      provider !== UserAuthenticationMethodProvider.Google
    ) {
      throw new BadRequestError(`Unknown provider: ${provider}`);
    }

    const connectionProvider = this.socialConnectionProvider(provider);
    if (!connectionProvider) {
      throw new BadRequestError(`Unknown provider: ${provider}`);
    }
    const oauth = this.socialOAuthService(connectionProvider);

    const app = await this.projectApps.getProjectAppById(state.projectAppId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    const redirectUri = state.redirectUri;
    const allowedUris = app.redirectUris ?? [];
    if (!allowedUris.includes(redirectUri)) {
      throw new BadRequestError('redirect_uri mismatch');
    }

    const exchangeCredentials = await this.credentialsForCallback(
      app.projectId,
      connectionProvider,
      state.credentialSource
    );
    const projectCallbackUrl = oauth.getProjectCallbackUrl();
    const accessToken = await oauth.exchangeCodeForTokenWithRedirect(
      code,
      projectCallbackUrl,
      exchangeCredentials
    );
    const user = await oauth.getOAuthUserInfo(accessToken);
    const providerId = user.id;
    const providerData = oauth.buildProviderData(user, accessToken, true);

    const userId = await this.authHandler.resolveUserIdFromOAuthForProject(
      {
        provider,
        providerId,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name ?? user.username ?? 'User',
        providerData,
      },
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
      provider,
      codeChallenge: state.codeChallenge,
      codeChallengeMethod: state.codeChallengeMethod,
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

    let codeChallenge = payload.codeChallenge;
    let codeChallengeMethod = payload.codeChallengeMethod;
    if (!codeChallenge) {
      const stateKey = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}` as CacheKey;
      const state = await this.cache.oauth.get<ProjectOAuthState>(stateKey);
      codeChallenge = state?.codeChallenge;
      codeChallengeMethod = state?.codeChallengeMethod;
    }

    return this.ensureProjectMembershipAndBuildConsentRedirect({
      userId,
      app,
      redirectUri,
      clientState: payload.clientState,
      requestedScopeSlugs: payload.requestedScopeSlugs,
      locale: payload.locale,
      provider: UserAuthenticationMethodProvider.Email,
      codeChallenge,
      codeChallengeMethod,
    });
  }

  /**
   * Sign in to a project app with email and password (ADR 0011 § 5): resolve the address to
   * a user through the Email method, require an existing membership, verify the user's
   * **project** credential (never the platform one) and hand the same consent step the
   * magic-link callback hands. It never creates an identity, a membership or a platform
   * session.
   *
   * Every failure the caller can cause by choosing the identifier or the password (unknown
   * address, not a member, no project credential, wrong password, locked) is the same
   * `AuthenticationError`, after the same bcrypt work, so the response and its timing do
   * not say which. (A request with a bad `client_id`, `redirect_uri` or state is rejected
   * first, before any identifier is looked at.)
   *
   * Lockout (ADR 0011 § 5, per `(project, user)`, keyed by the resolved user id): the
   * attempt is **recorded before it is verified** and cleared on success. Recording after
   * the compare would let a burst of parallel guesses all read the same count and all
   * be verified; recording first, in one atomic statement on a connection that survives
   * the request, bounds the verifications to the budget however many requests overlap. An
   * attempt past the budget gets the dummy compare and the generic failure, whether or not
   * the password was right. The user is keyed whether or not they are a member or hold a
   * credential, so a locked and an unlocked address look alike.
   */
  async signInWithProjectPassword(
    params: ProjectPasswordSignInParams
  ): Promise<ProjectPasswordSignInResult> {
    const { app, state } = await this.requireProjectPasswordSignInContext(
      params.clientId,
      params.redirectUri,
      params.stateId
    );
    const credentialScope: CredentialScope = { scope: 'project', projectId: app.projectId };

    const userId = await this.resolveUserIdForProjectPassword(params.email);
    if (!userId) {
      verifyCredentialPassword(params.password, null);
      throw this.invalidProjectPasswordCredentials();
    }

    const attempt = await this.credentialLockouts.recordFailure(credentialScope, userId);
    if (!this.passwordAttemptWithinBudget(attempt)) {
      verifyCredentialPassword(params.password, null);
      this.logger.warn(
        { projectId: app.projectId, userId },
        'Project password sign-in refused: credential locked'
      );
      throw this.invalidProjectPasswordCredentials();
    }

    const memberships = await this.projectUsers.getProjectUsers({
      projectId: app.projectId,
      userId,
    });
    const matches = await this.credentials.verifyPassword({
      scope: credentialScope,
      userId,
      password: params.password,
    });
    if (!matches || memberships.length === 0) {
      throw this.invalidProjectPasswordCredentials();
    }

    if (await this.requiresMfaStepUp(userId)) {
      // The attempt stays recorded until the MFA step succeeds: a password alone does not
      // clear the counter, so it cannot be used to reset the budget for guessing codes.
      const mfaToken = generateSecureToken(
        Math.max(1, Math.floor(config.projectOAuth.consentTtlSeconds / 60)),
        32
      ).token;
      const payload: ProjectOAuthPasswordMfaPayload = {
        userId,
        projectAppId: app.id,
        redirectUri: params.redirectUri,
        stateId: params.stateId,
        ...(state.clientState ? { clientState: state.clientState } : {}),
        ...(state.requestedScopeSlugs?.length
          ? { requestedScopeSlugs: state.requestedScopeSlugs }
          : {}),
        ...(params.locale?.trim() || state.locale
          ? { locale: params.locale?.trim() || state.locale }
          : {}),
        ...(state.codeChallenge
          ? { codeChallenge: state.codeChallenge, codeChallengeMethod: state.codeChallengeMethod }
          : {}),
        attempts: 0,
      };
      await this.cache.oauth.set(
        `${PROJECT_OAUTH_MFA_KEY_PREFIX}${mfaToken}` as CacheKey,
        payload,
        config.projectOAuth.consentTtlSeconds
      );
      return { status: 'mfa_required', mfaToken };
    }

    return this.completeProjectPasswordSignIn({
      credentialScope,
      userId,
      app,
      stateId: params.stateId,
      redirectUri: params.redirectUri,
      clientState: state.clientState,
      requestedScopeSlugs: state.requestedScopeSlugs,
      locale: params.locale?.trim() || state.locale,
      codeChallenge: state.codeChallenge,
      codeChallengeMethod: state.codeChallengeMethod,
    });
  }

  /**
   * Second step of a password sign-in for a user the platform requires to step up
   * (`minAalAtLogin: aal2` and an active MFA enrolment, as `computeRequiresMfaStepUp` in the
   * auth handler decides). Every code tried spends from the same `(project, user)` budget.
   */
  async verifyProjectPasswordMfa(
    params: ProjectPasswordMfaParams
  ): Promise<{ redirectUrl: string }> {
    const key = `${PROJECT_OAUTH_MFA_KEY_PREFIX}${params.mfaToken}` as CacheKey;
    const payload = await this.cache.oauth.get<ProjectOAuthPasswordMfaPayload>(key);
    if (!payload) {
      throw new BadRequestError('Invalid or expired MFA challenge');
    }
    const app = await this.projectApps.getProjectAppById(payload.projectAppId);
    if (!app || !isProjectProviderEnabled(app.enabledProviders, PROJECT_PASSWORD_PROVIDER)) {
      await this.cache.oauth.delete(key);
      throw new BadRequestError('Invalid or expired MFA challenge');
    }
    const credentialScope: CredentialScope = { scope: 'project', projectId: app.projectId };

    const attempt = await this.credentialLockouts.recordFailure(credentialScope, payload.userId);
    let verified = false;
    if (this.mfaAttemptWithinBudget(attempt)) {
      try {
        verified =
          params.method === 'recovery'
            ? await this.userMfa.verifyRecoveryCode(payload.userId, params.code)
            : (await this.userMfa.verifyTotp(payload.userId, params.code)).verified;
      } catch {
        // No enrolled factor (removed since the password step) or a malformed secret: the
        // same answer as a wrong code.
        verified = false;
      }
    }
    if (!verified) {
      const attempts = payload.attempts + 1;
      if (attempts >= PROJECT_PASSWORD_MFA_MAX_ATTEMPTS) {
        await this.cache.oauth.delete(key);
      } else {
        await this.cache.oauth.set(
          key,
          { ...payload, attempts },
          config.projectOAuth.consentTtlSeconds
        );
      }
      throw new AuthenticationError('Invalid MFA code');
    }

    await this.cache.oauth.delete(key);
    const { redirectUrl } = await this.completeProjectPasswordSignIn({
      credentialScope,
      userId: payload.userId,
      app,
      stateId: payload.stateId,
      redirectUri: payload.redirectUri,
      clientState: payload.clientState,
      requestedScopeSlugs: payload.requestedScopeSlugs,
      locale: payload.locale,
      codeChallenge: payload.codeChallenge,
      codeChallengeMethod: payload.codeChallengeMethod,
    });
    return { redirectUrl };
  }

  /**
   * Whether the attempt just recorded may be verified. The count includes this attempt, so
   * the Nth attempt (count == max, which is also the one that sets the lock) is the last
   * one allowed. An active lock with a lower count means the counter restarted when its
   * window lapsed while the lock was still running (the store keeps an active lock when it
   * restarts): that attempt is refused.
   */
  private passwordAttemptWithinBudget(attempt: CredentialLockoutStatus): boolean {
    const max = config.auth.maxFailedLoginAttempts;
    return attempt.failedAttempts <= max && (!attempt.locked || attempt.failedAttempts === max);
  }

  /**
   * An MFA code attempt comes after a password that already passed the check above, and
   * that password attempt is still counted (it is cleared only when MFA succeeds), so it
   * may have been the one that set the lock. The user who typed it right is given
   * `PROJECT_PASSWORD_MFA_MAX_ATTEMPTS` more tries on top of the budget; the same counter
   * still bounds everything an attacker holding the password can do.
   */
  private mfaAttemptWithinBudget(attempt: CredentialLockoutStatus): boolean {
    return (
      attempt.failedAttempts <=
      config.auth.maxFailedLoginAttempts + PROJECT_PASSWORD_MFA_MAX_ATTEMPTS
    );
  }

  private invalidProjectPasswordCredentials(): AuthenticationError {
    return new AuthenticationError('Invalid credentials');
  }

  /**
   * The app and the authorize-step state behind a password sign-in, or a rejection that
   * does not depend on any identifier: unknown client, a redirect URI off the allowlist,
   * the provider not enabled (`password` is opt-in), or a missing, expired or foreign
   * state (which also carries the PKCE challenge the consent step needs).
   */
  private async requireProjectPasswordSignInContext(
    clientId: string,
    redirectUri: string,
    stateId: string
  ) {
    const app = await this.projectApps.getProjectAppByClientId(clientId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
    const allowedUris = app.redirectUris ?? [];
    if (!allowedUris.length || !allowedUris.includes(redirectUri)) {
      throw new BadRequestError('redirect_uri is not allowed for this app');
    }
    if (!isProjectProviderEnabled(app.enabledProviders, PROJECT_PASSWORD_PROVIDER)) {
      throw new BadRequestError(
        `Provider "${PROJECT_PASSWORD_PROVIDER}" is not enabled for this app`
      );
    }
    const state = await this.cache.oauth.get<ProjectOAuthState>(
      `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}` as CacheKey
    );
    if (
      !state ||
      state.projectAppId !== app.id ||
      state.redirectUri !== redirectUri ||
      state.provider !== PROJECT_PASSWORD_PROVIDER ||
      !state.codeChallenge
    ) {
      throw new BadRequestError('Invalid or expired state');
    }
    return { app, state };
  }

  /**
   * The user behind an email address, through the Email method only (an address that only
   * a GitHub or Google method carries does not sign in by password), or `null`. Find-only:
   * it never creates an identity and never marks the method verified, unlike the magic link.
   */
  private async resolveUserIdForProjectPassword(email: string): Promise<string | null> {
    const method = await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
      UserAuthenticationMethodProvider.Email,
      email.trim().toLowerCase()
    );
    return method?.userId ?? null;
  }

  /** The platform's rule (`computeRequiresMfaStepUp`, `auth.handler.ts`): `aal2` and an enrolment. */
  private async requiresMfaStepUp(userId: string): Promise<boolean> {
    if (config.auth.minAalAtLogin !== 'aal2') {
      return false;
    }
    return this.userMfa.hasActiveMfaEnrollment(userId);
  }

  private async completeProjectPasswordSignIn(params: {
    credentialScope: CredentialScope;
    userId: string;
    app: {
      id: string;
      projectId: string;
      allowSignUp?: boolean | null;
      signUpRoleId?: string | null;
    };
    stateId: string;
    redirectUri: string;
    clientState?: string;
    requestedScopeSlugs?: string[];
    locale?: string | null;
    codeChallenge?: string;
    codeChallengeMethod?: 'S256';
  }): Promise<{ status: 'authenticated'; redirectUrl: string }> {
    // The password check (and, for a stepped-up user, the MFA ceremony after it) happened
    // earlier; what it established may no longer hold. Removing a member soft-deletes that
    // project's credential, so a sign-in finished after the removal must not get through,
    // and above all must not undo it: a password never creates a membership (ADR 0011 § 5),
    // whatever `allowSignUp` says. Both checks fail as the same generic answer a wrong
    // password gets, never as "not a member".
    if (!(await this.credentials.hasCredential(params.credentialScope, params.userId))) {
      throw this.invalidProjectPasswordCredentials();
    }
    const result = await this.ensureProjectMembershipAndBuildConsentRedirect({
      userId: params.userId,
      app: params.app,
      redirectUri: params.redirectUri,
      clientState: params.clientState,
      requestedScopeSlugs: params.requestedScopeSlugs,
      locale: params.locale,
      provider: PROJECT_PASSWORD_PROVIDER,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      membershipRequired: true,
    });
    await this.credentialLockouts.reset(params.credentialScope, params.userId);
    await this.cache.oauth.delete(`${PROJECT_OAUTH_STATE_KEY_PREFIX}${params.stateId}` as CacheKey);
    return { status: 'authenticated', redirectUrl: result.consentUrl };
  }

  /**
   * Ensures the user is a project member, resolves scope, stores consent payload in cache,
   * and returns the consent redirect URL. Shared by the GitHub, email and password flows;
   * the password flow passes `membershipRequired` so it can never sign anyone up.
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
    provider: ProjectOAuthProvider;
    codeChallenge?: string;
    codeChallengeMethod?: 'S256';
    /**
     * Never create a membership: a missing one is the generic `Invalid credentials`,
     * whatever `allowSignUp` is. Set by the password flow only (sign-up stays on the magic
     * link and OAuth).
     */
    membershipRequired?: boolean;
  }): Promise<HandleProjectCallbackConsentRedirectResult> {
    const {
      userId,
      app,
      redirectUri,
      clientState,
      requestedScopeSlugs,
      locale,
      provider,
      codeChallenge,
      codeChallengeMethod,
      membershipRequired,
    } = params;

    const projectUsers = await this.projectUsers.getProjectUsers({
      projectId: app.projectId,
      userId,
    });
    if (!projectUsers.length) {
      if (membershipRequired) {
        throw this.invalidProjectPasswordCredentials();
      }
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
    await this.projectUsers.syncProjectUserSearchDocument({
      projectId: app.projectId,
      userId,
    });
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
      Math.max(1, Math.floor(config.projectOAuth.consentTtlSeconds / 60)),
      32
    ).token;
    const consentPayload: ProjectOAuthConsentPayload = {
      projectAppId: app.id,
      redirectUri,
      clientState,
      userId,
      scope,
      signingScope,
      provider,
      ...(requestedScopeSlugs?.length ? { requestedScopeSlugs } : {}),
      ...(codeChallenge ? { codeChallenge, codeChallengeMethod } : {}),
    };
    const consentKey = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as CacheKey;
    await this.cache.oauth.set(consentKey, consentPayload, config.projectOAuth.consentTtlSeconds);

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
  async getProjectConsentInfo(
    consentToken: string,
    requestLogger?: ILogger
  ): Promise<ProjectConsentInfo> {
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

    let user: {
      displayName: string;
      email: string | null;
      pictureUrl: string | null;
      provider: string | null;
    } | null = null;
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
        const socialMethods = (methods ?? []).filter(
          (m) =>
            m.provider === UserAuthenticationMethodProvider.Github ||
            m.provider === UserAuthenticationMethodProvider.Google
        );
        const oauthMethod =
          socialMethods.find((m) =>
            oauthPictureUrlFromProviderData((m.providerData ?? {}) as Record<string, unknown>)
          ) ?? socialMethods[0];
        const oauthData = (oauthMethod?.providerData ?? {}) as Record<string, unknown>;

        const email =
          (emailMethod?.providerId as string | undefined)?.trim() ||
          (typeof oauthData.email === 'string' ? oauthData.email : null) ||
          null;
        const displayName =
          (u.name ?? '')?.trim() ||
          (typeof oauthData.name === 'string' ? oauthData.name : '') ||
          email ||
          '';
        const pictureUrl =
          (u.pictureUrl ?? '')?.trim() || oauthPictureUrlFromProviderData(oauthData) || null;

        user = {
          displayName: displayName || '—',
          email,
          pictureUrl: pictureUrl || null,
          provider: payload.provider ?? null,
        };
      }
    } catch (e) {
      (requestLogger ?? this.logger).warn(
        { err: e, userId: payload.userId },
        'Failed to resolve user display for consent'
      );
    }

    const branding = await this.resolveAppBranding(app);
    return { name: app.name ?? null, scopes, user, ...branding };
  }

  private async resolveAppBranding(app: {
    projectId: string;
    pictureUrl?: string | null;
    primaryColor?: string | null;
    showHelpPanel?: boolean | null;
    themeMode?: string | null;
  }) {
    const page = await this.projects.getProjects({ ids: [app.projectId], limit: 1 });
    const project = page.projects[0];
    return resolveOAuthBranding(app, {
      name: project?.name,
      pictureUrl: project?.pictureUrl,
      primaryColor: project?.primaryColor,
      showHelpPanel: project?.showHelpPanel,
    });
  }

  async handleProjectConsentApprove(consentToken: string): Promise<{ redirectUrl: string }> {
    const key = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as CacheKey;
    const payload = await this.cache.oauth.get<ProjectOAuthConsentPayload>(key);
    await this.cache.oauth.delete(key);
    if (!payload) {
      throw new AuthenticationError('Invalid or expired consent token');
    }
    if (!payload.codeChallenge) {
      throw new BadRequestError('code_challenge is required');
    }
    const app = await this.projectApps.getProjectAppById(payload.projectAppId);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }

    const code = generateAuthorizationCode();
    const codeTtl = config.projectOAuth.authorizationCodeTtlSeconds;
    if (codeTtl <= 0) {
      throw new ConfigurationError(
        'PROJECT_OAUTH_AUTHORIZATION_CODE_TTL_SECONDS must be greater than 0'
      );
    }
    const codePayload: ProjectOAuthAuthorizationCodePayload = {
      userId: payload.userId,
      projectAppId: payload.projectAppId,
      redirectUri: payload.redirectUri,
      clientState: payload.clientState,
      scope: payload.scope,
      signingScope: payload.signingScope,
      requestedScopeSlugs: payload.requestedScopeSlugs,
      codeChallenge: payload.codeChallenge,
      codeChallengeMethod: payload.codeChallengeMethod,
      clientId: app.clientId,
    };
    const codeKey = `${PROJECT_OAUTH_CODE_KEY_PREFIX}${code}` as CacheKey;
    await this.cache.oauth.set(codeKey, codePayload, codeTtl);

    const url = new URL(payload.redirectUri);
    url.searchParams.set('code', code);
    if (payload.clientState) {
      url.searchParams.set('state', payload.clientState);
    }
    return { redirectUrl: url.toString() };
  }

  async handleProjectConsentDeny(consentToken: string): Promise<{ redirectUrl: string }> {
    const key = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as CacheKey;
    const payload = await this.cache.oauth.get<ProjectOAuthConsentPayload>(key);
    await this.cache.oauth.delete(key);
    if (!payload) {
      throw new AuthenticationError('Invalid or expired consent token');
    }
    const url = new URL(payload.redirectUri);
    url.searchParams.set('error', 'access_denied');
    url.searchParams.set('error_description', 'User denied consent');
    if (payload.clientState) {
      url.searchParams.set('state', payload.clientState);
    }
    return { redirectUrl: url.toString() };
  }

  async handleProjectToken(params: HandleProjectTokenParams): Promise<HandleProjectTokenResult> {
    if (params.grantType === 'authorization_code') {
      return this.exchangeAuthorizationCode(params);
    }
    if (params.grantType === 'refresh_token') {
      return this.exchangeRefreshToken(params);
    }
    throw new ValidationError('unsupported_grant_type', ['unsupported_grant_type']);
  }

  private requireAuthorizePkce(pkce?: InitiateProjectAuthorizePkce): {
    codeChallenge: string;
    codeChallengeMethod: 'S256';
  } {
    const responseType = pkce?.responseType?.trim() || 'code';
    if (responseType !== 'code') {
      throw new BadRequestError('response_type must be code');
    }
    const codeChallenge = pkce?.codeChallenge?.trim() ?? '';
    if (!codeChallenge) {
      throw new BadRequestError('code_challenge is required');
    }
    const codeChallengeMethod = (pkce?.codeChallengeMethod?.trim() || 'S256') as string;
    if (codeChallengeMethod !== 'S256') {
      throw new BadRequestError('code_challenge_method must be S256');
    }
    if (!isValidPkceChallenge(codeChallenge)) {
      throw new BadRequestError('code_challenge is invalid');
    }
    return { codeChallenge, codeChallengeMethod: 'S256' };
  }

  private async authenticateProjectAppClient(
    clientId: string,
    clientSecret?: string
  ): Promise<{
    id: string;
    clientId: string;
    projectId: string;
    scopes?: string[] | null;
    allowSignUp?: boolean | null;
    signUpRoleId?: string | null;
    redirectUris?: string[] | null;
  }> {
    const app = await this.projectApps.getProjectAppByClientId(clientId);
    if (!app) {
      throw new AuthenticationError('invalid_client');
    }
    const clientSecretHash = await this.projectApps.getClientSecretHash(app.id);
    if (clientSecretHash) {
      if (!clientSecret || !verifySecret(clientSecret, clientSecretHash)) {
        throw new AuthenticationError('invalid_client');
      }
    }
    return app;
  }

  private async assertActiveProjectMembership(userId: string, projectId: string): Promise<Scope> {
    const userPage = await this.users.getUsers({
      ids: [userId],
      limit: 1,
      requestedFields: ['id'],
    });
    if (!userPage.users?.length) {
      throw new AuthenticationError('invalid_grant');
    }
    const scope = await this.resolveScopeForUserAndProject(userId, projectId);
    if (!scope) {
      throw new AuthenticationError('invalid_grant');
    }
    return scope;
  }

  private async exchangeAuthorizationCode(
    params: HandleProjectTokenParams
  ): Promise<HandleProjectTokenResult> {
    if (!params.code || !params.codeVerifier || !params.redirectUri) {
      throw new ValidationError('invalid_request', [
        'code, code_verifier, and redirect_uri are required',
      ]);
    }
    const app = await this.authenticateProjectAppClient(params.clientId, params.clientSecret);

    const codeKey = `${PROJECT_OAUTH_CODE_KEY_PREFIX}${params.code}` as CacheKey;
    const payload = await this.cache.oauth.get<ProjectOAuthAuthorizationCodePayload>(codeKey);
    await this.cache.oauth.delete(codeKey);
    if (!payload || payload.clientId !== app.clientId || payload.projectAppId !== app.id) {
      throw new AuthenticationError('invalid_grant');
    }
    if (payload.redirectUri !== params.redirectUri) {
      throw new AuthenticationError('invalid_grant');
    }
    if (!verifyPkceS256(params.codeVerifier, payload.codeChallenge)) {
      throw new AuthenticationError('invalid_grant');
    }

    let userScope: Scope;
    try {
      userScope = await this.assertActiveProjectMembership(payload.userId, app.projectId);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        throw err;
      }
      throw new AuthenticationError('invalid_grant');
    }

    const issued = await this.projectOAuthGrants.createGrant({
      projectAppId: app.id,
      userId: payload.userId,
      scopeTenant: payload.signingScope.tenant,
      scopeId: payload.signingScope.id,
      scopes: payload.requestedScopeSlugs ?? app.scopes ?? null,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });

    const accessToken = await this.signProjectScopedToken(
      payload.userId,
      app,
      userScope,
      payload.signingScope,
      payload.requestedScopeSlugs,
      issued.grant.id
    );
    return this.toTokenResult(
      accessToken,
      issued.refreshToken,
      payload.requestedScopeSlugs ?? app.scopes
    );
  }

  private async exchangeRefreshToken(
    params: HandleProjectTokenParams
  ): Promise<HandleProjectTokenResult> {
    if (!params.refreshToken) {
      throw new ValidationError('invalid_request', ['refresh_token is required']);
    }
    const app = await this.authenticateProjectAppClient(params.clientId, params.clientSecret);
    const issued = await this.projectOAuthGrants.rotateByRefreshToken(params.refreshToken, {
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });
    if (!issued || issued.grant.projectAppId !== app.id) {
      if (issued) {
        await this.projectOAuthGrants.revokeGrant(issued.grant.id);
      }
      throw new AuthenticationError('invalid_grant');
    }

    try {
      const userScope = await this.assertActiveProjectMembership(
        issued.grant.userId,
        app.projectId
      );
      const signingScope: Scope = {
        tenant: issued.grant.scopeTenant as Scope['tenant'],
        id: issued.grant.scopeId,
      };
      const appSlugs = app.scopes ?? [];
      const grantSlugs = issued.grant.scopes ?? [];
      const candidateSlugs =
        grantSlugs.length > 0 && appSlugs.length > 0
          ? grantSlugs.filter((slug) => appSlugs.includes(slug))
          : grantSlugs.length > 0
            ? grantSlugs
            : appSlugs;
      const accessToken = await this.signProjectScopedToken(
        issued.grant.userId,
        app,
        userScope,
        signingScope,
        candidateSlugs.length ? candidateSlugs : undefined,
        issued.grant.id
      );
      return this.toTokenResult(accessToken, issued.refreshToken, candidateSlugs);
    } catch (err) {
      await this.projectOAuthGrants.revokeGrant(issued.grant.id);
      if (err instanceof AuthenticationError) {
        throw err;
      }
      throw new AuthenticationError('invalid_grant');
    }
  }

  private toTokenResult(
    accessToken: string,
    refreshToken: string,
    scopeSlugs?: string[] | null
  ): HandleProjectTokenResult {
    const expiresIn = (config.jwt?.accessTokenExpirationMinutes ?? 60) * 60;
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      ...(scopeSlugs?.length ? { scope: scopeSlugs.join(' ') } : {}),
    };
  }

  private async signProjectScopedToken(
    userId: string,
    app: { clientId: string; scopes?: string[] | null },
    userScope: Scope,
    signingScope: Scope,
    effectiveScopeSlugs?: string[],
    jti?: string
  ): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + (config.jwt?.accessTokenExpirationMinutes ?? 60) * 60;
    const iss = buildJwksIssuerUrl(signingScope);
    const basePayload = {
      sub: userId,
      aud: app.clientId,
      iss,
      exp,
      iat,
      jti: jti ?? generateSecureToken(1, 16).token,
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
