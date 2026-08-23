import { OAUTH_STATE_KEY_PREFIX } from '@/constants/cache.constants';
import { CacheKey, ICacheAdapter } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { validateInput } from '@/services/common';

import { oauthStateSchema, oauthStateTokenSchema } from './github-oauth.schemas';
import { OAuthState } from './github-oauth.service';

interface StoredState extends OAuthState {
  expiresAt: number;
}

import type { IOAuthStateService } from '@grantjs/core';

/**
 * OAuth CSRF state storage.
 *
 * Expiry is owned by the cache adapter TTL (and a defensive expiresAt check on
 * read). Do not add a process-wide cleanup timer here: createServices() runs
 * per request, so a constructor setInterval would leak one timer per request
 * and can saturate Redis with KEYS scans (observed on the demo stack).
 */
export class OAuthStateService implements IOAuthStateService {
  private readonly logger = createLogger('OAuthStateService');
  private readonly cache: ICacheAdapter;

  constructor(cache: ICacheAdapter) {
    this.cache = cache;
  }

  async storeState(state: OAuthState, ttlSeconds: number = 600): Promise<void> {
    const context = 'OAuthStateService.storeState';

    const validatedState = validateInput(oauthStateSchema, state, context);

    const expiresAt = Date.now() + ttlSeconds * 1000;
    const storedState: StoredState = {
      ...validatedState,
      expiresAt,
    };

    const cacheKey = this.getCacheKey(validatedState.state);
    const serializedState = JSON.stringify(storedState);
    await this.cache.set(cacheKey, new Set([serializedState]), ttlSeconds);

    this.logger.debug({
      msg: 'Stored OAuth state',
      state: state.state.substring(0, 8) + '...',
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }

  async getState(stateToken: string): Promise<OAuthState | null> {
    const context = 'OAuthStateService.getState';

    const validatedStateToken = validateInput(oauthStateTokenSchema, stateToken, context);

    const cacheKey = this.getCacheKey(validatedStateToken);
    const cachedValue = await this.cache.get(cacheKey);

    if (!cachedValue || cachedValue.size === 0) {
      this.logger.debug({
        msg: 'OAuth state not found',
        state: validatedStateToken.substring(0, 8) + '...',
      });
      return null;
    }

    const serializedState = Array.from(cachedValue)[0];
    const storedState: StoredState = JSON.parse(serializedState);

    if (Date.now() > storedState.expiresAt) {
      this.logger.debug({
        msg: 'OAuth state expired',
        state: validatedStateToken.substring(0, 8) + '...',
      });
      await this.cache.delete(cacheKey);
      return null;
    }

    const { expiresAt: _expiresAt, ...state } = storedState;
    return state;
  }

  async deleteState(stateToken: string): Promise<void> {
    const context = 'OAuthStateService.deleteState';

    const validatedStateToken = validateInput(oauthStateTokenSchema, stateToken, context);

    const cacheKey = this.getCacheKey(validatedStateToken);
    const existed = await this.cache.has(cacheKey);
    await this.cache.delete(cacheKey);

    if (existed) {
      this.logger.debug({
        msg: 'Deleted OAuth state',
        state: validatedStateToken.substring(0, 8) + '...',
      });
    }
  }

  async validateState(stateToken: string, maxAgeMs: number = 600000): Promise<boolean> {
    const state = await this.getState(stateToken);

    if (!state) {
      return false;
    }

    const age = Date.now() - state.createdAt;
    if (age > maxAgeMs) {
      this.logger.debug({
        msg: 'OAuth state expired (age check)',
        state: stateToken.substring(0, 8) + '...',
        age,
        maxAge: maxAgeMs,
      });
      await this.deleteState(stateToken);
      return false;
    }

    return true;
  }

  private getCacheKey(stateToken: string): CacheKey {
    return `${OAUTH_STATE_KEY_PREFIX}${stateToken}` as CacheKey;
  }

  /** No-op; retained for {@link IOAuthStateService} compatibility. */
  destroy(): void {}
}
