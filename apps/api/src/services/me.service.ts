import { MILLISECONDS_PER_DAY } from '@grantjs/constants';
import { Grant } from '@grantjs/core';
import {
  Account,
  AccountType,
  MeResponse,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { config } from '@/config';
import { AuthenticationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

export class MeService {
  constructor(
    private readonly repositories: Repositories,
    private readonly grant: Grant
  ) {}

  private getVerificationExpirationMs(): number {
    return config.auth.providerVerificationExpirationDays * MILLISECONDS_PER_DAY;
  }

  private getVerificationExpiryDate(from: Date): Date {
    return new Date(from.getTime() + this.getVerificationExpirationMs());
  }

  private getAuthenticatedUserId(): string {
    const userId = this.grant.auth!.userId;
    if (!userId) {
      throw new AuthenticationError('Not authenticated', 'errors:auth.notAuthenticated');
    }
    return userId;
  }

  public async getMe(transaction?: Transaction): Promise<MeResponse> {
    const userId = this.getAuthenticatedUserId();

    const usersResult = await this.repositories.userRepository.getUsers(
      {
        ids: [userId],
        limit: 1,
        requestedFields: ['accounts', 'authenticationMethods'],
      },
      transaction
    );

    const user = usersResult.users[0];

    if (!user) {
      throw new AuthenticationError('User not found', 'errors:auth.userNotFound');
    }

    const allAuthMethods = Array.isArray(user.authenticationMethods)
      ? user.authenticationMethods
      : [];

    const emailAuthMethod = allAuthMethods.find(
      (method) => method.provider === UserAuthenticationMethodProvider.Email
    );

    const githubAuthMethod = allAuthMethods.find(
      (method) => method.provider === UserAuthenticationMethodProvider.Github
    );

    let requiresEmailVerification = false;
    let verificationExpiry: Date | null = null;
    let email: string | null = null;

    if (emailAuthMethod) {
      email = emailAuthMethod.providerId;
      const verificationCreatedAt = emailAuthMethod.createdAt
        ? new Date(emailAuthMethod.createdAt)
        : null;
      const verificationExpirationMs = this.getVerificationExpirationMs();
      const now = new Date();

      requiresEmailVerification =
        !emailAuthMethod.isVerified &&
        verificationCreatedAt !== null &&
        now.getTime() - verificationCreatedAt.getTime() <= verificationExpirationMs;

      verificationExpiry =
        requiresEmailVerification && verificationCreatedAt
          ? this.getVerificationExpiryDate(verificationCreatedAt)
          : null;
    } else if (githubAuthMethod) {
      const providerData = githubAuthMethod.providerData as
        | { email?: string | null }
        | null
        | undefined;
      email = providerData?.email || null;
      requiresEmailVerification = false;
      verificationExpiry = null;
    }

    return {
      accounts: user.accounts ?? [],
      requiresEmailVerification: requiresEmailVerification ?? false,
      verificationExpiry,
      email,
    };
  }

  public async createMySecondaryAccount(
    transaction?: Transaction
  ): Promise<{ account: Account; accounts: Account[] }> {
    const userId = this.getAuthenticatedUserId();

    const existingAccounts = await this.repositories.accountRepository.getActiveAccountsByOwnerId(
      userId,
      transaction
    );

    if (existingAccounts.length >= 2) {
      throw new BadRequestError(
        'User has reached maximum account limit (2 accounts)',
        'errors:validation.maxAccountsReached'
      );
    }

    const hasPersonal = existingAccounts.some((acc) => acc.type === AccountType.Personal);
    const hasOrganization = existingAccounts.some((acc) => acc.type === AccountType.Organization);

    let complementaryType: AccountType;
    if (hasPersonal && !hasOrganization) {
      complementaryType = AccountType.Organization;
    } else if (hasOrganization && !hasPersonal) {
      complementaryType = AccountType.Personal;
    } else {
      throw new BadRequestError(
        'User already has both account types',
        'errors:validation.complementaryAccountExists'
      );
    }

    const createdAccount = await this.repositories.accountRepository.createAccount(
      {
        type: complementaryType,
        ownerId: userId,
      },
      transaction
    );

    const accountsResult = await this.repositories.accountRepository.getAccounts(
      {
        ids: [createdAccount.id],
        limit: 1,
        requestedFields: ['owner'],
      },
      transaction
    );

    const newAccount = accountsResult.accounts[0];

    if (!newAccount) {
      throw new NotFoundError('Account not found after creation', 'errors:notFound.account');
    }

    const allUserAccounts = await this.repositories.accountRepository.getAccountsByOwnerId(
      userId,
      transaction,
      ['owner']
    );

    return {
      account: newAccount,
      accounts: allUserAccounts,
    };
  }
}
