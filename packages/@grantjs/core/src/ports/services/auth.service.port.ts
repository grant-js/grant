/**
 * Auth-domain service port interfaces.
 * Covers: Auth, OAuth providers, OAuthState, Me.
 */
import type {
  Account,
  AuthorizationResult,
  IsAuthorizedInput,
  MeResponse,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import type { GrantAuth } from '../../types';

// ---------------------------------------------------------------------------
// Shared helper types
// ---------------------------------------------------------------------------

export interface GitHubUserInfo {
  id: number;
  login: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
}

/** Normalized identity returned by any social OAuth provider. */
export interface OAuthUserInfo {
  id: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
  username?: string | null;
}

export interface GenerateStateParams {
  redirectUrl?: string;
  accountType?: string;
  userId?: string;
  action?: UserAuthenticationEmailProviderAction;
}

export interface OAuthState {
  state: string;
  redirectUrl?: string;
  accountType?: string;
  userId?: string;
  action?: UserAuthenticationEmailProviderAction;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// IAuthService
// ---------------------------------------------------------------------------

export interface IAuthService {
  isAuthorized(input: IsAuthorizedInput, userId: string): Promise<AuthorizationResult>;

  isAuthenticated(): boolean;

  getAuth(): GrantAuth | null;
}

// ---------------------------------------------------------------------------
// IOAuthProviderService (GitHub, Google, …)
// ---------------------------------------------------------------------------

export interface IOAuthProviderService {
  readonly provider: UserAuthenticationMethodProvider;

  isConfigured(): Promise<boolean>;

  getAuthorizationUrl(state: string, redirectUrl?: string): string;

  getProjectAuthorizationUrl(state: string): string;

  getProjectCallbackUrl(): string;

  exchangeCodeForToken(code: string): Promise<string>;

  exchangeCodeForTokenWithRedirect(code: string, redirectUri: string): Promise<string>;

  getOAuthUserInfo(accessToken: string): Promise<OAuthUserInfo>;

  buildProviderData(
    user: OAuthUserInfo,
    accessToken: string,
    includeUsername?: boolean
  ): Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// IGitHubOAuthService
// ---------------------------------------------------------------------------

export interface IGitHubOAuthService extends IOAuthProviderService {
  getUserInfo(accessToken: string): Promise<GitHubUserInfo>;

  validateToken(accessToken: string): Promise<boolean>;

  generateState(params: GenerateStateParams): OAuthState;
}

// ---------------------------------------------------------------------------
// IGoogleOAuthService
// ---------------------------------------------------------------------------

export type IGoogleOAuthService = IOAuthProviderService;

// ---------------------------------------------------------------------------
// IOAuthStateService
// ---------------------------------------------------------------------------

export interface IOAuthStateService {
  storeState(state: OAuthState, ttlSeconds?: number): Promise<void>;

  getState(stateToken: string): Promise<OAuthState | null>;

  deleteState(stateToken: string): Promise<void>;

  validateState(stateToken: string, maxAgeMs?: number): Promise<boolean>;

  destroy(): void;
}

// ---------------------------------------------------------------------------
// IMeService
// ---------------------------------------------------------------------------

export interface IMeService {
  getMe(transaction?: unknown): Promise<MeResponse>;

  createMySecondaryAccount(
    transaction?: unknown
  ): Promise<{ account: Account; accounts: Account[] }>;
}
