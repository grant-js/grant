import { AUTH_REFRESH_TOKEN_KEY } from '@grantjs/constants';
import { Response } from 'express';

import { config } from '@/config';

const REFRESH_COOKIE_MAX_AGE_SECONDS = config.jwt.refreshTokenExpirationDays * 24 * 60 * 60;

/**
 * Set the refresh token in an HttpOnly cookie on the response.
 * Used after login (OAuth redirect) and after successful token refresh.
 */
export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(AUTH_REFRESH_TOKEN_KEY, refreshToken, {
    httpOnly: true,
    secure: config.app.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS * 1000, // express expects ms
  });
}

/**
 * Clear the refresh token cookie (e.g. on logout or failed refresh).
 */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(AUTH_REFRESH_TOKEN_KEY, {
    path: '/',
    httpOnly: true,
    secure: config.app.isProduction,
    sameSite: 'lax',
  });
}
