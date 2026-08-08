import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { z } from 'zod';

export enum ProjectAppView {
  TABLE = 'table',
}

/** Providers available for project OAuth (subset of UserAuthenticationMethodProvider). */
export const PROJECT_OAUTH_PROVIDER_OPTIONS = [
  { id: UserAuthenticationMethodProvider.Email, nameKey: 'providers.email' },
  { id: UserAuthenticationMethodProvider.Github, nameKey: 'providers.github' },
] as const;

export const createProjectAppSchema = z
  .object({
    name: z.string().max(255, 'errors.validation.nameTooLong').optional(),
    redirectUris: z
      .array(z.url('errors.validation.invalidUrl'))
      .min(1, 'errors.validation.redirectUrisMinOne'),
    scopes: z.array(z.string()).optional(),
    enabledProviders: z.array(z.string()).optional(),
    allowSignUp: z.boolean().optional(),
    signUpRoleId: z.string().uuid().optional().or(z.literal('')).nullable(),
    tagIds: z.array(z.string()).optional(),
    primaryTagId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.allowSignUp !== false) {
        return !!data.signUpRoleId && data.signUpRoleId !== '';
      }
      return true;
    },
    { message: 'errors.validation.signUpRoleRequired', path: ['signUpRoleId'] }
  );

export type ProjectAppCreateFormValues = z.infer<typeof createProjectAppSchema>;
