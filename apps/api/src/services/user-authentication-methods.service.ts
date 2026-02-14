import {
  CreateUserAuthenticationMethodInput,
  DeleteUserAuthenticationMethodInput,
  GetUserAuthenticationMethodsInput,
  UpdateUserAuthenticationMethodInput,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { config } from '@/config';
import {
  AuthenticationError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import {
  generateSecureToken,
  hashSecret,
  isTokenValid,
  verifySecret,
} from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';
import type { Otp } from '@/types';

import { createDynamicSingleSchema, emailSchema, validateInput, validateOutput } from './common';
import {
  createUserAuthenticationMethodInputSchema,
  deleteUserAuthenticationMethodArgsSchema,
  emailProviderDataSchema,
  githubProviderDataSchema,
  parseProviderDataSchema,
  passwordPolicySchema,
  queryUserAuthenticationMethodsArgsSchema,
  updateUserAuthenticationMethodInputSchema,
  userAuthenticationMethodSchema,
} from './user-authentication-methods.schemas';

import type {
  IAuditLogger,
  IUserAuthenticationMethodRepository,
  IUserAuthenticationMethodService,
  IUserSessionRepository,
} from '@grantjs/core';

interface ProcessedProvider {
  providerData: Record<string, unknown>;
  isVerified: boolean;
  name: string;
}


export class UserAuthenticationMethodService implements IUserAuthenticationMethodService {
  constructor(
    private readonly userAuthenticationMethodRepository: IUserAuthenticationMethodRepository,
    private readonly userSessionRepository: IUserSessionRepository,
    private readonly audit: IAuditLogger
  ) {}

  public async getUserAuthenticationMethod(
    id: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const method = await this.userAuthenticationMethodRepository.getUserAuthenticationMethod(
      id,
      transaction
    );

    if (!method) {
      throw new NotFoundError('UserAuthenticationMethod');
    }

    return method;
  }

  public async getUserAuthenticationMethodByProvider(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    requestedFields?: string[],
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod | null> {
    const method = await this.userAuthenticationMethodRepository.findByProviderAndProviderId(
      provider,
      providerId,
      undefined,
      transaction
    );

    if (method) {
      return method;
    }

    return null;
  }

  public async getUserAuthenticationMethodByEmail(
    email: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod | null> {
    const method = await this.userAuthenticationMethodRepository.findByEmail(email, transaction);

    return method || null;
  }

  public async getUserAuthenticationMethods(
    params: GetUserAuthenticationMethodsInput & SelectedFields<UserAuthenticationMethod>,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod[]> {
    const context = 'UserAuthenticationMethodService.getUserAuthenticationMethods';
    validateInput(queryUserAuthenticationMethodsArgsSchema, params, context);
    const result = await this.userAuthenticationMethodRepository.getUserAuthenticationMethods(
      params,
      transaction
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

    const existingMethods = await this.getUserAuthenticationMethods(
      { userId: params.userId },
      transaction
    );

    const hasProvider = existingMethods.some((m) => m.provider === params.provider);
    if (hasProvider) {
      throw new BadRequestError(`User already has a ${params.provider} authentication method`);
    }

    const existingAuthMethod = await this.findByProviderAndProviderId(
      params.provider,
      params.providerId,
      transaction
    );

    if (existingAuthMethod && existingAuthMethod.userId !== params.userId) {
      throw new ConflictError('This authentication method is already connected to another account');
    }

    const hasPrimaryMethod = existingMethods.some((m) => m.isPrimary);
    const isPrimary = !hasPrimaryMethod;

    const userAuthenticationMethod =
      await this.userAuthenticationMethodRepository.createUserAuthenticationMethod(
        {
          ...params,
          isPrimary,
        },
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

    await this.audit.logCreate(userAuthenticationMethod.id, newValues, metadata, transaction);

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
      await this.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
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

    await this.audit.logUpdate(
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

  public async setPrimaryAuthenticationMethod(
    userId: string,
    methodId: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    await this.getUserAuthenticationMethod(methodId, transaction);

    const allMethods = await this.getUserAuthenticationMethods({ userId }, transaction);

    const otherPrimaryMethods = allMethods.filter((m) => m.id !== methodId && m.isPrimary);
    for (const otherMethod of otherPrimaryMethods) {
      await this.updateUserAuthenticationMethod(otherMethod.id, { isPrimary: false }, transaction);
    }

    return await this.updateUserAuthenticationMethod(methodId, { isPrimary: true }, transaction);
  }

  public async deleteUserAuthenticationMethod(
    params: DeleteUserAuthenticationMethodInput & DeleteParams,
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

    if (oldUserAuthenticationMethod.isPrimary) {
      throw new BadRequestError('Cannot delete primary authentication method');
    }

    const allMethods = await this.getUserAuthenticationMethods(
      { userId: oldUserAuthenticationMethod.userId },
      transaction
    );

    if (allMethods.length === 1) {
      throw new BadRequestError('Cannot delete last authentication method');
    }

    const isHardDelete = hardDelete === true;

    const deletedUserAuthenticationMethod = isHardDelete
      ? await this.userAuthenticationMethodRepository.hardDeleteUserAuthenticationMethod(
          validatedParams,
          transaction
        )
      : await this.userAuthenticationMethodRepository.softDeleteUserAuthenticationMethod(
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
      await this.audit.logHardDelete(
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
      await this.audit.logSoftDelete(
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
    validateInput(emailSchema, email, context);

    const emailName = email.split('@')[0] || 'User';

    const validatedProviderData = validateInput(emailProviderDataSchema, providerData, context);

    switch (validatedProviderData.action) {
      case UserAuthenticationEmailProviderAction.Login:
        return {
          providerData: {
            password: validatedProviderData.password,
          },
          isVerified: false,
          name: emailName,
        };
      case UserAuthenticationEmailProviderAction.Register:
      case UserAuthenticationEmailProviderAction.Connect: {
        const validatedPassword = validateInput(
          passwordPolicySchema,
          validatedProviderData.password,
          context
        );
        const hashedPassword = hashSecret(validatedPassword);
        const otp = this.generateOtp();
        return {
          providerData: {
            otp,
            hashedPassword,
          },
          isVerified: false,
          name: emailName,
        };
      }
      default:
        throw new BadRequestError('Invalid action');
    }
  }

  private processGithubProvider(
    providerId: string,
    providerData: Record<string, unknown>,
    context: string
  ): ProcessedProvider {
    const validatedProviderData = validateInput(githubProviderDataSchema, providerData, context);

    const githubIdStr = validatedProviderData.githubId.toString();
    if (providerId !== githubIdStr) {
      throw new ValidationError('Provider ID must match GitHub user ID');
    }

    const name = validatedProviderData.name || providerId || 'User';

    return {
      providerData: {
        accessToken: validatedProviderData.accessToken,
        githubId: validatedProviderData.githubId,
        email: validatedProviderData.email || null,
        name: validatedProviderData.name || null,
        avatarUrl: validatedProviderData.avatarUrl || null,
        verifiedAt: new Date().toISOString(),
      },
      isVerified: true,
      name,
    };
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

    const result = await this.userAuthenticationMethodRepository.findByProviderAndProviderId(
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

    if (!providerData || typeof providerData !== 'object') {
      throw new ValidationError('Invalid provider data: must be a valid JSON object');
    }

    switch (provider) {
      case UserAuthenticationMethodProvider.Email:
        return this.processEmailProvider(providerId, providerData, context);
      case UserAuthenticationMethodProvider.Github:
        return this.processGithubProvider(providerId, providerData, context);
      default:
        throw new BadRequestError('Invalid provider');
    }
  }

  public generateOtp(): Otp {
    return generateSecureToken(config.auth.otpValidityMinutes);
  }

  public generatePasswordResetOtp(): Otp {
    return generateSecureToken(config.auth.passwordResetOtpValidityMinutes);
  }

  public async verifyEmail(
    token: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const context = 'UserAuthenticationMethodService.verifyEmail';

    const targetMethod = await this.userAuthenticationMethodRepository.findByToken(
      token,
      transaction
    );

    if (!targetMethod) {
      throw new NotFoundError('UserAuthenticationMethod');
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

    if (!otp) {
      throw new BadRequestError('Invalid verification token');
    }

    if (!isTokenValid(otp)) {
      throw new BadRequestError('Verification token has expired');
    }

    const updatedProviderData = { ...providerData };
    delete updatedProviderData.otp;

    const updatedMethod =
      await this.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
        targetMethod.id,
        {
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
      throw new NotFoundError('UserAuthenticationMethod');
    }

    if (method.isVerified) {
      throw new BadRequestError('Email is already verified');
    }

    const otp = this.generateOtp();
    const providerData = (method.providerData as Record<string, unknown>) || {};
    providerData.otp = otp;

    await this.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
      method.id,
      {
        providerData,
      },
      transaction
    );

    return otp;
  }

  public async requestPasswordReset(email: string, transaction?: Transaction): Promise<Otp | null> {
    const method = await this.getUserAuthenticationMethodByProvider(
      UserAuthenticationMethodProvider.Email,
      email,
      undefined,
      transaction
    );

    if (!method) {
      return null;
    }

    if (method.provider !== UserAuthenticationMethodProvider.Email) {
      return null;
    }

    const otp = this.generatePasswordResetOtp();

    const providerData = (method.providerData as Record<string, unknown>) || {};
    providerData.passwordResetOtp = otp;

    await this.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
      method.id,
      {
        providerData,
      },
      transaction
    );

    return otp;
  }

  public async resetPassword(
    token: string,
    newPassword: string,
    transaction?: Transaction
  ): Promise<string | null> {
    validateInput(passwordPolicySchema, newPassword, 'password');

    const methods = await this.userAuthenticationMethodRepository.getUserAuthenticationMethods(
      {
        provider: UserAuthenticationMethodProvider.Email,
        requestedFields: ['id', 'userId', 'providerData'],
      },
      transaction
    );

    let targetMethod: UserAuthenticationMethod | null = null;
    let targetUserId: string | null = null;

    for (const method of methods) {
      const providerData = method.providerData as Record<string, unknown>;
      const otp = providerData?.passwordResetOtp as Otp | undefined;

      if (otp && otp.token === token && isTokenValid(otp)) {
        targetMethod = method;
        targetUserId = method.userId;
        break;
      }
    }

    if (!targetMethod || !targetUserId) {
      return null;
    }

    const hashedPassword = hashSecret(newPassword);

    const providerData = (targetMethod.providerData as Record<string, unknown>) || {};
    providerData.hashedPassword = hashedPassword;

    delete providerData.passwordResetOtp;

    await this.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
      targetMethod.id,
      {
        providerData,
      },
      transaction
    );

    return targetUserId;
  }

  public async invalidateAllUserSessions(userId: string, transaction?: Transaction): Promise<void> {
    const sessions = await this.userSessionRepository.getUserSessions(
      {
        userId,
        requestedFields: ['id'],
      },
      transaction
    );

    for (const session of sessions.userSessions) {
      await this.userSessionRepository.softDeleteUserSession({ id: session.id }, transaction);
    }
  }

  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    transaction?: Transaction
  ): Promise<void> {
    const context = 'UserAuthenticationMethodService.changePassword';

    validateInput(passwordPolicySchema, newPassword, context);

    const methods = await this.userAuthenticationMethodRepository.getUserAuthenticationMethods(
      {
        userId,
        provider: UserAuthenticationMethodProvider.Email,
        requestedFields: ['id', 'userId', 'providerData'],
      },
      transaction
    );

    if (methods.length === 0) {
      throw new NotFoundError('UserAuthenticationMethod');
    }

    const emailMethod = methods[0];
    const providerData = (emailMethod.providerData as Record<string, unknown>) || {};
    const hashedPassword = providerData.hashedPassword as string | undefined;

    if (!hashedPassword) {
      throw new BadRequestError('Password not set for this account');
    }

    if (!verifySecret(currentPassword, hashedPassword)) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const newHashedPassword = hashSecret(newPassword);
    providerData.hashedPassword = newHashedPassword;

    await this.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
      emailMethod.id,
      {
        providerData,
      },
      transaction
    );
  }
}
