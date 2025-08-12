import { z } from 'zod';

import { Organization } from '@/graphql/generated/types';

// GraphQL query result types
export interface OrganizationsQueryResult {
  organizations: {
    organizations: Organization[];
    totalCount: number;
    hasNextPage: boolean;
  };
}

// Form schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  tagIds: z.array(z.string()).optional(),
});

export const editOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  tagIds: z.array(z.string()).optional(),
});

// Form value types
export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;
export type EditOrganizationFormValues = z.infer<typeof editOrganizationSchema>;
