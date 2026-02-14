/**
 * Account-domain service port interfaces.
 * Covers: Account, AccountProject, AccountRole, AccountTag,
 *         AccountProjectTag, AccountProjectApiKey.
 */
import type { DeleteParams } from './user.service.port';
import type { SelectedFields } from '../repositories/common';
import type {
  Account,
  AccountPage,
  AccountProject,
  AccountProjectApiKey,
  AccountProjectTag,
  AccountRole,
  AccountTag,
  AddAccountProjectInput,
  AddAccountProjectTagInput,
  AddAccountRoleInput,
  AddAccountTagInput,
  CreateAccountInput,
  OrganizationProject,
  QueryAccountProjectTagInput,
  QueryAccountsInput,
  RemoveAccountProjectInput,
  RemoveAccountProjectTagInput,
  RemoveAccountRoleInput,
  RemoveAccountTagInput,
  Role,
  UpdateAccountProjectTagInput,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// IAccountService
// ---------------------------------------------------------------------------

export interface IAccountService {
  getAccounts(
    params: QueryAccountsInput & SelectedFields<Account>,
    transaction?: unknown
  ): Promise<AccountPage>;

  getOwnerAccounts(transaction?: unknown): Promise<Account[]>;

  getAccountsByOwnerId(ownerId: string, transaction?: unknown): Promise<Account[]>;

  getExpiredAccounts(
    retentionDate: Date,
    transaction?: unknown
  ): Promise<Array<{ id: string; ownerId: string }>>;

  createAccount(
    params: Omit<CreateAccountInput, 'provider' | 'providerId' | 'providerData'>,
    transaction?: unknown
  ): Promise<Account>;

  deleteAccount(
    params: { id: string; hardDelete?: boolean },
    transaction?: unknown
  ): Promise<Account>;
}

// ---------------------------------------------------------------------------
// IAccountProjectService
// ---------------------------------------------------------------------------

export interface IAccountProjectService {
  getAccountProjects(
    params: { accountId: string },
    transaction?: unknown
  ): Promise<OrganizationProject[]>;

  getAccountProject(params: { projectId: string }, transaction?: unknown): Promise<AccountProject>;

  addAccountProject(
    params: AddAccountProjectInput,
    transaction?: unknown
  ): Promise<OrganizationProject>;

  removeAccountProject(
    params: RemoveAccountProjectInput & DeleteParams,
    transaction?: unknown
  ): Promise<OrganizationProject>;
}

// ---------------------------------------------------------------------------
// IAccountRoleService
// ---------------------------------------------------------------------------

export interface IAccountRoleService {
  getAccountRoles(params: { accountId: string }, transaction?: unknown): Promise<AccountRole[]>;

  addAccountRole(params: AddAccountRoleInput, transaction?: unknown): Promise<AccountRole>;

  removeAccountRole(
    params: RemoveAccountRoleInput & DeleteParams,
    transaction?: unknown
  ): Promise<AccountRole>;

  seedAccountRoles(
    accountId: string,
    transaction?: unknown
  ): Promise<Array<{ role: Role; accountRole: AccountRole }>>;
}

// ---------------------------------------------------------------------------
// IAccountTagService
// ---------------------------------------------------------------------------

export interface IAccountTagService {
  getAccountTags(params: { accountId: string }, transaction?: unknown): Promise<AccountTag[]>;

  addAccountTag(params: AddAccountTagInput, transaction?: unknown): Promise<AccountTag>;

  removeAccountTag(
    params: RemoveAccountTagInput & DeleteParams,
    transaction?: unknown
  ): Promise<AccountTag>;
}

// ---------------------------------------------------------------------------
// IAccountProjectTagService
// ---------------------------------------------------------------------------

export interface IAccountProjectTagService {
  getAccountProjectTags(
    params: QueryAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag[]>;

  getAccountProjectTagIntersection(
    accountId: string,
    projectIds: string[],
    tagIds: string[]
  ): Promise<AccountProjectTag[]>;

  addAccountProjectTag(
    params: AddAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag>;

  updateAccountProjectTag(
    params: UpdateAccountProjectTagInput,
    transaction?: unknown
  ): Promise<AccountProjectTag>;

  removeAccountProjectTag(
    params: RemoveAccountProjectTagInput & DeleteParams,
    transaction?: unknown
  ): Promise<AccountProjectTag>;
}

// ---------------------------------------------------------------------------
// IAccountProjectApiKeyService
// ---------------------------------------------------------------------------

export interface IAccountProjectApiKeyService {
  getAccountProjectApiKeys(
    params: { accountId?: string; projectId?: string; apiKeyId?: string },
    transaction?: unknown
  ): Promise<AccountProjectApiKey[]>;

  addAccountProjectApiKey(
    params: { accountId: string; projectId: string; apiKeyId: string; accountRoleId: string },
    transaction?: unknown
  ): Promise<AccountProjectApiKey>;

  getByApiKeyAndAccountAndProject(
    apiKeyId: string,
    accountId: string,
    projectId: string,
    transaction?: unknown
  ): Promise<AccountProjectApiKey | null>;

  resolveAccountRoleIdForCurrentUser(accountId: string, transaction?: unknown): Promise<string>;
}
