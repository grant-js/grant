import {
  MutationAddOrganizationProjectArgs,
  MutationRemoveOrganizationProjectArgs,
  OrganizationProject,
  QueryOrganizationProjectsArgs,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

export interface IOrganizationProjectService {
  getOrganizationProjects(
    params: Omit<QueryOrganizationProjectsArgs, 'scope'>
  ): Promise<OrganizationProject[]>;
  addOrganizationProject(
    params: MutationAddOrganizationProjectArgs,
    transaction?: Transaction
  ): Promise<OrganizationProject>;
  removeOrganizationProject(
    params: MutationRemoveOrganizationProjectArgs & { hardDelete?: boolean },
    transaction?: Transaction
  ): Promise<OrganizationProject>;
}
