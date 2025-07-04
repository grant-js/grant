import { GraphQLResolveInfo } from 'graphql';
import { Context } from '@/graphql/types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  label: Scalars['String']['input'];
};

/** Input type for creating a new user. */
export type CreateUserInput = {
  /** Email address of the user. */
  email: Scalars['String']['input'];
  /** Full name of the user. */
  name: Scalars['String']['input'];
  /** List of role IDs to assign to the user. */
  roleIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Input type for user authentication. */
export type LoginInput = {
  /** Email address of the user. */
  email: Scalars['String']['input'];
  /** Password of the user. */
  password: Scalars['String']['input'];
};

/** Response type for successful authentication. */
export type LoginResponse = {
  __typename?: 'LoginResponse';
  /** JWT token for authenticated requests. */
  token: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  /** Creates a new role. */
  createRole: Role;
  /** Creates a new user. */
  createUser: User;
  /** Deletes a role by ID. */
  deleteRole: Scalars['Boolean']['output'];
  /** Deletes a user. */
  deleteUser: User;
  /** Authenticates a user and returns a JWT token. */
  login: LoginResponse;
  /** Updates an existing role. */
  updateRole: Role;
  /** Updates an existing user. */
  updateUser: User;
};


export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationUpdateRoleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRoleInput;
};


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  /** Retrieves a paginated list of roles. */
  roles: RolePage;
  /** Retrieves a paginated list of users. */
  users: UserPage;
};


export type QueryRolesArgs = {
  limit: Scalars['Int']['input'];
  page: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<RoleSortInput>;
};


export type QueryUsersArgs = {
  limit: Scalars['Int']['input'];
  page: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<UserSortInput>;
};

/** Represents a user role in the system. */
export type Role = {
  __typename?: 'Role';
  description?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the role. */
  id: Scalars['ID']['output'];
  /** Human-readable label for the role. */
  label: Scalars['String']['output'];
};

/** Represents a paginated list of roles. */
export type RolePage = {
  __typename?: 'RolePage';
  /** Whether there are more roles available on the next page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** List of roles for the current page. */
  roles: Array<Role>;
  /** Total number of roles across all pages. */
  totalCount: Scalars['Int']['output'];
};

/** Input for sorting roles. */
export type RoleSortInput = {
  field: RoleSortableField;
  order: RoleSortOrder;
};

/** Sort order for roles. */
export enum RoleSortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Fields by which roles can be sorted. */
export enum RoleSortableField {
  Name = 'name'
}

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
};

/** Input type for updating an existing user. */
export type UpdateUserInput = {
  /** Email address of the user. */
  email: Scalars['String']['input'];
  /** Full name of the user. */
  name: Scalars['String']['input'];
  /** List of role IDs to assign to the user. */
  roleIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Represents a user in the system. */
export type User = {
  __typename?: 'User';
  /** Email address of the user. */
  email: Scalars['String']['output'];
  /** Unique identifier for the user. */
  id: Scalars['ID']['output'];
  /** Full name of the user. */
  name: Scalars['String']['output'];
  /** List of roles assigned to the user. */
  roles: Array<Role>;
};

/** Represents a paginated list of users. */
export type UserPage = {
  __typename?: 'UserPage';
  /** Whether there are more users available on the next page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Total number of users across all pages. */
  totalCount: Scalars['Int']['output'];
  /** List of users for the current page. */
  users: Array<User>;
};

/** Input for sorting users. */
export type UserSortInput = {
  field: UserSortableField;
  order: UserSortOrder;
};

/** Sort order for users. */
export enum UserSortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Fields by which users can be sorted. */
export enum UserSortableField {
  Email = 'email',
  Name = 'name'
}

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateRoleInput: CreateRoleInput;
  CreateUserInput: CreateUserInput;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  LoginInput: LoginInput;
  LoginResponse: ResolverTypeWrapper<LoginResponse>;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
  Role: ResolverTypeWrapper<Role>;
  RolePage: ResolverTypeWrapper<RolePage>;
  RoleSortInput: RoleSortInput;
  RoleSortOrder: RoleSortOrder;
  RoleSortableField: RoleSortableField;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateRoleInput: UpdateRoleInput;
  UpdateUserInput: UpdateUserInput;
  User: ResolverTypeWrapper<User>;
  UserPage: ResolverTypeWrapper<UserPage>;
  UserSortInput: UserSortInput;
  UserSortOrder: UserSortOrder;
  UserSortableField: UserSortableField;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  CreateRoleInput: CreateRoleInput;
  CreateUserInput: CreateUserInput;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  LoginInput: LoginInput;
  LoginResponse: LoginResponse;
  Mutation: {};
  Query: {};
  Role: Role;
  RolePage: RolePage;
  RoleSortInput: RoleSortInput;
  String: Scalars['String']['output'];
  UpdateRoleInput: UpdateRoleInput;
  UpdateUserInput: UpdateUserInput;
  User: User;
  UserPage: UserPage;
  UserSortInput: UserSortInput;
}>;

export type LoginResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['LoginResponse'] = ResolversParentTypes['LoginResponse']> = ResolversObject<{
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  _empty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createRole?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<MutationCreateRoleArgs, 'input'>>;
  createUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationCreateUserArgs, 'input'>>;
  deleteRole?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteRoleArgs, 'id'>>;
  deleteUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationDeleteUserArgs, 'id'>>;
  login?: Resolver<ResolversTypes['LoginResponse'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'input'>>;
  updateRole?: Resolver<ResolversTypes['Role'], ParentType, ContextType, RequireFields<MutationUpdateRoleArgs, 'id' | 'input'>>;
  updateUser?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateUserArgs, 'id' | 'input'>>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  _empty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  roles?: Resolver<ResolversTypes['RolePage'], ParentType, ContextType, RequireFields<QueryRolesArgs, 'limit' | 'page'>>;
  users?: Resolver<ResolversTypes['UserPage'], ParentType, ContextType, RequireFields<QueryUsersArgs, 'limit' | 'page'>>;
}>;

export type RoleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RolePageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['RolePage'] = ResolversParentTypes['RolePage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserPageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserPage'] = ResolversParentTypes['UserPage']> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  LoginResponse?: LoginResponseResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RolePage?: RolePageResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserPage?: UserPageResolvers<ContextType>;
}>;

