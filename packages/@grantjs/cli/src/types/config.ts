/**
 * Stored scope for the selected project (tenant + id).
 * Used by generate-types and displayed after setup.
 */
export interface GrantScope {
  tenant: string;
  id: string;
}

/**
 * Session: only tokens are stored (no credentials like email/password).
 * refreshToken enables implicit refresh for commands that require authentication.
 */
export interface SessionCredentials {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * API key credentials (clientId + clientSecret, scope).
 * Token is obtained by exchanging at runtime; we store key material.
 */
export interface ApiKeyCredentials {
  clientId: string;
  clientSecret: string;
  scope: GrantScope;
}

/**
 * Per-profile config (one project / API context).
 * Secrets (token, clientSecret) are stored in the same file with strict file permissions (0o600).
 */
export interface GrantConfig {
  apiUrl: string;
  authMethod: 'session' | 'api-key';
  /** Present when authMethod is session */
  session?: SessionCredentials;
  /** Present when authMethod is api-key */
  apiKey?: ApiKeyCredentials;
  /** Selected project scope (for generate-types). Set after start flow. */
  selectedScope?: GrantScope;
  /** Default output path for generate-types (e.g. ./src/grant-types.ts). Optional. */
  generateTypesOutputPath?: string;
}

/** Name of a profile (key in profiles). */
export type ProfileName = string;

/**
 * Config file: multiple profiles and a default.
 * First profile configured becomes default unless set otherwise.
 */
export interface GrantConfigFile {
  /** Which profile to use when --profile is not passed. */
  defaultProfile: ProfileName;
  /** Named profiles (e.g. "default", "staging", "client-x"). */
  profiles: Record<ProfileName, GrantConfig>;
}
