import { OrganizationUserResolvers, OrganizationUser } from '@/graphql/generated/types';
import { createOrganizationUserFieldResolver } from '@/graphql/resolvers/common';

export const organizationUserUserResolver: OrganizationUserResolvers['user'] =
  createOrganizationUserFieldResolver<OrganizationUser>();
