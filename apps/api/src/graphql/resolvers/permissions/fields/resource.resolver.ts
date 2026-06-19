import { PermissionResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const permissionResourceResolver: PermissionResolvers<GraphqlContext>['resource'] = async (
  parent,
  _args,
  context
) => {
  if (parent.resource) {
    return parent.resource;
  }

  const resourceId = (parent as { resourceId?: string | null }).resourceId;
  if (!resourceId) return null;
  return context.handlers.resources.getResourceById(resourceId);
};
