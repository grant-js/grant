import { randomBytes } from 'crypto';

import { DbSchema } from '@logusgraphics/grant-database';
import { userAuthenticationMethodsAuditLogs } from '@logusgraphics/grant-database';
import {
  GetUserAuthenticationMethodsInput,
  DeleteUserAuthenticationMethodInput,
  UserAuthenticationMethod,
  CreateUserAuthenticationMethodInput,
  UserAuthenticationMethodProvider,
  UpdateUserAuthenticationMethodInput,
  UserAuthenticationEmailProviderAction,
} from '@logusgraphics/grant-schema';
import { hashSync, compareSync } from 'bcrypt';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
  emailSchema,
} from '../common';

import {
  userAuthenticationMethodSchema,
  queryUserAuthenticationMethodsArgsSchema,
  createUserAuthenticationMethodInputSchema,
  deleteUserAuthenticationMethodArgsSchema,
  updateUserAuthenticationMethodInputSchema,
  sendOtpSchema,
  parseProviderDataSchema,
  passwordPolicySchema,
} from './schemas';

interface ProcessedProvider {
  providerData: Record<string, unknown>;
  isVerified: boolean;
}

interface Otp {
  token: string;
  validUntil: number;
}

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

  public async getUserAuthenticationMethodByProvider(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    providerData?: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod | null> {
    const method =
      await this.repositories.userAuthenticationMethodRepository.findByProviderAndProviderId(
        provider,
        providerId,
        providerData,
        transaction
      );

    if (method) {
      return method;
    }

    return null;
  }

  public async getUserAuthenticationMethods(
    params: GetUserAuthenticationMethodsInput & SelectedFields<UserAuthenticationMethod>
  ): Promise<UserAuthenticationMethod[]> {
    const context = 'UserAuthenticationMethodService.getUserAuthenticationMethods';
    validateInput(queryUserAuthenticationMethodsArgsSchema, params, context);
    const result =
      await this.repositories.userAuthenticationMethodRepository.getUserAuthenticationMethods(
        params
      );

    return result.map((method: UserAuthenticationMethod) => {
      return validateOutput(userAuthenticationMethodSchema, method, context);
    });
  }

  public async createUserAuthenticationMethod(
    params: Omit<CreateUserAuthenticationMethodInput, 'providerData'> & {
      providerData?: Record<string, unknown>;
    },
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const context = 'UserAuthenticationMethodService.createUserAuthenticationMethod';

    validateInput(createUserAuthenticationMethodInputSchema, params, context);

    await this.validateProviderUniqueness(params.provider, params.providerId, transaction);

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
        id,
        input,
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
    params: Omit<DeleteUserAuthenticationMethodInput, 'scope'> & DeleteParams,
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

  private processEmailProvider(
    email: string,
    providerData: Record<string, unknown>,
    context: string
  ): ProcessedProvider {
    const { password, action } = providerData;
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required and must be a string');
    }
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }
    validateInput(emailSchema, email, context);
    switch (action) {
      case UserAuthenticationEmailProviderAction.Login:
        return {
          providerData: {
            password,
          },
          isVerified: false,
        };
      case UserAuthenticationEmailProviderAction.Signup: {
        const validatedPassword = validateInput(passwordPolicySchema, password, context);
        const hashedPassword = this.hashPassword(validatedPassword);
        const otp = this.generateOtp();
        return {
          providerData: {
            otp,
            hashedPassword,
          },
          isVerified: false,
        };
      }
      default:
        throw new Error('Invalid action');
    }
  }

  private processGoogleProvider(
    providerId: string,
    providerData: Record<string, unknown>,
    _context: string
  ): ProcessedProvider {
    // TODO: implement google provider
    return { providerData, isVerified: false };
  }

  private processGithubProvider(
    providerId: string,
    providerData: Record<string, unknown>,
    _context: string
  ): ProcessedProvider {
    // TODO: implement github provider
    return { providerData, isVerified: false };
  }

  private async findByProviderAndProviderId(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod | null> {
    const context = 'UserAuthenticationMethodService.findByProviderAndProviderId';

    validateInput(
      parseProviderDataSchema.pick({ provider: true, providerId: true }),
      { provider, providerId },
      context
    );

    const result =
      await this.repositories.userAuthenticationMethodRepository.findByProviderAndProviderId(
        provider,
        providerId,
        undefined,
        transaction
      );

    if (result) {
      return validateOutput(
        createDynamicSingleSchema(userAuthenticationMethodSchema),
        result,
        context
      );
    }

    return null;
  }

  private async validateProviderUniqueness(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    transaction?: Transaction
  ): Promise<void> {
    const existingMethod = await this.findByProviderAndProviderId(
      provider,
      providerId,
      transaction
    );

    if (existingMethod) {
      throw new Error(
        `Duplicate authentication method: A user with provider '${provider}' and identifier '${providerId}' already exists. Each provider-identifier combination must be unique.`
      );
    }
  }

  public async processProvider(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    providerData: Record<string, unknown>
  ): Promise<ProcessedProvider> {
    const context = 'UserAuthenticationMethodService.processProvider';
    validateInput(parseProviderDataSchema, { providerId, provider, providerData }, context);

    // providerData is now a direct JSON object, no need to parse
    if (!providerData || typeof providerData !== 'object') {
      throw new Error('Invalid provider data: must be a valid JSON object');
    }

    switch (provider) {
      case UserAuthenticationMethodProvider.Email:
        return this.processEmailProvider(providerId, providerData, context);
      case UserAuthenticationMethodProvider.Google:
        return this.processGoogleProvider(providerId, providerData, context);
      case UserAuthenticationMethodProvider.Github:
        return this.processGithubProvider(providerId, providerData, context);
      default:
        throw new Error('Invalid provider');
    }
  }

  public generateOtp(): Otp {
    const token = randomBytes(32).toString('hex');
    const DEFAULT_OTP_VALIDITY_MINUTES = 5;
    const otpValidityMinutes = Number(
      process.env.OTP_VALIDITY_MINUTES || DEFAULT_OTP_VALIDITY_MINUTES
    );
    const validUntil = Date.now() + 1000 * 60 * otpValidityMinutes;
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
