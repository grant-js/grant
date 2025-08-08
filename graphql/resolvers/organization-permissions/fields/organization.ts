import { OrganizationPermissionResolvers, OrganizationPermission } from '@/graphql/generated/types';
import { createOrganizationFieldResolver } from '@/graphql/resolvers/common';

export const organizationPermissionOrganizationResolver: OrganizationPermissionResolvers['organization'] =
  createOrganizationFieldResolver<OrganizationPermission>();
