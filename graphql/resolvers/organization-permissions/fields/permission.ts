import { OrganizationPermissionResolvers, OrganizationPermission } from '@/graphql/generated/types';
import { createOrganizationPermissionFieldResolver } from '@/graphql/resolvers/common';

export const organizationPermissionPermissionResolver: OrganizationPermissionResolvers['permission'] =
  createOrganizationPermissionFieldResolver<OrganizationPermission>();
