import { describe, it, expect } from 'vitest';

import { getDirectFieldSelection } from '@/lib/fieldSelection';

// Mock GraphQLResolveInfo structure
const createMockResolveInfo = (fieldNodes: any[]) => ({
  fieldNodes,
  fieldName: 'users',
  returnType: {} as any,
  parentType: {} as any,
  path: { key: 'users', typename: 'User', prev: undefined },
  variableValues: {},
  operation: {} as any,
  rootValue: {},
  schema: {} as any,
  fragments: {},
  cacheControl: {} as any,
});

describe('Field Selection Optimization', () => {
  describe('getDirectFieldSelection', () => {
    it('should extract field names from a simple query', () => {
      const mockInfo = createMockResolveInfo([
        {
          selectionSet: {
            selections: [
              { kind: 'Field', name: { value: 'id' } },
              { kind: 'Field', name: { value: 'name' } },
              { kind: 'Field', name: { value: 'email' } },
            ],
          },
        },
      ]);

      const result = getDirectFieldSelection(mockInfo);
      expect(result).toEqual(['id', 'name', 'email']);
    });

    it('should handle nested field selections with path', () => {
      const mockInfo = createMockResolveInfo([
        {
          selectionSet: {
            selections: [
              { kind: 'Field', name: { value: 'totalCount' } },
              {
                kind: 'Field',
                name: { value: 'users' },
                selectionSet: {
                  selections: [
                    { kind: 'Field', name: { value: 'id' } },
                    { kind: 'Field', name: { value: 'name' } },
                  ],
                },
              },
            ],
          },
        },
      ]);

      const result = getDirectFieldSelection(mockInfo, ['users']);
      expect(result).toEqual(['id', 'name']);
    });

    it('should filter out non-field selections', () => {
      const mockInfo = createMockResolveInfo([
        {
          selectionSet: {
            selections: [
              { kind: 'Field', name: { value: 'id' } },
              { kind: 'InlineFragment', typeCondition: { name: { value: 'User' } } },
              { kind: 'Field', name: { value: 'name' } },
            ],
          },
        },
      ]);

      const result = getDirectFieldSelection(mockInfo);
      expect(result).toEqual(['id', 'name']);
    });

    it('should handle empty selections', () => {
      const mockInfo = createMockResolveInfo([
        {
          selectionSet: {
            selections: [],
          },
        },
      ]);

      const result = getDirectFieldSelection(mockInfo);
      expect(result).toEqual([]);
    });

    it('should handle path parameter correctly for nested fields', () => {
      const mockInfo = createMockResolveInfo([
        {
          selectionSet: {
            selections: [
              { kind: 'Field', name: { value: 'totalCount' } },
              {
                kind: 'Field',
                name: { value: 'users' },
                selectionSet: {
                  selections: [
                    { kind: 'Field', name: { value: 'id' } },
                    { kind: 'Field', name: { value: 'name' } },
                  ],
                },
              },
            ],
          },
        },
      ]);

      const result = getDirectFieldSelection(mockInfo, ['users']);
      expect(result).toEqual(['id', 'name']);
    });
  });
});
