import { UserAuthenticationEmailProviderAction } from '@grantjs/schema';
import { z } from 'zod';

export const githubAuthorizationCodeSchema = z
  .string()
  .min(1, 'errors.validation.codeRequired')
  .max(500, 'errors.validation.codeTooLong');

export const oauthStateTokenSchema = z
  .string()
  .min(1, 'errors.validation.stateRequired')
  .max(500, 'errors.validation.stateTooLong');

export const redirectUrlSchema = z
  .url('Redirect URL must be a valid URL')
  .max(2000, 'errors.validation.redirectUrlTooLong')
  .optional();

export const githubAccessTokenSchema = z.string().min(1, 'errors.validation.accessTokenRequired');

export const githubUserIdSchema = z.number().int().positive('GitHub user ID must be positive');

export const githubUserInfoSchema = z.object({
  id: githubUserIdSchema,
  login: z.string().min(1, 'errors.validation.githubLoginRequired'),
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
  origin: z.string().min(1, 'errors.validation.originRequired').url('errors.validation.invalidUrl'),
  locale: z.string().min(1, 'errors.validation.localeRequired'),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
});
