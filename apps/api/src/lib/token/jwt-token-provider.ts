import jwt from 'jsonwebtoken';

import type {
  ITokenProvider,
  TokenDecodeResult,
  TokenSignOptions,
  TokenVerifyOptions,
} from '@grantjs/core';

/**
 * jsonwebtoken-based implementation of ITokenProvider.
 * This is the single place in the API layer where the `jsonwebtoken` library is used.
 */
export class JwtTokenProvider implements ITokenProvider {
  decode(token: string): TokenDecodeResult | null {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    return {
      header: decoded.header as TokenDecodeResult['header'],
      payload: decoded.payload as Record<string, unknown>,
    };
  }

  verify(token: string, publicKey: string, options?: TokenVerifyOptions): Record<string, unknown> {
    const verifyOptions: jwt.VerifyOptions = {
      ...(options?.algorithms && { algorithms: options.algorithms as jwt.Algorithm[] }),
      ...(options?.ignoreExpiration !== undefined && {
        ignoreExpiration: options.ignoreExpiration,
      }),
    };

    return jwt.verify(token, publicKey, verifyOptions) as Record<string, unknown>;
  }

  sign(payload: Record<string, unknown>, privateKey: string, options?: TokenSignOptions): string {
    const signOptions: jwt.SignOptions = {
      ...(options?.algorithm && { algorithm: options.algorithm as jwt.Algorithm }),
      ...(options?.keyid && { keyid: options.keyid }),
    };

    return jwt.sign(payload, privateKey, signOptions);
  }
}
