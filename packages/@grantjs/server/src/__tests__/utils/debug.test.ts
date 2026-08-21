import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debugGrant } from '../../utils/debug';

/**
 * Pass 7, slice 8. `debugGrant` is the one place in this package that writes to the
 * console, and it is called by all four framework adapters. The behaviour worth pinning
 * is that it is OFF unless DEBUG_GRANT is exactly '1' — a permissive check here would
 * leak resource/action/outcome into production logs.
 */

describe('debugGrant', () => {
  let spy: ReturnType<typeof vi.spyOn>;
  const original = process.env.DEBUG_GRANT;

  beforeEach(() => {
    vi.clearAllMocks(); // pass 4: spyOn on an already-spied method returns the EXISTING spy
    spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
    if (original === undefined) delete process.env.DEBUG_GRANT;
    else process.env.DEBUG_GRANT = original;
  });

  it('logs when DEBUG_GRANT is exactly "1"', () => {
    process.env.DEBUG_GRANT = '1';
    debugGrant('Express', { resource: 'Document', action: 'Query' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('[Grant Express]', {
      resource: 'Document',
      action: 'Query',
    });
  });

  it('is silent when DEBUG_GRANT is unset', () => {
    delete process.env.DEBUG_GRANT;
    debugGrant('Fastify', { resource: 'Project' });
    expect(spy).not.toHaveBeenCalled();
  });

  it.each(['0', 'true', 'yes', '', 'TRUE', ' 1'])(
    'is silent for the truthy-looking value %o',
    (value) => {
      process.env.DEBUG_GRANT = value;
      debugGrant('Nest', { resource: 'Document' });
      expect(spy).not.toHaveBeenCalled();
    }
  );

  it('prefixes with the integration name so adapters are distinguishable', () => {
    process.env.DEBUG_GRANT = '1';
    for (const integration of ['Express', 'Fastify', 'Nest', 'Next']) {
      debugGrant(integration, {});
      expect(spy).toHaveBeenLastCalledWith(`[Grant ${integration}]`, {});
    }
    expect(spy).toHaveBeenCalledTimes(4);
  });
});
