import { randomBytes } from 'crypto';

import { hashSync, compareSync } from 'bcrypt';

import {
  QueryUserAuthenticationMethodsArgs,
  MutationDeleteUserAuthenticationMethodArgs,
  UserAuthenticationMethod,
  CreateUserAuthenticationMethodInput,
  UserAuthenticationMethodProvider,
  UpdateUserAuthenticationMethodInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { userAuthenticationMethodsAuditLogs } from '@/graphql/repositories/user-authentication-methods/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
} from '../common';

import {
  userAuthenticationMethodSchema,
  queryUserAuthenticationMethodsArgsSchema,
  createUserAuthenticationMethodInputSchema,
  deleteUserAuthenticationMethodArgsSchema,
  validateTokenSchema,
  updateUserAuthenticationMethodInputSchema,
  sendOtpSchema,
} from './schemas';

export class UserAuthenticationMethodService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(userAuthenticationMethodsAuditLogs, 'userAuthenticationMethodId', user, db);
  }

  private async getUserAuthenticationMethod(id: string): Promise<UserAuthenticationMethod> {
    const method =
      await this.repositories.userAuthenticationMethodRepository.getUserAuthenticationMethod(id);

    if (!method) {
      throw new Error('User authentication method not found');
    }

    return method;
  }

  public async getUserAuthenticationMethods(
    params: QueryUserAuthenticationMethodsArgs & SelectedFields<UserAuthenticationMethod>
  ): Promise<UserAuthenticationMethod[]> {
    const context = 'UserAuthenticationMethodService.getUserAuthenticationMethods';
    validateInput(queryUserAuthenticationMethodsArgsSchema, params, context);
    const result =
      await this.repositories.userAuthenticationMethodRepository.getUserAuthenticationMethods(
        params
      );

    return result.map((method: UserAuthenticationMethod) =>
      validateOutput(createDynamicSingleSchema(userAuthenticationMethodSchema), method, context)
    );
  }

  public async createUserAuthenticationMethod(
    params: CreateUserAuthenticationMethodInput & { providerData?: Record<string, unknown> },
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const context = 'UserAuthenticationMethodService.createUserAuthenticationMethod';

    validateInput(createUserAuthenticationMethodInputSchema, params, context);

    const userAuthenticationMethod =
      await this.repositories.userAuthenticationMethodRepository.createUserAuthenticationMethod(
        params,
        transaction
      );

    const newValues = {
      id: userAuthenticationMethod.id,
      userId: userAuthenticationMethod.userId,
      provider: userAuthenticationMethod.provider,
      providerId: userAuthenticationMethod.providerId,
      isVerified: userAuthenticationMethod.isVerified,
      isPrimary: userAuthenticationMethod.isPrimary,
      createdAt: userAuthenticationMethod.createdAt,
      updatedAt: userAuthenticationMethod.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(userAuthenticationMethod.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(userAuthenticationMethodSchema),
      userAuthenticationMethod,
      context
    );
  }

  public async updateUserAuthenticationMethod(
    id: string,
    input: UpdateUserAuthenticationMethodInput & { providerData?: Record<string, unknown> },
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const context = 'UserAuthenticationMethodService.updateUserAuthenticationMethod';

    validateInput(updateUserAuthenticationMethodInputSchema, input, context);

    const oldUserAuthenticationMethod = await this.getUserAuthenticationMethod(id);

    const updatedUserAuthenticationMethod =
      await this.repositories.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
        { id, input },
        transaction
      );

    const oldValues = {
      id: oldUserAuthenticationMethod.id,
      userId: oldUserAuthenticationMethod.userId,
      provider: oldUserAuthenticationMethod.provider,
      providerId: oldUserAuthenticationMethod.providerId,
      isVerified: oldUserAuthenticationMethod.isVerified,
      isPrimary: oldUserAuthenticationMethod.isPrimary,
      createdAt: oldUserAuthenticationMethod.createdAt,
      updatedAt: oldUserAuthenticationMethod.updatedAt,
    };

    const newValues = {
      id: updatedUserAuthenticationMethod.id,
      userId: updatedUserAuthenticationMethod.userId,
      provider: updatedUserAuthenticationMethod.provider,
      providerId: updatedUserAuthenticationMethod.providerId,
      isVerified: updatedUserAuthenticationMethod.isVerified,
      isPrimary: updatedUserAuthenticationMethod.isPrimary,
      createdAt: updatedUserAuthenticationMethod.createdAt,
      updatedAt: updatedUserAuthenticationMethod.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logUpdate(
      updatedUserAuthenticationMethod.id,
      oldValues,
      newValues,
      metadata,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(userAuthenticationMethodSchema),
      updatedUserAuthenticationMethod,
      context
    );
  }

  public async deleteUserAuthenticationMethod(
    params: Omit<MutationDeleteUserAuthenticationMethodArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const context = 'UserAuthenticationMethodService.deleteUserAuthenticationMethod';
    const validatedParams = validateInput(
      deleteUserAuthenticationMethodArgsSchema,
      params,
      context
    );
    const { id, hardDelete } = validatedParams;

    const oldUserAuthenticationMethod = await this.getUserAuthenticationMethod(id);
    const isHardDelete = hardDelete === true;

    const deletedUserAuthenticationMethod = isHardDelete
      ? await this.repositories.userAuthenticationMethodRepository.hardDeleteUserAuthenticationMethod(
          validatedParams,
          transaction
        )
      : await this.repositories.userAuthenticationMethodRepository.softDeleteUserAuthenticationMethod(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: oldUserAuthenticationMethod.id,
      userId: oldUserAuthenticationMethod.userId,
      provider: oldUserAuthenticationMethod.provider,
      providerId: oldUserAuthenticationMethod.providerId,
      isVerified: oldUserAuthenticationMethod.isVerified,
      isPrimary: oldUserAuthenticationMethod.isPrimary,
      createdAt: oldUserAuthenticationMethod.createdAt,
      updatedAt: oldUserAuthenticationMethod.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(
        deletedUserAuthenticationMethod.id,
        oldValues,
        metadata,
        transaction
      );
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedUserAuthenticationMethod.deletedAt,
      };
      await this.logSoftDelete(
        deletedUserAuthenticationMethod.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(userAuthenticationMethodSchema),
      deletedUserAuthenticationMethod,
      context
    );
  }

  public async validateAuthProvider(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    token: string
  ): Promise<Record<string, unknown> | undefined> {
    const context = 'UserAuthenticationMethodService.validateToken';
    validateInput(validateTokenSchema, { provider, token }, context);
    let providerData;
    switch (provider) {
      case UserAuthenticationMethodProvider.Email:
        // TODO: validate token against stored otp
        break;
      case UserAuthenticationMethodProvider.Google:
        // TODO: validate with google sdk
        break;
      case UserAuthenticationMethodProvider.Github:
        // TODO: validate with github sdk
        break;
    }
    return providerData;
  }

  public generateOtp(): { token: string; validUntil: number } {
    const token = randomBytes(32).toString('hex');
    const validUntil = Date.now() + 1000 * 60 * 5; // 5 minutes
    return { token, validUntil };
  }

  public async sendOtp(email: string, token: string): Promise<void> {
    const context = 'UserAuthenticationMethodService.sendOtp';
    validateInput(sendOtpSchema, { email, token }, context);
    // TODO: send OTP to user
  }

  public hashPassword(password: string): string {
    return hashSync(password, 10);
  }

  public verifyPassword(password: string, hashedPassword: string): boolean {
    return compareSync(password, hashedPassword);
  }
}
