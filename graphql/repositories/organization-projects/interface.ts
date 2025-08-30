import { OrganizationProject, QueryOrganizationProjectsArgs } from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

export interface IOrganizationProjectRepository {
  getOrganizationProjects(
    params: Omit<QueryOrganizationProjectsArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<OrganizationProject[]>;
  addOrganizationProject(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProject>;
  softDeleteOrganizationProject(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProject>;
  hardDeleteOrganizationProject(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProject>;
}
