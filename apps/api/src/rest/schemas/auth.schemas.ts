import {
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { PROJECT_OAUTH_PROVIDERS } from '@/config/env.config';
import { z } from '@/lib/zod-openapi.lib';
import { accountSchema, accountTypeSchema } from '@/rest/schemas/accounts.schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export const userAuthenticationMethodProviderSchema = z.enum(
  Object.values(UserAuthenticationMethodProvider) as [
    UserAuthenticationMethodProvider,
    ...UserAuthenticationMethodProvider[],
  ]
);

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const loginResultSchema = z.object({
  account: accountSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const loginRequestSchema = z.object({
  provider: userAuthenticationMethodProviderSchema.openapi({
    description: 'Authentication provider type',
    example: 'email',
  }),
  providerId: z.string().min(1, 'errors.validation.providerIdRequired').openapi({
    description: 'Unique identifier for the provider (email address, OAuth ID, etc.)',
    example: 'user@example.com',
  }),
  providerData: z.record(z.string(), z.unknown()).openapi({
    description: 'Additional provider-specific data',
    example: { password: '123456' },
  }),
});

export const loginResponseSchema = createSuccessResponseSchema(
  loginResultSchema,
  'Successfully authenticated user'
);

export const registerResultSchema = loginResultSchema;

export const registerRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .openapi({
      description: "User's full name",
      example: 'John Doe',
    }),
  username: z.string().optional().openapi({
    description: 'Unique username (optional, auto-generated if not provided)',
    example: 'johndoe',
  }),
  type: accountTypeSchema.openapi({
    description: 'Account type',
    example: 'personal',
  }),
  provider: userAuthenticationMethodProviderSchema.openapi({
    description: 'Authentication provider type',
    example: 'email',
  }),
  providerId: z.string().min(1, 'errors.validation.providerIdRequired').openapi({
    description: 'Unique identifier for the provider (email address, OAuth ID, etc.)',
    example: 'user@example.com',
  }),
  providerData: z.record(z.string(), z.unknown()).openapi({
    description: 'Additional provider-specific data',
    example: { email_verified: true, password: 'hashedPassword' },
  }),
});

export const registerResponseSchema = createSuccessResponseSchema(
  registerResultSchema,
  'Successfully registered new user'
);

export const refreshSessionResponseSchema = createSuccessResponseSchema(
  authTokensSchema,
  'Successfully refreshed session tokens'
);

export const logoutRequestSchema = z.object({
  sessionId: z.string().optional(),
});

export const logoutResultSchema = z.object({
  message: z.string(),
});

export const logoutResponseSchema = createSuccessResponseSchema(
  logoutResultSchema,
  'Successfully logged out'
);

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'errors.validation.tokenRequired').openapi({
    description: 'Email verification token',
    example: 'abc123def456...',
  }),
});

export const verifyEmailResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const verifyEmailResponseSchema = createSuccessResponseSchema(
  verifyEmailResultSchema,
  'Successfully verified email'
);

export const resendVerificationRequestSchema = z.object({
  email: z.string().email('errors.validation.invalidEmail').openapi({
    description: 'Email address to resend verification to',
    example: 'user@example.com',
  }),
});

export const resendVerificationResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const resendVerificationResponseSchema = createSuccessResponseSchema(
  resendVerificationResultSchema,
  'Successfully resent verification email'
);

export const requestPasswordResetRequestSchema = z.object({
  email: z.string().email('errors.validation.invalidEmail').openapi({
    description: 'Email address to send password reset link to',
    example: 'user@example.com',
  }),
});

export const requestPasswordResetResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  messageKey: z.string(),
});

export const requestPasswordResetResponseSchema = createSuccessResponseSchema(
  requestPasswordResetResultSchema,
  'Successfully sent password reset email'
);

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'errors.validation.tokenRequired').openapi({
    description: 'Password reset token from email',
    example: 'abc123def456...',
  }),
  newPassword: z.string().min(8, 'errors.validation.passwordMin8').openapi({
    description: 'New password for the account',
    example: 'NewSecurePassword123!',
  }),
});

export const resetPasswordResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  messageKey: z.string(),
});

export const resetPasswordResponseSchema = createSuccessResponseSchema(
  resetPasswordResultSchema,
  'Successfully reset password'
);

export const userAuthenticationEmailProviderActionSchema = z.enum(
  Object.values(UserAuthenticationEmailProviderAction) as [
    UserAuthenticationEmailProviderAction,
    ...UserAuthenticationEmailProviderAction[],
  ]
);

export const initiateGithubAuthQuerySchema = z.object({
  redirect: z.string().url('errors.validation.invalidRedirectUrl').optional().openapi({
    description: 'URL to redirect to after authentication',
    example: 'https://example.com/dashboard',
  }),
  accountType: accountTypeSchema.optional().openapi({
    description: 'Type of account to create',
    example: 'personal',
  }),
  action: userAuthenticationEmailProviderActionSchema.optional().openapi({
    description: 'OAuth action to perform',
    example: 'login',
  }),
  userId: z.string().uuid('errors.validation.invalidUserId').optional().openapi({
    description: 'User ID for connect action',
    example: '123e4567-e89b-12d3-a456-426614174000',
  }),
});

export const handleGithubCallbackQuerySchema = z.object({
  code: z.string().optional().openapi({
    description: 'Authorization code from GitHub',
    example: 'abc123def456...',
  }),
  state: z.string().optional().openapi({
    description: 'State token for OAuth flow validation',
    example: 'state-token-123',
  }),
  error: z.string().optional().openapi({
    description: 'Error code from GitHub OAuth',
    example: 'access_denied',
  }),
  error_description: z.string().optional().openapi({
    description: 'Error description from GitHub OAuth',
    example: 'The user denied the request',
  }),
});

export const cliCallbackRequestSchema = z.object({
  code: z.string().min(1, 'errors.validation.codeRequired').openapi({
    description: 'One-time code from CLI OAuth redirect',
    example: 'a1b2c3d4e5f6...',
  }),
});

export const cliCallbackResultSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accounts: z.array(accountSchema),
});

/** Project OAuth provider: subset of UserAuthenticationMethodProvider (from schema) supported in project-app authorize flow. */
export const projectOAuthProviderSchema = z.enum(
  PROJECT_OAUTH_PROVIDERS as unknown as [string, ...string[]]
);

export const projectAuthorizeQuerySchema = z.object({
  client_id: z.string().min(1, 'client_id required'),
  redirect_uri: z.string().url('redirect_uri must be a valid URL'),
  state: z.string().optional(),
  /** Auth provider (default: github). */
  provider: projectOAuthProviderSchema.optional().default('github'),
  /** Optional space-delimited scopes (subset of app-configured scopes). */
  scope: z.string().optional(),
  /** Frontend locale for consent redirect (e.g. en, de). */
  locale: z.string().min(1).optional(),
});

export const projectCallbackQuerySchema = z
  .object({
    /** GitHub OAuth code (when provider=github). */
    code: z.string().optional(),
    /** One-time token from magic link (when provider=email). */
    token: z.string().optional(),
    /** State from authorize; required for both flows. */
    state: z.string().min(1, 'state required'),
    /** Optional: for error redirect back to entry (email flow magic link includes these). */
    client_id: z.string().optional(),
    redirect_uri: z.string().url().optional(),
  })
  .refine(
    (data) => (data.code != null && data.code !== '') !== (data.token != null && data.token !== ''),
    { message: 'Either code (GitHub) or token (email) is required', path: ['code'] }
  );

export const projectEmailRequestSchema = z.object({
  client_id: z.string().min(1, 'client_id required'),
  redirect_uri: z.string().url('redirect_uri must be a valid URL'),
  /** Optional; when omitted or empty, server generates state for this email flow (e.g. direct link to email page). */
  state: z.string().optional(),
  email: z.string().email('email must be a valid email address'),
  client_state: z.string().optional(),
  /** Optional space-delimited scopes (subset of app-configured scopes). */
  scope: z.string().optional(),
  /** Frontend locale for consent redirect and magic-link email content (e.g. en, de). */
  locale: z.string().min(1).optional(),
});

/** Query for GET project app public info (OAuth entry/consent UI). */
export const projectAppInfoQuerySchema = z.object({
  client_id: z.string().min(1, 'client_id required'),
  /** Optional space-delimited scopes; response scopes are intersection with app-configured scopes. */
  scope: z.string().optional(),
  /** Optional redirect_uri; when provided, validated against app allowlist (returns 400 if not allowed). */
  redirect_uri: z.string().optional(),
});

/** Scope with labels for consent screen. */
export const projectAppInfoScopeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const projectAppInfoResponseSchema = z.object({
  name: z.string().nullable(),
  enabledProviders: z.array(z.string()).nullable(),
  scopes: z.array(projectAppInfoScopeSchema),
});

/** Body for POST consent/approve. */
export const projectConsentApproveBodySchema = z.object({
  consent_token: z.string().min(1, 'consent_token required'),
});

/** Body for POST consent/deny. */
export const projectConsentDenyBodySchema = z.object({
  consent_token: z.string().min(1, 'consent_token required'),
});

/** Query for GET project consent info (consent page). */
export const projectConsentInfoQuerySchema = z.object({
  consent_token: z.string().min(1, 'consent_token required'),
});

/** User display for consent page (who is consenting). */
export const projectConsentInfoUserSchema = z.object({
  displayName: z.string(),
  email: z.string().nullable(),
  pictureUrl: z.string().url().nullable(),
});

/** Response for GET project consent info. */
export const projectConsentInfoResponseSchema = z.object({
  name: z.string().nullable(),
  scopes: z.array(projectAppInfoScopeSchema),
  user: projectConsentInfoUserSchema.nullable(),
});
