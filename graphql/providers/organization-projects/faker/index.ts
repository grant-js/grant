import { addOrganizationProject } from '@/graphql/providers/organization-projects/faker/addOrganizationProject';
import { getOrganizationProjects } from '@/graphql/providers/organization-projects/faker/getOrganizationProjects';
import { removeOrganizationProject } from '@/graphql/providers/organization-projects/faker/removeOrganizationProject';
import { OrganizationProjectDataProvider } from '@/graphql/providers/organization-projects/types';
export const organizationProjectFakerProvider: OrganizationProjectDataProvider = {
  getOrganizationProjects,
  addOrganizationProject,
  removeOrganizationProject,
};
