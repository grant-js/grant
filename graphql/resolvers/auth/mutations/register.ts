import { MutationResolvers } from '@/graphql/generated/types';

export const register: MutationResolvers['register'] = async (_, args, context) => {
  const { name, type, provider, providerId, providerData } = args.input;

  try {
    const result = await context.controllers.accounts.createAccount({
      name,
      type,
      provider,
      providerId,
      providerData,
    });

    // Debug logging to identify null values
    console.log('Register result:', {
      hasAccount: !!result.account,
      hasAccessToken: !!result.accessToken,
      hasRefreshToken: !!result.refreshToken,
      accountId: result.account?.id,
      accountName: result.account?.name,
    });

    if (!result.account) {
      throw new Error('Account is null or undefined');
    }

    if (!result.accessToken) {
      throw new Error('Access token is null or undefined');
    }

    if (!result.refreshToken) {
      throw new Error('Refresh token is null or undefined');
    }

    return result;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};
