import { OrganizationTagResolvers, OrganizationTag } from '@/graphql/generated/types';
import { createOrganizationTagFieldResolver } from '@/graphql/resolvers/common';

export const organizationTagTagResolver: OrganizationTagResolvers['tag'] =
  createOrganizationTagFieldResolver<OrganizationTag>();
