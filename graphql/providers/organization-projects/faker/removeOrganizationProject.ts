import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import {
  MutationRemoveOrganizationProjectArgs,
  OrganizationProject,
} from '@/graphql/generated/types';
import { deleteOrganizationProjectByOrganizationAndProject } from '@/graphql/providers/organization-projects/faker/dataStore';

export async function removeOrganizationProject({
  input,
}: MutationRemoveOrganizationProjectArgs): Promise<OrganizationProject> {
  const deletedOrganizationProject = deleteOrganizationProjectByOrganizationAndProject(
    input.organizationId,
    input.projectId
  );

  if (!deletedOrganizationProject) {
    throw new ApiError(
      'OrganizationProject not found',
      ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND
    );
  }

  return deletedOrganizationProject;
}
