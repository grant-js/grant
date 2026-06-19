import { SortOrder, Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { parseRequestedFields, queryListCommons } from '@/rest/utils/list-query';

type TestEntity = {
  id: string;
  primaryTag: unknown;
  roleCount: number;
  tags: unknown[];
};

describe('REST list query utilities', () => {
  it('merges relations and computed fields into requested fields', () => {
    const requestedFields = parseRequestedFields<TestEntity>(
      ['primaryTag', 'roleCount'],
      ['tags', 'primaryTag']
    );

    expect(requestedFields).toEqual(['tags', 'primaryTag', 'roleCount']);
  });

  it('passes fields through queryListCommons with relations, sort, and scope', () => {
    const result = queryListCommons<TestEntity, { field: 'id'; order: SortOrder }>({
      fields: ['primaryTag'],
      relations: ['tags'],
      scopeId: '123e4567-e89b-12d3-a456-426614174000',
      sortField: 'id',
      sortOrder: SortOrder.Asc,
      tenant: Tenant.AccountProject,
    });

    expect(result).toEqual({
      requestedFields: ['tags', 'primaryTag'],
      scope: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant: Tenant.AccountProject,
      },
      sort: {
        field: 'id',
        order: SortOrder.Asc,
      },
    });
  });
});
