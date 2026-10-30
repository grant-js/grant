import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const setProjectExportableApiKeySecretsResolver: MutationResolvers<GraphqlContext>['setProjectExportableApiKeySecrets'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projects.setProjectExportableApiKeySecrets({ input });
  };
