import {
  QueryProjectTagsArgs,
  MutationAddProjectTagArgs,
  MutationRemoveProjectTagArgs,
  ProjectTag,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

export interface IProjectTagRepository {
  getProjectTags(params: QueryProjectTagsArgs, transaction?: Transaction): Promise<ProjectTag[]>;
  addProjectTag(params: MutationAddProjectTagArgs, transaction?: Transaction): Promise<ProjectTag>;
  softDeleteProjectTag(
    params: MutationRemoveProjectTagArgs,
    transaction?: Transaction
  ): Promise<ProjectTag>;
  hardDeleteProjectTag(
    params: MutationRemoveProjectTagArgs,
    transaction?: Transaction
  ): Promise<ProjectTag>;
}
