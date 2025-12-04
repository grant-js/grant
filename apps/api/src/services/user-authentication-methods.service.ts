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
import {
  AuthenticationError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import { generateSecureToken, isTokenValid, type Token } from '@/lib/token.lib';
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
  emailProviderDataSchema,
  githubProviderDataSchema,
  parseProviderDataSchema,
  passwordPolicySchema,
  queryUserAuthenticationMethodsArgsSchema,
  updateUserAuthenticationMethodInputSchema,
  userAuthenticationMethodSchema,
} from './user-authentication-methods.schemas';

interface ProcessedProvider {
  providerData: Record<string, unknown>;
  isVerified: boolean;
  name: string;
}

export type Otp = Token;

export class UserAuthenticationMethodService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(userAuthenticationMethodsAuditLogs, 'userAuthenticationMethodId', user, db);
  }

  public async getUserAuthenticationMethod(
    id: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const method =
      await this.repositories.userAuthenticationMethodRepository.getUserAuthenticationMethod(
        id,
        transaction
      );

    if (!method) {
      throw new NotFoundError('User authentication method not found', 'errors:auth.methodNotFound');
    }

    return method;
  }

  public async getUserAuthenticationMethodByProvider(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    requestedFields?: string[],
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod | null> {
    const method =
      await this.repositories.userAuthenticationMethodRepository.findByProviderAndProviderId(
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
    const method = await this.repositories.userAuthenticationMethodRepository.findByEmail(
      email,
      transaction
    );

    return method || null;
  }

  public async getUserAuthenticationMethods(
    params: GetUserAuthenticationMethodsInput & SelectedFields<UserAuthenticationMethod>,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod[]> {
    const context = 'UserAuthenticationMethodService.getUserAuthenticationMethods';
    validateInput(queryUserAuthenticationMethodsArgsSchema, params, context);
    const result =
      await this.repositories.userAuthenticationMethodRepository.getUserAuthenticationMethods(
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

    // Check if THIS USER already has this provider type (prevent duplicate providers per user)
    const existingMethods = await this.getUserAuthenticationMethods(
      { userId: params.userId },
      transaction
    );

    const hasProvider = existingMethods.some((m) => m.provider === params.provider);
    if (hasProvider) {
      throw new BadRequestError(
        `User already has a ${params.provider} authentication method`,
        'errors:auth.duplicateProvider',
        { provider: params.provider }
      );
    }

    // Check if provider+providerId combination exists for another user (cross-user conflict)
    // This validates global uniqueness and provides a better error message
    const existingAuthMethod = await this.findByProviderAndProviderId(
      params.provider,
      params.providerId,
      transaction
    );

    if (existingAuthMethod && existingAuthMethod.userId !== params.userId) {
      throw new ConflictError(
        'This authentication method is already connected to another account',
        'errors:auth.providerAlreadyConnected',
        { provider: params.provider, providerId: params.providerId }
      );
    }

    // Determine if this should be primary (set as primary if no primary exists)
    const hasPrimaryMethod = existingMethods.some((m) => m.isPrimary);
    const isPrimary = !hasPrimaryMethod;

    const userAuthenticationMethod =
      await this.repositories.userAuthenticationMethodRepository.createUserAuthenticationMethod(
        {
          ...params,
          isPrimary, // Explicitly set isPrimary
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

  public async setPrimaryAuthenticationMethod(
    id: string,
    transaction?: Transaction
  ): Promise<UserAuthenticationMethod> {
    const method = await this.getUserAuthenticationMethod(id);

    // Get all user's authentication methods
    const allMethods = await this.getUserAuthenticationMethods(
      { userId: method.userId },
      transaction
    );

    // Unset all other primary methods
    const otherPrimaryMethods = allMethods.filter((m) => m.id !== id && m.isPrimary);
    for (const otherMethod of otherPrimaryMethods) {
      await this.updateUserAuthenticationMethod(otherMethod.id, { isPrimary: false }, transaction);
    }

    // Set this method as primary
    return await this.updateUserAuthenticationMethod(id, { isPrimary: true }, transaction);
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

    // Prevent deletion of primary authentication method
    if (oldUserAuthenticationMethod.isPrimary) {
      throw new BadRequestError(
        'Cannot delete primary authentication method',
        'errors:auth.cannotDeletePrimary'
      );
    }

    // Prevent deletion of last authentication method
    const allMethods = await this.getUserAuthenticationMethods(
      { userId: oldUserAuthenticationMethod.userId },
      transaction
    );

    if (allMethods.length === 1) {
      throw new BadRequestError(
        'Cannot delete last authentication method',
        'errors:auth.cannotDeleteLastMethod'
      );
    }

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
    // Validate email format
    validateInput(emailSchema, email, context);

    // Extract name from email (left side before @)
    const emailName = email.split('@')[0] || 'User';

    // Validate provider data structure
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
        // Validate password meets policy requirements
        const validatedPassword = validateInput(
          passwordPolicySchema,
          validatedProviderData.password,
          context
        );
        const hashedPassword = this.hashPassword(validatedPassword);
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
        throw new BadRequestError('Invalid action', 'errors:auth.invalidAction');
    }
  }

  private processGoogleProvider(
    providerId: string,
    providerData: Record<string, unknown>,
    _context: string
  ): ProcessedProvider {
    // TODO: implement google provider
    const name = (providerData.name as string) || providerId || 'User';
    return { providerData, isVerified: false, name };
  }

  private processGithubProvider(
    providerId: string,
    providerData: Record<string, unknown>,
    context: string
  ): ProcessedProvider {
    // Validate provider data structure
    const validatedProviderData = validateInput(githubProviderDataSchema, providerData, context);

    // Validate providerId matches githubId
    const githubIdStr = validatedProviderData.githubId.toString();
    if (providerId !== githubIdStr) {
      throw new ValidationError(
        'Provider ID must match GitHub user ID',
        [],
        'errors:auth.providerIdMismatch'
      );
    }

    // Extract name from GitHub provider data
    const name = validatedProviderData.name || providerId || 'User';

    // Store GitHub-specific data
    // GitHub accounts are considered verified (no email verification needed)
    return {
      providerData: {
        accessToken: validatedProviderData.accessToken, // Store for future GitHub API calls
        githubId: validatedProviderData.githubId,
        email: validatedProviderData.email || null, // Email may be null if private
        name: validatedProviderData.name || null, // Display name
        avatarUrl: validatedProviderData.avatarUrl || null, // Profile picture URL
        verifiedAt: new Date().toISOString(), // GitHub accounts are pre-verified
      },
      isVerified: true, // GitHub accounts are pre-verified
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
    return generateSecureToken(config.auth.otpValidityMinutes);
  }

  public generatePasswordResetOtp(): Otp {
    return generateSecureToken(config.auth.passwordResetOtpValidityMinutes);
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

    if (!otp) {
      throw new BadRequestError('Invalid verification token', 'errors:auth.invalidToken');
    }

    if (!isTokenValid(otp)) {
      throw new BadRequestError('Verification token has expired', 'errors:auth.tokenExpired');
    }

    const updatedProviderData = { ...providerData };
    delete updatedProviderData.otp;

    const updatedMethod =
      await this.repositories.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
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

    await this.repositories.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
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

    const methods =
      await this.repositories.userAuthenticationMethodRepository.getUserAuthenticationMethods(
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

    const hashedPassword = this.hashPassword(newPassword);

    const providerData = (targetMethod.providerData as Record<string, unknown>) || {};
    providerData.hashedPassword = hashedPassword;

    delete providerData.passwordResetOtp;

    await this.repositories.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
      targetMethod.id,
      {
        providerData,
      },
      transaction
    );

    return targetUserId;
  }

  public async invalidateAllUserSessions(userId: string, transaction?: Transaction): Promise<void> {
    const sessions = await this.repositories.userSessionRepository.getUserSessions(
      {
        userId,
        requestedFields: ['id'],
      },
      transaction
    );

    for (const session of sessions.userSessions) {
      await this.repositories.userSessionRepository.softDeleteUserSession(
        { id: session.id },
        transaction
      );
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

    const methods =
      await this.repositories.userAuthenticationMethodRepository.getUserAuthenticationMethods(
        {
          userId,
          provider: UserAuthenticationMethodProvider.Email,
          requestedFields: ['id', 'userId', 'providerData'],
        },
        transaction
      );

    if (methods.length === 0) {
      throw new NotFoundError(
        'Email authentication method not found',
        'errors:auth.methodNotFound'
      );
    }

    const emailMethod = methods[0];
    const providerData = (emailMethod.providerData as Record<string, unknown>) || {};
    const hashedPassword = providerData.hashedPassword as string | undefined;

    if (!hashedPassword) {
      throw new BadRequestError('Password not set for this account', 'errors:auth.passwordNotSet');
    }

    if (!this.verifyPassword(currentPassword, hashedPassword)) {
      throw new AuthenticationError('Current password is incorrect', 'errors:auth.invalidPassword');
    }

    const newHashedPassword = this.hashPassword(newPassword);
    providerData.hashedPassword = newHashedPassword;

    await this.repositories.userAuthenticationMethodRepository.updateUserAuthenticationMethod(
      emailMethod.id,
      {
        providerData,
      },
      transaction
    );
  }
}
