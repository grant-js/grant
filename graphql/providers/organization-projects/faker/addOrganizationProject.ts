import { MutationAddOrganizationProjectArgs, OrganizationProject } from '@/graphql/generated/types';
import { addOrganizationProject as addOrganizationProjectInStore } from '@/graphql/providers/organization-projects/faker/dataStore';
export async function addOrganizationProject({
  input,
}: MutationAddOrganizationProjectArgs): Promise<OrganizationProject> {
  const organizationProjectData = addOrganizationProjectInStore(
    input.organizationId,
    input.projectId
  );
  return organizationProjectData;
}
