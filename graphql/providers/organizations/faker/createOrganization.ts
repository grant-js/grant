import { Organization } from '@/graphql/generated/types';
import { createOrganization as createOrganizationInStore } from '@/graphql/providers/organizations/faker/dataStore';
import {
  CreateOrganizationParams,
  CreateOrganizationResult,
} from '@/graphql/providers/organizations/types';

export async function createOrganization({
  input,
}: CreateOrganizationParams): Promise<CreateOrganizationResult> {
  const organizationData = createOrganizationInStore(input);
  return organizationData as Organization; // Convert OrganizationData to Organization for GraphQL
}
