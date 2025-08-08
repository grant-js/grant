import { ResolverFn } from '@/graphql/generated/types';
import { Context } from '@/graphql/types';

/**
 * Common project field resolver for project pivot types
 * Reusable across all project-* resolvers (project-users, project-roles, etc.)
 */
export const createProjectFieldResolver =
  <T extends { projectId: string }>(): ResolverFn<any, T, Context, any> =>
  async (parent, { organizationId }, context) => {
    // Get the project by projectId using the data store directly
    const projects = await context.providers.projects.getProjects({
      ids: [parent.projectId],
      organizationId,
      limit: -1,
    });

    const project = projects.projects[0];

    if (!project) {
      throw new Error(`Project with ID ${parent.projectId} not found`);
    }

    return project;
  };

/**
 * Common project field resolver for organization-project pivot types
 * Uses parent's organizationId instead of argument
 */
export const createOrganizationProjectFieldResolver =
  <T extends { projectId: string; organizationId: string }>(): ResolverFn<any, T, Context, any> =>
  async (parent, _args, context) => {
    // Get the project by projectId using the data store directly
    const projects = await context.providers.projects.getProjects({
      ids: [parent.projectId],
      organizationId: parent.organizationId,
      limit: -1,
    });

    const project = projects.projects[0];

    if (!project) {
      throw new Error(`Project with ID ${parent.projectId} not found`);
    }

    return project;
  };
