/**
 * Account-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  Account,
  AccountPage,
  AccountProject,
  AccountProjectApiKey,
  AccountProjectTag,
  AccountRole,
  AccountTag,
  AddAccountProjectApiKeyInput,
  AddAccountProjectInput,
  AddAccountProjectTagInput,
  AddAccountRoleInput,
  AddAccountTagInput,
  CreateAccountInput,
  QueryAccountProjectApiKeysInput,
  QueryAccountProjectInput,
  QueryAccountProjectsInput,
  QueryAccountProjectTagInput,
  QueryAccountRolesInput,
  QueryAccountsInput,
  QueryAccountTagsInput,
  RemoveAccountProjectInput,
  RemoveAccountProjectTagInput,
  RemoveAccountRoleInput,
  RemoveAccountTagInput,
  UpdateAccountProjectTagInput,
  UpdateAccountTagInput,
} from '@grantjs/schema';

export interface IAccountRepository {
  getAccounts(
    params: QueryAccountsInput & SelectedFields<Account>,
    transaction?: unknown
  ): Promise<AccountPage>;

  getAccountsByOwnerId(
    ownerId: string,
    transaction?: unknown,
    requestedFields?: Array<keyof Account>
  ): Promise<Account[]>;

  getActiveAccountsByOwnerId(
    ownerId: string,
    transaction?: unknown
  ): Promise<
    Array<{
      id: string;
      ownerId: string;
      type: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }>
  >;

  getExpiredAccounts(
    retentionDate: Date,
    transaction?: unknown
  ): Promise<Array<{ id: string; ownerId: string }>>;

  createAccount(
    params: Omit<CreateAccountInput, 'provider' | 'providerId' | 'providerData'>,
    transaction?: unknown
  ): Promise<Account>;

  softDeleteAccount(accountId: string, transaction?: unknown): Promise<Account>;

  hardDeleteAccount(accountId: string, transaction?: unknown): Promise<Account>;
}

export interface IAccountProjectRepository {
  getAccountProjects(
    params: QueryAccountProjectsInput,
    transaction?: unknown
  ): Promise<AccountProject[]>;

  getAccountProject(
    params: QueryAccountProjectInput,
    transaction?: unknown
  ): Promise<AccountProject>;

  addAccountProject(params: AddAccountProjectInput, transaction?: unknown): Promise<AccountProject>;

  softDeleteAccountProject(
    params: RemoveAccountProjectInput,
    transaction?: unknown
  ): Promise<AccountProject>;

  hardDeleteAccountProject(
    params: RemoveAccountProjectInput,
    transaction?: unknown
  ): Promise<AccountProject>;

  getFirstByProjectId(projectId: string, transaction?: unknown): Promise<AccountProject | null>;
}

export interface IAccountRoleRepository {
  getAccountRoles(params: QueryAccountRolesInput, transaction?: unknown): Promise<AccountRole[]>;

  addAccountRole(params: AddAccountRoleInput, transaction?: unknown): Promise<AccountRole>;

  softDeleteAccountRole(
    params: RemoveAccountRoleInput,
    transaction?: unknown
  ): Promise<AccountRole>;

  hardDeleteAccountRole(
    params: RemoveAccountRoleInput,
    transaction?: unknown
  ): Promise<AccountRole>;
}

export interface IAccountTagRepository {
  getAccountTags(params: QueryAccountTagsInput, transaction?: unknown): Promise<AccountTag[]>;

  addAccountTag(params: AddAccountTagInput, transaction?: unknown): Promise<AccountTag>;

  updateAccountTag(params: UpdateAccountTagInput, transaction?: unknown): Promise<AccountTag>;

  softDeleteAccountTag(params: RemoveAccountTagInput, transaction?: unknown): Promise<AccountTag>;

  hardDeleteAccountTag(params: RemoveAccountTagInput, transaction?: unknown): Promise<AccountTag>;
}

export interface IAccountProjectTagRepository {
  getAccountProjectTags(
    params: QueryAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag[]>;

  getAccountProjectTagIntersection(
    accountId: string,
    projectIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<AccountProjectTag[]>;

  getAccountProjectTag(
    params: QueryAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag>;

  addAccountProjectTag(
    params: AddAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag>;

  updateAccountProjectTag(
    params: UpdateAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag>;

  softDeleteAccountProjectTag(
    params: RemoveAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag>;

  hardDeleteAccountProjectTag(
    params: RemoveAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag>;
}

export interface IAccountProjectApiKeyRepository {
  getAccountProjectApiKeys(
    params: QueryAccountProjectApiKeysInput,
    transaction?: unknown
  ): Promise<AccountProjectApiKey[]>;

  addAccountProjectApiKey(
    params: AddAccountProjectApiKeyInput,
    transaction?: unknown
  ): Promise<AccountProjectApiKey>;

  getByApiKeyAndAccountAndProject(
    apiKeyId: string,
    accountId: string,
    projectId: string,
    transaction?: unknown
  ): Promise<AccountProjectApiKey | null>;
}
