// @vitest-environment jsdom
import { MockedProvider } from '@apollo/client/testing/react';
import { GetRoleRelationsPreviewDocument, Tenant } from '@grantjs/schema';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useRelationPreview } from './use-relation-preview';

const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };
vi.mock('./use-scope-from-params', () => ({ useScopeFromParams: () => scope }));

const mocks = [
  {
    request: {
      query: GetRoleRelationsPreviewDocument,
      variables: { scope, id: 'role-1', withGroups: true, withTags: false },
    },
    result: {
      data: {
        roles: {
          __typename: 'RolePage',
          roles: [
            {
              __typename: 'Role',
              id: 'role-1',
              groups: [{ __typename: 'Group', id: 'g-1', name: 'Editors' }],
            },
          ],
        },
      },
    },
  },
];

const wrapper = ({ children }: { children: ReactNode }) => (
  <MockedProvider mocks={mocks}>{children}</MockedProvider>
);

describe('useRelationPreview', () => {
  it('fetches nothing until load, then only the requested relationship', async () => {
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'role', relation: 'groups' }, 'role-1'),
      { wrapper }
    );
    expect(result.current.called).toBe(false);
    expect(result.current.items).toBeUndefined();

    act(() => result.current.load());

    await waitFor(() =>
      expect(result.current.items).toEqual([
        expect.objectContaining({ id: 'g-1', name: 'Editors' }),
      ])
    );
    expect(result.current.error).toBe(false);
  });
});
