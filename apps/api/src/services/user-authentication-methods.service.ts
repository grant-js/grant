import { randomBytes } from 'crypto';

import { DbSchema, userAuthenticationMethodsAuditLogs } from '@logusgraphics/grant-database';
import {
  CreateUserAuthenticationMethodInput,
  DeleteUserAuthenticationMethodInput,
  GetUserAuthenticationMethodsInput,
  UpdateUserAuthenticationMethodInput,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
} from '@logusgraphics/grant-schema';
import { compareSync, hashSync } from 'bcrypt';

import { config } from '@/config';
import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import {
  AuditService,
  DeleteParams,
  SelectedFields,
  createDynamicSingleSchema,
  emailSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  createUserAuthenticationMethodInputSchema,
  deleteUserAuthenticationMethodArgsSchema,
  parseProviderDataSchema,
  passwordPolicySchema,
  queryUserAuthenticationMethodsArgsSchema,
  updateUserAuthenticationMethodInputSchema,
  userAuthenticationMethodSchema,
} from './user-authentication-methods.schemas';

interface ProcessedProvider {
  providerData: Record<string, unknown>;
  isVerified: boolean;
}

export interface Otp {
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
      throw new NotFoundError('User authentication method not found', 'errors:auth.methodNotFound');
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
      throw new ValidationError(
        'Password is required and must be a string',
        [],
        'errors:auth.passwordRequired'
      );
    }
    if (!email || typeof email !== 'string') {
      throw new ValidationError(
        'Email is required and must be a string',
        [],
        'errors:auth.emailRequired'
      );
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
        throw new BadRequestError('Invalid action', 'errors:auth.invalidAction');
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
      throw new ConflictError(
        `Duplicate authentication method: A user with provider '${provider}' and identifier '${providerId}' already exists. Each provider-identifier combination must be unique.`,
        'errors:conflict.duplicateAuthMethod',
        { provider, providerId }
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

    if (!providerData || typeof providerData !== 'object') {
      throw new ValidationError(
        'Invalid provider data: must be a valid JSON object',
        [],
        'errors:validation.invalid',
        { field: 'providerData' }
      );
    }

    switch (provider) {
      case UserAuthenticationMethodProvider.Email:
        return this.processEmailProvider(providerId, providerData, context);
      case UserAuthenticationMethodProvider.Google:
        return this.processGoogleProvider(providerId, providerData, context);
      case UserAuthenticationMethodProvider.Github:
        return this.processGithubProvider(providerId, providerData, context);
      default:
        throw new BadRequestError('Invalid provider', 'errors:validation.invalid', {
          field: 'provider',
        });
    }
  }

  public generateOtp(): Otp {
    const token = randomBytes(32).toString('hex');
    const validUntil = Date.now() + 1000 * 60 * config.auth.otpValidityMinutes;
    return { token, validUntil };
  }

  public hashPassword(password: string): string {
    return hashSync(password, 10);
  }

  public verifyPassword(password: string, hashedPassword: string): boolean {
    return compareSync(password, hashedPassword);
  }

  public async verifyEmail(
    token: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const context = 'UserAuthenticationMethodService.verifyEmail';

    const targetMethod = await this.repositories.userAuthenticationMethodRepository.findByToken(
      token,
      transaction
    );

    if (!targetMethod) {
      throw new NotFoundError('Invalid or expired verification token', 'errors:auth.invalidToken');
    }

    if (targetMethod.isVerified) {
      return validateOutput(
        createDynamicSingleSchema(userAuthenticationMethodSchema),
        targetMethod,
        context
      );
    }

    const providerData = targetMethod.providerData as Record<string, unknown>;
    const otp = providerData.otp as Otp | undefined;

    if (!otp || !otp.validUntil) {
      throw new BadRequestError('Invalid verification token', 'errors:auth.invalidToken');
    }

    if (Date.now() > otp.validUntil) {
      throw new BadRequestError('Verification token has expired', 'errors:auth.tokenExpired');
    }

    const updatedProviderData = { ...providerData };
    delete updatedProviderData.otp;

    const updatedMethod =
      await this.repositories.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
        targetMethod.id,
        {
          id: targetMethod.id,
          isVerified: true,
          providerData: updatedProviderData,
        },
        transaction
      );

    return validateOutput(
      createDynamicSingleSchema(userAuthenticationMethodSchema),
      updatedMethod,
      context
    );
  }

  public async resendVerificationEmail(
    email: string,
    transaction?: Transaction
  ): Promise<{ token: string; validUntil: number }> {
    const context = 'UserAuthenticationMethodService.resendVerificationEmail';

    validateInput(emailSchema, email, context);

    const method = await this.findByProviderAndProviderId(
      UserAuthenticationMethodProvider.Email,
      email,
      transaction
    );

    if (!method) {
      throw new NotFoundError('Authentication method not found', 'errors:auth.methodNotFound');
    }

    if (method.isVerified) {
      throw new BadRequestError('Email is already verified', 'errors:auth.alreadyVerified');
    }

    const otp = this.generateOtp();
    const providerData = (method.providerData as Record<string, unknown>) || {};
    providerData.otp = otp;

    await this.repositories.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
      method.id,
      {
        id: method.id,
        providerData,
      },
      transaction
    );

    return otp;
  }
}
