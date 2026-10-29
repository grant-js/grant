import {
  GrantAuth,
  type IAuditLogger,
  type ICredentialService,
  type IEventPublisher,
  type IFileStorageService,
  type IUserRepository,
  type IUserService,
  type OptionalListScope,
} from '@grantjs/core';
import {
  CreateUserInput,
  MutationDeleteUserArgs,
  QueryUsersArgs,
  UpdateUserInput,
  User,
  UserAuthenticationMethodProvider,
  UserPage,
} from '@grantjs/schema';

import { config } from '@/config';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { buildDelta } from '@/lib/events/event-delta.lib';
import { resolveExternalKeys } from '@/lib/events/event-external-keys.lib';
import {
  hydratePictureUrl,
  hydratePictureUrls,
  picturePathWhenSettingUrl,
} from '@/lib/picture-url.lib';
import { assertNotLastHumanUser } from '@/lib/signup-policy.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import {
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  deleteSchema,
  validateInput,
  validateOutput,
  validatePage,
} from './common';
import {
  createUserInputSchema,
  deleteUserArgsSchema,
  queryUsersArgsSchema,
  updateUserArgsSchema,
  userSchema,
} from './users.schemas';

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger,
    private readonly fileStorage: IFileStorageService,
    private readonly credentials: ICredentialService,
    private readonly events: IEventPublisher
  ) {}

  private async getUser(userId: string): Promise<User> {
    const existingUsers = await this.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (existingUsers.users.length === 0) {
      throw new NotFoundError('User');
    }

    return existingUsers.users[0];
  }

  public async getUsers(
    params: Omit<QueryUsersArgs, 'scope'> & OptionalListScope & SelectedFields<User>,
    transaction?: Transaction
  ): Promise<UserPage> {
    const context = 'UserService.getUsers';
    validateInput(queryUsersArgsSchema, params, context);
    const result = await this.userRepository.getUsers(params, transaction);

    validatePage(
      createDynamicPaginatedSchema(userSchema, params.requestedFields),
      result.users,
      result,
      context
    );

    await hydratePictureUrls(this.fileStorage, result.users);
    for (const listed of result.users) {
      const accounts = listed.accounts;
      if (!Array.isArray(accounts)) {
        continue;
      }
      for (const account of accounts) {
        if (account.owner) {
          await hydratePictureUrl(this.fileStorage, account.owner);
        }
      }
    }

    return result;
  }

  public async createUser(
    params: Omit<CreateUserInput, 'scope' | 'roleIds' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<User> {
    const context = 'UserService.createUser';
    validateInput(createUserInputSchema, params, context);
    const user = await this.userRepository.createUser(params, transaction);

    const newValues = {
      id: user.id,
      name: user.name,
      metadata: user.metadata,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(user.id, newValues, metadata, transaction);

    // The user's projects are resolved for symmetry with `user.updated` and `user.deleted`.
    // A user that was just created is normally a member of none, so this is normally
    // empty; a later join is announced by `project.user_added`.
    const projectIds = await this.events.resolveLinkedProjectIds(
      [{ kind: 'user', id: user.id }],
      transaction
    );

    // Webhook payload: ids and timestamps only. The name and metadata of the
    // platform identity are not exposed by any other event.
    await this.events.publish(
      {
        type: 'user.created',
        subjectUserId: user.id,
        aggregate: { kind: 'user', id: user.id },
        data: { after: { id: user.id, createdAt: user.createdAt, updatedAt: user.updatedAt } },
        projectIds,
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(userSchema), user, context);
  }

  public async updateUser(
    id: string,
    input: Omit<UpdateUserInput, 'scope'> & { picturePath?: string | null },
    transaction?: Transaction
  ): Promise<User> {
    const context = 'UserService.updateUser';
    const validatedParams = validateInput(
      updateUserArgsSchema,
      { id, input: picturePathWhenSettingUrl(input) },
      context
    );

    const oldUser = await this.getUser(validatedParams.id);
    const updatedUser = await this.userRepository.updateUser(
      validatedParams.id,
      validatedParams.input,
      transaction
    );

    const oldValues = {
      id: oldUser.id,
      name: oldUser.name,
      metadata: oldUser.metadata,
      createdAt: oldUser.createdAt,
      updatedAt: oldUser.updatedAt,
    };

    const newValues = {
      id: updatedUser.id,
      name: updatedUser.name,
      metadata: updatedUser.metadata,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logUpdate(updatedUser.id, oldValues, newValues, metadata, transaction);

    // Only the names of the fields that changed travel in the event, never their
    // values (name, metadata and picture are personal data). An update that changed
    // nothing, such as filling an already filled picture, emits nothing.
    const requested = Object.keys(validatedParams.input);
    const pick = (user: User) =>
      Object.fromEntries(
        requested.map((key) => [key, (user as unknown as Record<string, unknown>)[key]])
      );
    const changedFields = Object.keys(buildDelta(pick(oldUser), pick(updatedUser)));
    if (changedFields.length > 0) {
      // Name the projects the user is a member of, so an identity change made in an
      // organization, account or `me` scope still reaches their project subscriptions.
      // Nothing is removed here, so unlike `user.deleted` there is no ordering to respect.
      const projectIds = await this.events.resolveLinkedProjectIds(
        [{ kind: 'user', id: updatedUser.id }],
        transaction
      );
      await this.events.publish(
        {
          type: 'user.updated',
          subjectUserId: updatedUser.id,
          aggregate: { kind: 'user', id: updatedUser.id },
          data: {
            after: { id: updatedUser.id, changedFields, updatedAt: updatedUser.updatedAt },
          },
          projectIds,
        },
        transaction
      );
    }

    validateOutput(createDynamicSingleSchema(userSchema), updatedUser, context);
    await hydratePictureUrl(this.fileStorage, updatedUser);
    return updatedUser;
  }

  public async deleteUser(
    params: Omit<MutationDeleteUserArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<User> {
    const context = 'UserService.deleteUser';
    const validatedParams = validateInput(deleteUserArgsSchema, params, context);
    const { id, hardDelete } = validatedParams;

    const oldUser = await this.getUser(id);
    const humanUserCount = await this.userRepository.countHumanUsers(
      config.system.systemUserId,
      transaction
    );
    assertNotLastHumanUser({
      userId: id,
      systemUserId: config.system.systemUserId,
      humanUserCount,
    });
    const isHardDelete = hardDelete === true;

    const oldValues = {
      id: oldUser.id,
      name: oldUser.name,
      createdAt: oldUser.createdAt,
      updatedAt: oldUser.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    // For hard deletes, write the audit log BEFORE the entity is removed so the
    // FK (user_audit_logs.user_id → users.id) is still valid.  The subsequent
    // DELETE will trigger ON DELETE SET NULL on the audit row, but the old data
    // is preserved in the oldValues JSON column.
    if (isHardDelete) {
      await this.audit.logHardDelete(oldUser.id, oldValues, metadata, transaction);
    }

    // The event goes in BEFORE the delete, for the same reason: `event_log.subject_user_id`
    // and `actor_user_id` reference `users.id`, so inserting a row that names a user a
    // hard delete has already removed would fail and abort the transaction. A hard
    // delete then nulls both columns on the row (ON DELETE SET NULL), so
    // `grantsubjectuser` is `null` for it; `data.after.id` and the envelope `subject`
    // still name the user. The user's projects are read now, while the memberships exist.
    const projectIds = await this.events.resolveLinkedProjectIds(
      [{ kind: 'user', id: oldUser.id }],
      transaction
    );
    // The user's import keys, read in the same place and for the same reason: the memberships
    // that carry the per-project keys are gone after the delete. Every project's entry is
    // stored; the webhook projection keeps only the receiving subscription's own.
    const externalKeys = resolveExternalKeys(
      oldUser.metadata,
      await this.userRepository.getUserMembershipMetadata(oldUser.id, transaction)
    );
    await this.events.publish(
      {
        type: 'user.deleted',
        subjectUserId: oldUser.id,
        aggregate: { kind: 'user', id: oldUser.id },
        data: {
          // No name: the outbox row outlives a hard delete, which is an erasure. `externalKeys`
          // is a pseudonymous source-system id and is kept on a hard delete too.
          before: {
            id: oldUser.id,
            createdAt: oldUser.createdAt,
            updatedAt: oldUser.updatedAt,
            externalKeys,
          },
          after: { id: oldUser.id, hardDelete: isHardDelete },
        },
        projectIds,
      },
      transaction
    );

    const deletedUser = isHardDelete
      ? await this.userRepository.hardDeleteUser(validatedParams, transaction)
      : await this.userRepository.softDeleteUser(validatedParams, transaction);

    if (!isHardDelete) {
      // A hard delete cascades to every credential row; a soft delete removes the user from
      // sign-in, so their credentials (and lockout state) go with it, in this transaction.
      await this.credentials.removeAllForUser(deletedUser.id, transaction);
      const newValues = {
        ...oldValues,
        deletedAt: deletedUser.deletedAt,
      };
      await this.audit.logSoftDelete(deletedUser.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(userSchema), deletedUser, context);
  }

  public async deleteOwnUser(params: DeleteParams, transaction?: Transaction): Promise<User> {
    const context = 'UserService.deleteOwnUser';
    const validatedParams = validateInput(deleteSchema, params, context);
    const { hardDelete } = validatedParams;

    const id = this.user?.userId;

    if (!id) {
      throw new AuthenticationError('Not authenticated');
    }

    return this.deleteUser({ id, hardDelete }, transaction);
  }

  public async countHumanUsers(transaction?: Transaction): Promise<number> {
    return this.userRepository.countHumanUsers(config.system.systemUserId, transaction);
  }

  public async getEmailVerificationStatus(
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const usersResult = await this.userRepository.getUsers(
      {
        ids: [userId],
        limit: 1,
        requestedFields: ['authenticationMethods'],
      },
      transaction
    );

    const user = usersResult.users[0];
    if (!user) {
      return true;
    }

    const allAuthMethods = Array.isArray(user.authenticationMethods)
      ? user.authenticationMethods
      : [];

    const emailAuthMethod = allAuthMethods.find(
      (method) => method.provider === UserAuthenticationMethodProvider.Email
    );

    if (!emailAuthMethod) {
      return true;
    }

    return emailAuthMethod.isVerified;
  }
}
