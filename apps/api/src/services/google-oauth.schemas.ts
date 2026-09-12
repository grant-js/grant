import { z } from 'zod';

export const googleAuthorizationCodeSchema = z
  .string()
  .min(1, 'errors.validation.codeRequired')
  .max(500, 'errors.validation.codeTooLong');

export const googleAccessTokenSchema = z.string().min(1, 'errors.validation.accessTokenRequired');

export const googleUserInfoSchema = z.object({
  id: z.string().min(1, 'errors.validation.googleIdRequired'),
  email: z.string().email().nullable(),
  emailVerified: z.boolean(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  username: z.string().nullable().optional(),
});
