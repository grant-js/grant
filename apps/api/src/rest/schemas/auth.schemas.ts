import {
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

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
  providerId: z.string().min(1, 'Provider ID is required').openapi({
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
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').openapi({
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
  providerId: z.string().min(1, 'Provider ID is required').openapi({
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

export const refreshSessionRequestSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required').openapi({
    description: 'Current access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
  refreshToken: z.string().min(1, 'Refresh token is required').openapi({
    description: 'Refresh token to obtain a new access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
});

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
  token: z.string().min(1, 'Token is required').openapi({
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
  email: z.string().email('Invalid email address').openapi({
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
  email: z.string().email('Invalid email address').openapi({
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
  token: z.string().min(1, 'Token is required').openapi({
    description: 'Password reset token from email',
    example: 'abc123def456...',
  }),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').openapi({
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
  redirect: z.string().url('Invalid redirect URL').optional().openapi({
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
  userId: z.string().uuid('Invalid user ID').optional().openapi({
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
    description: 'State token for CSRF protection',
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
  code: z.string().min(1, 'Code is required').openapi({
    description: 'One-time code from CLI OAuth redirect',
    example: 'a1b2c3d4e5f6...',
  }),
});

export const cliCallbackResultSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accounts: z.array(accountSchema),
});
