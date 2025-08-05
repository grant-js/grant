import { Organization } from '@/graphql/generated/types';
import { updateOrganization as updateOrganizationInStore } from '@/graphql/providers/organizations/faker/dataStore';
import {
  UpdateOrganizationParams,
  UpdateOrganizationResult,
} from '@/graphql/providers/organizations/types';

export async function updateOrganization({
  id,
  input,
}: UpdateOrganizationParams): Promise<UpdateOrganizationResult> {
  const organizationData = updateOrganizationInStore(id, input);
  if (!organizationData) {
    throw new Error('Organization not found');
  }
  return organizationData as Organization; // Convert OrganizationData to Organization for GraphQL
}
