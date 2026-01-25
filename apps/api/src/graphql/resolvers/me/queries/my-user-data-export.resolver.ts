import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const myUserDataExportResolver: QueryResolvers<GraphqlContext>['myUserDataExport'] = async (
  _parent,
  _args,
  context
) => {
  const result = await context.handlers.me.myUserDataExport();
  return result.data;
};
