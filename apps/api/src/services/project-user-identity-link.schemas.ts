import { z } from 'zod';

import { emailSchema, idSchema } from './common/schemas';

export const linkProjectUserIdentityParamsSchema = z.object({
  organizationId: idSchema,
  projectId: idSchema,
  userId: idSchema,
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(emailSchema),
});
