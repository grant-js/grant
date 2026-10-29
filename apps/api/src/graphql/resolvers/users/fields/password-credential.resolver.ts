import { UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

/**
 * `null` outside a project scope, and unless the caller holds `ProjectUser:ExportCredentials`;
 * a denial is `null`, not an error, so existing documents keep working. The fingerprint is
 * computed in the service.
 */
export const userPasswordCredentialResolver: UserResolvers<GraphqlContext>['passwordCredential'] =
  async (parent, _args, context) => {
    const scope = context.user?.scope;
    if (!scope) {
      return null;
    }
    return context.handlers.users.getProjectUserPasswordCredential({
      userId: parent.id,
      scope,
      actorUserId: context.user?.userId,
    });
  };
