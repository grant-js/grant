import { describe, expect, it } from 'vitest';

import { resolveEnabledProvidersUpdate } from './project-app-enabled-providers.lib';

describe('resolveEnabledProvidersUpdate', () => {
  it('sends the selection as is', () => {
    expect(resolveEnabledProvidersUpdate(['email', 'password'], ['password'])).toEqual({
      ok: true,
      enabledProviders: ['password'],
    });
    expect(resolveEnabledProvidersUpdate([], ['email'])).toEqual({
      ok: true,
      enabledProviders: ['email'],
    });
  });

  it.each([[[]], [undefined], [null]])(
    'refuses an empty selection (%j) over a saved list, which would enable every provider but password',
    (selected) => {
      expect(resolveEnabledProvidersUpdate(['password'], selected)).toEqual({ ok: false });
      expect(resolveEnabledProvidersUpdate(['email'], selected)).toEqual({ ok: false });
    }
  );

  it.each([[[]], [null], [undefined]])(
    'leaves the list unchanged when it was empty and stays empty (saved %j)',
    (saved) => {
      expect(resolveEnabledProvidersUpdate(saved, [])).toEqual({
        ok: true,
        enabledProviders: undefined,
      });
    }
  );
});
