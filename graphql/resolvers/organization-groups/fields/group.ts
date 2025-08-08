import { OrganizationGroupResolvers, OrganizationGroup } from '@/graphql/generated/types';
import { createOrganizationGroupFieldResolver } from '@/graphql/resolvers/common';

export const organizationGroupGroupResolver: OrganizationGroupResolvers['group'] =
  createOrganizationGroupFieldResolver<OrganizationGroup>();
