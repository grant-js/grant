import { ResolverFn } from '@/graphql/generated/types';
import { Context } from '@/graphql/types';

/**
 * Helper function to get a project by ID and organization ID
 */
const getProjectById = async (projectId: string, organizationId: string, context: Context) => {
  const projectsResult = await context.providers.projects.getProjects({
    ids: [projectId],
    organizationId,
    limit: -1,
  });

  const project = projectsResult.projects[0];

  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }

  return project;
};

/**
 * Common project field resolver for project pivot types
 * Reusable across all project-* resolvers (project-users, project-roles, etc.)
 */
export const createProjectFieldResolver =
  <T extends { projectId: string }>(): ResolverFn<any, T, Context, { organizationId: string }> =>
  async (parent, { organizationId }, context) => {
    return getProjectById(parent.projectId, organizationId, context);
  };

/**
 * Common project field resolver for organization-project pivot types
 * Uses parent's organizationId instead of argument
 */
export const createOrganizationProjectFieldResolver =
  <T extends { projectId: string; organizationId: string }>(): ResolverFn<any, T, Context, any> =>
  async (parent, _args, context) => {
    return getProjectById(parent.projectId, parent.organizationId, context);
  };
