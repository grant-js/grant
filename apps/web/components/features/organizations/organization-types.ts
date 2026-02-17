import { Organization } from '@grantjs/schema';
import { z } from 'zod';

export interface OrganizationsQueryResult {
  organizations: {
    organizations: Organization[];
    totalCount: number;
    hasNextPage: boolean;
  };
}

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'errors.validation.organizationNameRequired'),
  tagIds: z.array(z.string()).optional(),
});

export const editOrganizationSchema = z.object({
  name: z.string().min(1, 'errors.validation.organizationNameRequired'),
  tagIds: z.array(z.string()).optional(),
});

export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;
export type EditOrganizationFormValues = z.infer<typeof editOrganizationSchema>;

export enum OrganizationView {
  CARD = 'card',
  TABLE = 'table',
}
