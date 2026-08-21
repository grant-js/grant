import { describe, expect, it } from 'vitest';

import { GrantClient } from '../../grant-client';
import { GRANT_CLIENT, GrantModule } from '../../nest/grant.module';

/**
 * Pass 7, slice 8. `GrantModule.forRoot` is semver-public and had no tests. What matters
 * here is the provider wiring: it registers ONE client under TWO tokens, so a consumer
 * injecting by class and another injecting by string token must receive the same
 * instance. That is invisible to the type system.
 */

const config = { apiUrl: 'https://api.example.test' };

describe('GrantModule.forRoot', () => {
  it('returns a DynamicModule bound to GrantModule', () => {
    const mod = GrantModule.forRoot(config);
    expect(mod.module).toBe(GrantModule);
  });

  it('provides GrantClient under both the class and the string token', () => {
    const mod = GrantModule.forRoot(config);
    const tokens = mod.providers?.map((p) => (p as { provide: unknown }).provide);
    expect(tokens).toEqual([GrantClient, GRANT_CLIENT]);
    expect(GRANT_CLIENT).toBe('GrantClient');
  });

  it('registers the SAME instance under both tokens', () => {
    // One `new GrantClient(config)` shared by both providers. If this ever became two
    // constructions, consumers injecting by class and by token would get separate
    // caches and diverging state, with nothing to indicate it.
    const mod = GrantModule.forRoot(config);
    const [byClass, byToken] = (mod.providers ?? []) as { useValue: unknown }[];
    expect(byClass.useValue).toBeInstanceOf(GrantClient);
    expect(byClass.useValue).toBe(byToken.useValue);
  });

  it('exports both tokens so importing modules can inject either', () => {
    expect(GrantModule.forRoot(config).exports).toEqual([GrantClient, GRANT_CLIENT]);
  });

  it('passes the config through to the client', () => {
    const mod = GrantModule.forRoot({ apiUrl: 'https://other.example.test' });
    const client = (mod.providers?.[0] as { useValue: GrantClient }).useValue;
    expect(client.config.apiUrl).toBe('https://other.example.test');
  });

  it('CHARACTERIZATION: each forRoot call builds its own client', () => {
    // The client is constructed eagerly in forRoot, not memoised. Calling forRoot twice
    // — e.g. in a test harness, or a second feature module — yields two clients with
    // independent state. @Global() makes one registration the norm, so this is a latent
    // surprise rather than a live bug.
    const a = (GrantModule.forRoot(config).providers?.[0] as { useValue: unknown }).useValue;
    const b = (GrantModule.forRoot(config).providers?.[0] as { useValue: unknown }).useValue;
    expect(a).not.toBe(b);
  });
});
