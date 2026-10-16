import { z } from 'zod';

import { idSchema } from './common/schemas';

export const createProjectOAuthGrantInputSchema = z.object({
  projectAppId: idSchema,
  userId: idSchema,
  scopeTenant: z.string().min(1).max(50),
  scopeId: z.string().min(1).max(255),
  scopes: z.array(z.string().min(1)).nullable().optional(),
  userAgent: z.string().max(500).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
});

export const revokeUserGrantsInProjectInputSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
});
