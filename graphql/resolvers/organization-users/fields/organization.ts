import { OrganizationUserResolvers, OrganizationUser } from '@/graphql/generated/types';
import { createOrganizationFieldResolver } from '@/graphql/resolvers/common';

export const organizationUserOrganizationResolver: OrganizationUserResolvers['organization'] =
  createOrganizationFieldResolver<OrganizationUser>();
