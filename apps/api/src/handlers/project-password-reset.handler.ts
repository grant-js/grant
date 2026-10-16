import type {
  CredentialScope,
  ICredentialLockoutService,
  ICredentialService,
  IEmailService,
  IProjectAppService,
  IProjectOAuthGrantService,
  IProjectPasswordResetService,
  IProjectUserService,
  ITransactionalConnection,
  IUserAuthenticationMethodService,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';

import { config } from '@/config';
import { PROJECT_PASSWORD_PROVIDER } from '@/config/env.config';
import { PROJECT_OAUTH_STATE_KEY_PREFIX } from '@/constants/cache.constants';
import { CacheKey, IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { buildFrontendUrlWithLocale } from '@/lib/frontend-url.lib';
import { createLogger } from '@/lib/logger';
import { isProjectProviderEnabled } from '@/lib/project-oauth-providers.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

import type { ProjectOAuthState } from './project-oauth.handler';

const PROJECT_PASSWORD_RESET_PATH = '/auth/project/reset-password';

export interface RequestProjectPasswordResetParams {
  clientId: string;
  redirectUri: string;
  email: string;
  /**
   * The API state id of the sign-in the person came from, when they came from one. It only
   * carries the client's own `state` and PKCE challenge through to the link, so that
   * signing in afterwards continues the same flow. It is never required to be live.
   */
  stateId?: string | null;
  locale?: string | null;
}

export interface CompleteProjectPasswordResetParams {
  clientId: string;
  redirectUri: string;
  token: string;
  password: string;
}

/**
 * Project-app "Forgot password?" (ADR 0011 § 6): request a reset link, and complete it.
 *
 * **No enumeration.** `requestReset` answers the same whether the address is unknown, has no
 * Email method, is not a member of the app's project, has used up its per-address limit, or
 * got an email: it returns nothing, and a failure to send is logged, never surfaced.
 * (Anything the caller chooses *other* than the address, an unknown `client_id` or a
 * `redirect_uri` off the allowlist, is rejected first, before the address is looked at.)
 */
export class ProjectPasswordResetHandler {
  private readonly logger = createLogger('ProjectPasswordResetHandler');

  constructor(
    private readonly projectApps: IProjectAppService,
    private readonly projectUsers: IProjectUserService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly credentials: ICredentialService,
    private readonly credentialLockouts: ICredentialLockoutService,
    private readonly projectPasswordResets: IProjectPasswordResetService,
    private readonly projectOAuthGrants: IProjectOAuthGrantService,
    private readonly email: IEmailService,
    private readonly cache: IEntityCacheAdapter,
    private readonly db: ITransactionalConnection<Transaction>
  ) {}

  async requestReset(params: RequestProjectPasswordResetParams): Promise<void> {
    const app = await this.requireApp(params.clientId, params.redirectUri);

    const method = await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
      UserAuthenticationMethodProvider.Email,
      params.email.trim().toLowerCase()
    );
    if (!method || method.provider !== UserAuthenticationMethodProvider.Email) {
      return;
    }
    const memberships = await this.projectUsers.getProjectUsers({
      projectId: app.projectId,
      userId: method.userId,
    });
    if (memberships.length === 0) {
      return;
    }

    const issued = await this.projectPasswordResets.issueToken({
      projectId: app.projectId,
      userId: method.userId,
      authMethodId: method.id,
    });
    if (!issued) {
      this.logger.warn(
        { projectId: app.projectId, userId: method.userId },
        'Project password reset not sent: per-address request limit reached'
      );
      return;
    }

    const hints = await this.readStateHints(params.stateId, app.id, params.redirectUri);
    const locale = params.locale?.trim() || hints?.locale || undefined;
    try {
      await this.email.sendProjectPasswordReset({
        to: method.providerId,
        resetUrl: this.buildResetUrl({
          clientId: params.clientId,
          redirectUri: params.redirectUri,
          token: issued.token,
          locale,
          hints,
        }),
        validUntil: issued.expiresAt.getTime(),
        appName: app.name ?? undefined,
        ...(locale ? { locale } : {}),
      });
    } catch (error) {
      // The caller must not learn that this address exists by a delivery failure.
      this.logger.error(
        { err: error, projectId: app.projectId, userId: method.userId },
        'Failed to send project password reset email'
      );
    }
  }

  /**
   * Set the member's project password from a reset token. One transaction: the token is
   * consumed, the credential written (`source: reset`, so no later import overwrites it),
   * the `(project, user)` lockout cleared, the Email method's mailbox marked verified, and
   * every project-app grant the user holds in this project revoked. If any step fails the
   * token is still usable. Neither scope's other credential is read or written.
   */
  async completeReset(params: CompleteProjectPasswordResetParams): Promise<void> {
    const app = await this.requireApp(params.clientId, params.redirectUri);

    // First, and before the token is touched: a password the policy rejects must not burn a
    // single-use token. The refusal names the rules, never the password.
    this.projectPasswordResets.assertPasswordMeetsPolicy(params.password);

    const scope: CredentialScope = { scope: 'project', projectId: app.projectId };

    await this.db.withTransaction(async (tx) => {
      const consumed = await this.projectPasswordResets.consumeToken(
        { projectId: app.projectId, token: params.token },
        tx
      );
      if (!consumed) {
        throw this.invalidResetLink();
      }

      // A member removed since the request has no project credential to reset.
      const memberships = await this.projectUsers.getProjectUsers(
        { projectId: app.projectId, userId: consumed.userId },
        tx
      );
      if (memberships.length === 0) {
        throw this.invalidResetLink();
      }

      await this.credentials.setPassword(
        { scope, userId: consumed.userId, password: params.password, source: 'reset' },
        tx
      );
      await this.credentialLockouts.reset(scope, consumed.userId, tx);

      // The link reached the mailbox: the one global fact a reset proves, exactly as the
      // magic link does. The platform credential is not touched.
      const method = await this.userAuthenticationMethods.getUserAuthenticationMethod(
        consumed.authMethodId,
        tx
      );
      if (
        method.userId === consumed.userId &&
        method.provider === UserAuthenticationMethodProvider.Email &&
        !method.isVerified
      ) {
        await this.userAuthenticationMethods.updateUserAuthenticationMethod(
          method.id,
          { isVerified: true },
          tx
        );
      }

      await this.projectOAuthGrants.revokeAllForUserInProject(app.projectId, consumed.userId, tx);
    });
  }

  private invalidResetLink(): BadRequestError {
    return new BadRequestError('Invalid or expired password reset link');
  }

  /**
   * The app behind a request, or a rejection that does not depend on any address or token:
   * unknown client, a redirect URI off the allowlist, password sign-in not enabled.
   */
  private async requireApp(clientId: string, redirectUri: string) {
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
    return app;
  }

  private async readStateHints(
    stateId: string | null | undefined,
    projectAppId: string,
    redirectUri: string
  ): Promise<ProjectOAuthState | null> {
    const id = stateId?.trim();
    if (!id) return null;
    const state = await this.cache.oauth.get<ProjectOAuthState>(
      `${PROJECT_OAUTH_STATE_KEY_PREFIX}${id}` as CacheKey
    );
    return state && state.projectAppId === projectAppId && state.redirectUri === redirectUri
      ? state
      : null;
  }

  /**
   * The hosted reset view. The token is in the URL **fragment**: a fragment is not sent to
   * any server, not logged by a proxy and not put in a `Referer`. The rest is what the view
   * needs to send the person back to the password sign-in of the same app.
   */
  private buildResetUrl(input: {
    clientId: string;
    redirectUri: string;
    token: string;
    locale?: string;
    hints: ProjectOAuthState | null;
  }): string {
    const base = buildFrontendUrlWithLocale(
      config.projectOAuth.emailEntryUrl,
      PROJECT_PASSWORD_RESET_PATH,
      input.locale
    );
    const url = new URL(base);
    url.searchParams.set('client_id', input.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    const { hints } = input;
    if (hints?.clientState) url.searchParams.set('client_state', hints.clientState);
    if (hints?.requestedScopeSlugs?.length) {
      url.searchParams.set('scope', hints.requestedScopeSlugs.join(' '));
    }
    if (hints?.codeChallenge) {
      url.searchParams.set('code_challenge', hints.codeChallenge);
      url.searchParams.set('code_challenge_method', hints.codeChallengeMethod ?? 'S256');
    }
    url.hash = `token=${encodeURIComponent(input.token)}`;
    return url.toString();
  }
}
