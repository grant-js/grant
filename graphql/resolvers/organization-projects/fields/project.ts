import { OrganizationProjectResolvers, OrganizationProject } from '@/graphql/generated/types';
import { createOrganizationProjectFieldResolver } from '@/graphql/resolvers/common';

export const organizationProjectProjectResolver: OrganizationProjectResolvers['project'] =
  createOrganizationProjectFieldResolver<OrganizationProject>();
