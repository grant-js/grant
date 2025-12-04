import { CacheKey } from '@/handlers/base/scope-handler';
import { ICacheAdapter } from '@/lib/cache';
import { createModuleLogger } from '@/lib/logger';
import { validateInput } from '@/services/common';

import { oauthStateSchema, oauthStateTokenSchema } from './github-oauth.schemas';
import { OAuthState } from './github-oauth.service';

interface StoredState extends OAuthState {
  expiresAt: number;
}

export class OAuthStateService {
  private readonly logger = createModuleLogger('OAuthStateService');
  private readonly cache: ICacheAdapter;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(cache: ICacheAdapter) {
    this.cache = cache;
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredStates();
      },
      5 * 60 * 1000
    );
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
    await this.cache.set(cacheKey, new Set([serializedState]));

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

  private async cleanupExpiredStates(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    const keys = await this.cache.keys('oauth:state:*');
    for (const key of keys) {
      const cachedValue = await this.cache.get(key);
      if (cachedValue && cachedValue.size > 0) {
        try {
          const serializedState = Array.from(cachedValue)[0];
          const storedState: StoredState = JSON.parse(serializedState);
          if (now > storedState.expiresAt) {
            await this.cache.delete(key);
            cleaned++;
          }
        } catch (error) {
          this.logger.warn({
            msg: 'Failed to parse cached OAuth state during cleanup',
            key,
            err: error,
          });
          await this.cache.delete(key);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      this.logger.debug({
        msg: 'Cleaned up expired OAuth states',
        count: cleaned,
      });
    }
  }

  private getCacheKey(stateToken: string): CacheKey {
    return `oauth:state:${stateToken}` as CacheKey;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
