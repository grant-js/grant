import { ApolloServerErrorCode } from '@apollo/server/errors';
import jwt from 'jsonwebtoken';

import { ApiError } from '@/graphql/errors';
import { LoginParams, LoginResult } from '@/graphql/providers/auth/types';
import { JWT_SECRET } from '@/graphql/resolvers/auth/constants';
export async function login({ input }: LoginParams): Promise<LoginResult> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    throw new ApiError('Invalid email format', ApolloServerErrorCode.BAD_USER_INPUT);
  }
  const expiresIn = 7 * 24 * 60 * 60;
  const token = jwt.sign(
    {
      sub: '1234567890',
      email: input.email,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    },
    JWT_SECRET
  );
  return { token };
}
