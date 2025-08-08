import { OrganizationRoleResolvers, OrganizationRole } from '@/graphql/generated/types';
import { createOrganizationFieldResolver } from '@/graphql/resolvers/common';

export const organizationRoleOrganizationResolver: OrganizationRoleResolvers['organization'] =
  createOrganizationFieldResolver<OrganizationRole>();
