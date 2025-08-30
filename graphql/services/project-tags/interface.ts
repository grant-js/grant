import {
  MutationAddProjectTagArgs,
  MutationRemoveProjectTagArgs,
  ProjectTag,
  QueryProjectTagsArgs,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

export interface IProjectTagService {
  getProjectTags(params: Omit<QueryProjectTagsArgs, 'scope'>): Promise<ProjectTag[]>;
  addProjectTag(params: MutationAddProjectTagArgs, transaction?: Transaction): Promise<ProjectTag>;
  removeProjectTag(
    params: MutationRemoveProjectTagArgs & { hardDelete?: boolean },
    transaction?: Transaction
  ): Promise<ProjectTag>;
}
