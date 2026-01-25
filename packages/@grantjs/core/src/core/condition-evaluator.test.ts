import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import {
  ComparisonOperator,
  LogicalOperator,
  type ConditionExpression,
  type ExecutionContext,
} from '../types';

import { ConditionEvaluator } from './condition-evaluator';

describe('ConditionEvaluator', () => {
  const evaluator = new ConditionEvaluator();

  const createContext = (overrides?: Partial<ExecutionContext>): ExecutionContext => ({
    user: {
      id: 'user-123',
      metadata: {
        department: 'sales',
        region: 'us-east',
        employeeId: 'EMP-123',
        policies: ['POLICY-1', 'POLICY-2'],
      },
    },
    role: {
      id: 'role-456',
      name: 'Sales Manager',
      metadata: {
        level: 'senior',
      },
    },
    group: {
      id: 'group-789',
      name: 'Sales Team',
      metadata: {
        team: 'sales',
      },
    },
    scope: {
      tenant: Tenant.OrganizationProject,
      id: 'project-123',
    },
    resolvedResource: {
      id: 'resource-456',
      createdBy: 'user-123',
      department: 'sales',
      partnerId: 'PARTNER-789',
      amount: 1000,
      status: 'active',
    },
    ...overrides,
  });

  describe('Comparison Operators', () => {
    describe('equals / string-equals', () => {
      it('should return true when values match', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.Equals]: {
            'user.metadata.department': 'sales',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when values do not match', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.Equals]: {
            'user.metadata.department': 'engineering',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });

      it('should work with string-equals operator', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.StringEquals]: {
            'user.metadata.region': 'us-east',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });
    });

    describe('not-equals / string-not-equals', () => {
      it('should return true when values do not match', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NotEquals]: {
            'user.metadata.department': 'engineering',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when values match', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NotEquals]: {
            'user.metadata.department': 'sales',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('in / string-in', () => {
      it('should return true when value is in array', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.In]: {
            'user.metadata.department': ['sales', 'marketing', 'support'],
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when value is not in array', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.In]: {
            'user.metadata.department': ['engineering', 'product'],
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('not-in / string-not-in', () => {
      it('should return true when value is not in array', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NotIn]: {
            'user.metadata.department': ['engineering', 'product'],
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when value is in array', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NotIn]: {
            'user.metadata.department': ['sales', 'marketing'],
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('contains', () => {
      it('should return true when array contains value', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.Contains]: {
            'user.metadata.policies': 'POLICY-1',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when array does not contain value', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.Contains]: {
            'user.metadata.policies': 'POLICY-999',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('starts-with', () => {
      it('should return true when string starts with prefix', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.StartsWith]: {
            'user.metadata.employeeId': 'EMP',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when string does not start with prefix', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.StartsWith]: {
            'user.metadata.employeeId': 'USR',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('ends-with', () => {
      it('should return true when string ends with suffix', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.EndsWith]: {
            'user.metadata.employeeId': '123',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when string does not end with suffix', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.EndsWith]: {
            'user.metadata.employeeId': '456',
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('numeric comparisons', () => {
      it('should return true for numeric-equals', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NumericEquals]: {
            'resolvedResource.amount': 1000,
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return true for numeric-greater-than', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NumericGreaterThan]: {
            'resolvedResource.amount': 500,
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return true for numeric-less-than', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NumericLessThan]: {
            'resolvedResource.amount': 2000,
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return true for numeric-greater-than-equals', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NumericGreaterThanEquals]: {
            'resolvedResource.amount': 1000,
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return true for numeric-less-than-equals', async () => {
        const condition: ConditionExpression = {
          [ComparisonOperator.NumericLessThanEquals]: {
            'resolvedResource.amount': 1000,
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });
    });
  });

  describe('Field Path Resolution', () => {
    it('should resolve user fields', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'user.id': 'user-123',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve user metadata fields', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'user.metadata.department': 'sales',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve role fields', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'role.name': 'Sales Manager',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve role metadata fields', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'role.metadata.level': 'senior',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve group fields', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'group.name': 'Sales Team',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve resource fields', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'resource.id': 'resource-456',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve nested resource fields', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'resource.department': 'sales',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should return undefined for missing fields', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'user.metadata.nonexistent': 'value',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(false);
    });

    it('should handle missing resolvedResource', async () => {
      const context = createContext({ resolvedResource: null });
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'resource.id': 'resource-456',
        },
      };
      const result = await evaluator.evaluate(condition, context);
      expect(result).toBe(false);
    });
  });

  describe('Value Resolution', () => {
    it('should resolve template references', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'resolvedResource.createdBy': '{{user.id}}',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve field references with $ref', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'resolvedResource.createdBy': { $ref: 'user.id' },
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve nested template references', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'resolvedResource.department': '{{user.metadata.department}}',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should resolve array values with template references', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.In]: {
          'resolvedResource.id': ['{{user.metadata.policies}}'],
        },
      };
      const context = createContext({
        resolvedResource: {
          id: 'POLICY-1',
        },
      });
      const result = await evaluator.evaluate(condition, context);
      expect(result).toBe(true);
    });
  });

  describe('Logical Operators', () => {
    describe('and', () => {
      it('should return true when all conditions are true', async () => {
        const condition: ConditionExpression = {
          [LogicalOperator.And]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'sales' } },
            { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-east' } },
          ],
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when any condition is false', async () => {
        const condition: ConditionExpression = {
          [LogicalOperator.And]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'sales' } },
            { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-west' } },
          ],
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('or', () => {
      it('should return true when any condition is true', async () => {
        const condition: ConditionExpression = {
          [LogicalOperator.Or]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'engineering' } },
            { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-east' } },
          ],
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when all conditions are false', async () => {
        const condition: ConditionExpression = {
          [LogicalOperator.Or]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'engineering' } },
            { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-west' } },
          ],
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('not', () => {
      it('should return true when condition is false', async () => {
        const condition: ConditionExpression = {
          [LogicalOperator.Not]: {
            [ComparisonOperator.Equals]: { 'user.metadata.department': 'engineering' },
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });

      it('should return false when condition is true', async () => {
        const condition: ConditionExpression = {
          [LogicalOperator.Not]: {
            [ComparisonOperator.Equals]: { 'user.metadata.department': 'sales' },
          },
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(false);
      });
    });

    describe('complex nested logical operators', () => {
      it('should handle nested and/or/not combinations', async () => {
        const condition: ConditionExpression = {
          [LogicalOperator.And]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'sales' } },
            {
              [LogicalOperator.Or]: [
                { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-east' } },
                { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-west' } },
              ],
            },
            {
              [LogicalOperator.Not]: {
                [ComparisonOperator.Equals]: { 'resolvedResource.status': 'inactive' },
              },
            },
          ],
        };
        const result = await evaluator.evaluate(condition, createContext());
        expect(result).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      const context = createContext({
        user: {
          id: 'user-123',
          metadata: {
            department: null,
          },
        },
      });
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'user.metadata.department': 'sales',
        },
      };
      const result = await evaluator.evaluate(condition, context);
      expect(result).toBe(false);
    });

    it('should handle undefined values', async () => {
      const context = createContext({
        user: {
          id: 'user-123',
          metadata: {},
        },
      });
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'user.metadata.department': 'sales',
        },
      };
      const result = await evaluator.evaluate(condition, context);
      expect(result).toBe(false);
    });

    it('should handle empty arrays', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.In]: {
          'user.metadata.department': [],
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(false);
    });

    it('should handle multiple field comparisons in single condition', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'user.metadata.department': 'sales',
          'user.metadata.region': 'us-east',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should return false if any field comparison fails', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'user.metadata.department': 'sales',
          'user.metadata.region': 'us-west',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should evaluate ownership condition', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'resolvedResource.createdBy': '{{user.id}}',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should evaluate department match condition', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.Equals]: {
          'resolvedResource.department': '{{user.metadata.department}}',
        },
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });

    it('should evaluate policy access condition', async () => {
      const condition: ConditionExpression = {
        [ComparisonOperator.In]: {
          'resolvedResource.id': '{{user.metadata.policies}}',
        },
      };
      const context = createContext({
        resolvedResource: {
          id: 'POLICY-1',
        },
      });
      const result = await evaluator.evaluate(condition, context);
      expect(result).toBe(true);
    });

    it('should evaluate complex multi-condition scenario', async () => {
      const condition: ConditionExpression = {
        [LogicalOperator.Or]: [
          {
            [ComparisonOperator.Equals]: {
              'resolvedResource.createdBy': '{{user.id}}',
            },
          },
          {
            [LogicalOperator.And]: [
              {
                [ComparisonOperator.Equals]: {
                  'resolvedResource.department': '{{user.metadata.department}}',
                },
              },
              {
                [ComparisonOperator.Equals]: {
                  'resolvedResource.status': 'active',
                },
              },
            ],
          },
        ],
      };
      const result = await evaluator.evaluate(condition, createContext());
      expect(result).toBe(true);
    });
  });
});
