import { OrganizationProjectResolvers, OrganizationProject } from '@/graphql/generated/types';
import { createOrganizationFieldResolver } from '@/graphql/resolvers/common';

export const organizationProjectOrganizationResolver: OrganizationProjectResolvers['organization'] =
  createOrganizationFieldResolver<OrganizationProject>();
