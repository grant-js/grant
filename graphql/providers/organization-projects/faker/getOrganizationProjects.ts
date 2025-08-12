import { OrganizationProject, QueryOrganizationProjectsArgs } from '@/graphql/generated/types';
import { getOrganizationProjectsByOrganizationId } from '@/graphql/providers/organization-projects/faker/dataStore';
export async function getOrganizationProjects({
  organizationId,
}: QueryOrganizationProjectsArgs): Promise<OrganizationProject[]> {
  const organizationProjectData = getOrganizationProjectsByOrganizationId(organizationId);
  return organizationProjectData;
}
