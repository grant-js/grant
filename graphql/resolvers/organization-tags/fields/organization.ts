import { OrganizationTagResolvers, OrganizationTag } from '@/graphql/generated/types';
import { createOrganizationFieldResolver } from '@/graphql/resolvers/common';

export const organizationTagOrganizationResolver: OrganizationTagResolvers['organization'] =
  createOrganizationFieldResolver<OrganizationTag>();
