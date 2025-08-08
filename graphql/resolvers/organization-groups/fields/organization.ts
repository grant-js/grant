import { OrganizationGroupResolvers, OrganizationGroup } from '@/graphql/generated/types';
import { createOrganizationFieldResolver } from '@/graphql/resolvers/common';

export const organizationGroupOrganizationResolver: OrganizationGroupResolvers['organization'] =
  createOrganizationFieldResolver<OrganizationGroup>();
