import { UserAuthenticationEmailProviderAction } from '@grantjs/schema';
import { z } from 'zod';

export const githubAuthorizationCodeSchema = z
  .string()
  .min(1, 'Authorization code is required')
  .max(500, 'Authorization code is too long');

export const oauthStateTokenSchema = z
  .string()
  .min(1, 'State parameter is required')
  .max(500, 'State parameter is too long');

export const redirectUrlSchema = z
  .url('Redirect URL must be a valid URL')
  .max(2000, 'Redirect URL is too long')
  .optional();

export const githubAccessTokenSchema = z.string().min(1, 'Access token is required');

export const githubUserIdSchema = z.number().int().positive('GitHub user ID must be positive');

export const githubUserInfoSchema = z.object({
  id: githubUserIdSchema,
  login: z.string().min(1, 'GitHub login is required'),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  avatar_url: z.string().url(),
  bio: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
});

export const oauthStateSchema = z.object({
  state: oauthStateTokenSchema,
  redirectUrl: redirectUrlSchema.optional(),
  accountType: z.string().optional(),
  userId: z.uuid().optional(),
  action: z
    .enum(
      Object.values(UserAuthenticationEmailProviderAction) as [
        UserAuthenticationEmailProviderAction,
        ...UserAuthenticationEmailProviderAction[],
      ]
    )
    .optional(),
  createdAt: z.number().int().positive('Created timestamp must be positive'),
});

export const initiateGithubAuthInputSchema = z.object({
  redirectUrl: redirectUrlSchema,
});

export const handleGithubCallbackInputSchema = z.object({
  code: githubAuthorizationCodeSchema,
  stateToken: oauthStateTokenSchema,
  origin: z.string().min(1, 'Origin is required').url('Origin must be a valid URL'),
  locale: z.string().min(1, 'Locale is required'),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
});
