import { gql } from '@apollo/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getClient } from './apollo-client';

const SETTINGS_PATH = '/en/dashboard/organizations/org-1/settings';

function graphQLErrorResponse(code: string, reason: string) {
  return new Response(
    JSON.stringify({ data: null, errors: [{ message: 'Refused', extensions: { code, reason } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function mutation(operationName: string) {
  return gql(`mutation ${operationName}($id: ID!) { noop(id: $id) }`);
}

describe('apollo error link: redirects on refusals', () => {
  const originalLocation = window.location;
  let location: { pathname: string; href: string };

  beforeEach(() => {
    location = { pathname: SETTINGS_PATH, href: SETTINGS_PATH };
    Object.defineProperty(window, 'location', { configurable: true, value: location });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.unstubAllGlobals();
  });

  it.each([
    ['FORBIDDEN', 'OWNERSHIP_TRANSFER_NOT_OWNER'],
    ['NOT_FOUND', 'OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER'],
  ])(
    'keeps the page when TransferOrganizationOwnership is refused with %s',
    async (code, reason) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => graphQLErrorResponse(code, reason))
      );

      await expect(
        getClient().mutate({
          mutation: mutation('TransferOrganizationOwnership'),
          variables: { id: 'x' },
        })
      ).rejects.toThrow();

      expect(location.href).toBe(SETTINGS_PATH);
    }
  );

  it.each([
    ['FORBIDDEN', '/en/forbidden'],
    ['NOT_FOUND', '/en/not-found'],
  ])('still redirects other operations refused with %s', async (code, target) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => graphQLErrorResponse(code, 'SOMETHING_ELSE'))
    );

    await expect(
      getClient().mutate({ mutation: mutation('DeleteOrganization'), variables: { id: 'x' } })
    ).rejects.toThrow();

    expect(location.href).toBe(target);
  });
});
