import { z } from 'zod';

export const PROJECT_APP_TEST_FORM_ID = 'project-app-test-form';

export const testAppSchema = z.object({
  redirectUri: z.string().min(1, 'errors.validation.required'),
  scopes: z.array(z.string()).optional(),
});

export type ProjectAppTestFormValues = z.infer<typeof testAppSchema>;
