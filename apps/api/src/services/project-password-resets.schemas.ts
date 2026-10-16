import { z } from 'zod';

import { idSchema } from './common/schemas';

/** A token is 64 hex characters; anything longer is refused before it is hashed. */
export const MAX_PROJECT_PASSWORD_RESET_TOKEN_LENGTH = 512;

export const issueProjectPasswordResetInputSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
  authMethodId: idSchema,
});
