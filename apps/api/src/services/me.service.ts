import { MILLISECONDS_PER_DAY } from '@grantjs/constants';
import {
  Grant,
  type IAccountRepository,
  type IUserRepository,
  type IMeService,
} from '@grantjs/core';
import {
  Account,
  AccountType,
  MeResponse,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { config } from '@/config';
import { AuthenticationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';

export class MeService implements IMeService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly accountRepository: IAccountRepository,
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
      throw new AuthenticationError('Not authenticated');
    }
    return userId;
  }

  public async getMe(transaction?: Transaction): Promise<MeResponse> {
    const userId = this.getAuthenticatedUserId();

    const usersResult = await this.userRepository.getUsers(
      {
        ids: [userId],
        limit: 1,
        requestedFields: ['accounts', 'authenticationMethods'],
      },
      transaction
    );

    const user = usersResult.users[0];

    if (!user) {
      throw new AuthenticationError('User not found');
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

    const existingAccounts = await this.accountRepository.getActiveAccountsByOwnerId(
      userId,
      transaction
    );

    if (existingAccounts.length >= 2) {
      throw new BadRequestError('User has reached maximum account limit (2 accounts)');
    }

    const hasPersonal = existingAccounts.some((acc) => acc.type === AccountType.Personal);
    const hasOrganization = existingAccounts.some((acc) => acc.type === AccountType.Organization);

    let complementaryType: AccountType;
    if (hasPersonal && !hasOrganization) {
      complementaryType = AccountType.Organization;
    } else if (hasOrganization && !hasPersonal) {
      complementaryType = AccountType.Personal;
    } else {
      throw new BadRequestError('User already has both account types');
    }

    const createdAccount = await this.accountRepository.createAccount(
      {
        type: complementaryType,
        ownerId: userId,
      },
      transaction
    );

    const accountsResult = await this.accountRepository.getAccounts(
      {
        ids: [createdAccount.id],
        limit: 1,
        requestedFields: ['owner'],
      },
      transaction
    );

    const newAccount = accountsResult.accounts[0];

    if (!newAccount) {
      throw new NotFoundError('Account');
    }

    const allUserAccounts = await this.accountRepository.getAccountsByOwnerId(userId, transaction, [
      'owner',
    ]);

    return {
      account: newAccount,
      accounts: allUserAccounts,
    };
  }
}
