import { CREDENTIAL_SOURCES } from '@grantjs/core';
import { z } from 'zod';

import { idSchema } from './common/schemas';

/**
 * Only the non-secret part of a call is validated with zod. `validateInput` puts a sample
 * of the data into its error message, which would put a password or a hash into an
 * error that reaches the log and the response.
 */

const credentialScopeSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('platform') }),
  z.object({ scope: z.literal('project'), projectId: idSchema }),
]);

const credentialSourceSchema = z.enum(CREDENTIAL_SOURCES);

export const credentialTargetSchema = z.object({
  scope: credentialScopeSchema,
  userId: idSchema,
});

export const credentialWriteTargetSchema = credentialTargetSchema.extend({
  source: credentialSourceSchema,
});
