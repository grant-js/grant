import { deleteOrganization as deleteOrganizationInStore } from '@/graphql/providers/organizations/faker/dataStore';
import {
  DeleteOrganizationParams,
  DeleteOrganizationResult,
} from '@/graphql/providers/organizations/types';

export async function deleteOrganization({
  id,
}: DeleteOrganizationParams): Promise<DeleteOrganizationResult> {
  const organizationData = deleteOrganizationInStore(id);
  if (!organizationData) {
    throw new Error('Organization not found');
  }
  return true; // Return boolean indicating successful deletion
}
