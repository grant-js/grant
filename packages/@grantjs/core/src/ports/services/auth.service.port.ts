/**
 * Auth-domain service port interfaces.
 * Covers: Auth, GitHubOAuth, OAuthState, Me.
 */
import type { GrantAuth } from '../../types';
import type {
  Account,
  AuthorizationResult,
  IsAuthorizedInput,
  MeResponse,
  UserAuthenticationEmailProviderAction,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// Shared helper types
// ---------------------------------------------------------------------------

export interface GitHubUserInfo {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
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
// IGitHubOAuthService
// ---------------------------------------------------------------------------

export interface IGitHubOAuthService {
  getAuthorizationUrl(state: string, redirectUrl?: string): string;

  exchangeCodeForToken(code: string): Promise<string>;

  getUserInfo(accessToken: string): Promise<GitHubUserInfo>;

  validateToken(accessToken: string): Promise<boolean>;

  generateState(params: GenerateStateParams): OAuthState;

  isConfigured(): boolean;
}

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
