import { OrganizationRoleResolvers, OrganizationRole } from '@/graphql/generated/types';
import { createOrganizationRoleFieldResolver } from '@/graphql/resolvers/common';

export const organizationRoleRoleResolver: OrganizationRoleResolvers['role'] =
  createOrganizationRoleFieldResolver<OrganizationRole>();
