import { ProjectUserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

/**
 * `null` unless the caller holds `ProjectUser:ExportCredentials`; a denial is `null`, not an
 * error, so existing documents keep working. The fingerprint is computed in the service.
 */
export const projectUserPasswordCredentialResolver: ProjectUserResolvers<GraphqlContext>['passwordCredential'] =
  async (parent, _args, context) => {
    return context.handlers.users.getProjectUserPasswordCredential({
      projectId: parent.projectId,
      userId: parent.userId,
      actorUserId: context.user?.userId,
    });
  };
