import { describe, expect, it } from 'vitest';

import { ComparisonOperator, LogicalOperator } from '../types';

import { permissionConditionSchema } from './condition-schema';

describe('permissionConditionSchema', () => {
  describe('Valid Conditions', () => {
    describe('null and undefined', () => {
      it('should accept null', () => {
        const result = permissionConditionSchema.safeParse(null);
        expect(result.success).toBe(true);
      });

      it('should accept undefined', () => {
        const result = permissionConditionSchema.safeParse(undefined);
        expect(result.success).toBe(true);
      });
    });

    describe('empty objects', () => {
      it('should accept empty object', () => {
        const result = permissionConditionSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe('comparison operators', () => {
      it('should accept Equals condition', () => {
        const condition = {
          [ComparisonOperator.Equals]: {
            'user.id': '123',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept StringEquals condition', () => {
        const condition = {
          [ComparisonOperator.StringEquals]: {
            'user.metadata.department': 'sales',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept NotEquals condition', () => {
        const condition = {
          [ComparisonOperator.NotEquals]: {
            'user.id': '456',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept StringNotEquals condition', () => {
        const condition = {
          [ComparisonOperator.StringNotEquals]: {
            'user.metadata.region': 'us-west',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept In condition', () => {
        const condition = {
          [ComparisonOperator.In]: {
            'user.metadata.policies': ['POLICY-1', 'POLICY-2'],
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept StringIn condition', () => {
        const condition = {
          [ComparisonOperator.StringIn]: {
            'user.metadata.region': ['us-east', 'us-west'],
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept NotIn condition', () => {
        const condition = {
          [ComparisonOperator.NotIn]: {
            'user.metadata.policies': ['POLICY-3'],
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept StringNotIn condition', () => {
        const condition = {
          [ComparisonOperator.StringNotIn]: {
            'user.metadata.region': ['us-west'],
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept Contains condition', () => {
        const condition = {
          [ComparisonOperator.Contains]: {
            'user.metadata.employeeId': 'EMP',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept StartsWith condition', () => {
        const condition = {
          [ComparisonOperator.StartsWith]: {
            'user.metadata.employeeId': 'EMP-',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept EndsWith condition', () => {
        const condition = {
          [ComparisonOperator.EndsWith]: {
            'user.metadata.employeeId': '-123',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept NumericEquals condition', () => {
        const condition = {
          [ComparisonOperator.NumericEquals]: {
            'resolvedResource.amount': 1000,
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept NumericGreaterThan condition', () => {
        const condition = {
          [ComparisonOperator.NumericGreaterThan]: {
            'resolvedResource.amount': 500,
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept NumericLessThan condition', () => {
        const condition = {
          [ComparisonOperator.NumericLessThan]: {
            'resolvedResource.amount': 2000,
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept NumericGreaterThanEquals condition', () => {
        const condition = {
          [ComparisonOperator.NumericGreaterThanEquals]: {
            'resolvedResource.amount': 1000,
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept NumericLessThanEquals condition', () => {
        const condition = {
          [ComparisonOperator.NumericLessThanEquals]: {
            'resolvedResource.amount': 1000,
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept condition with field reference', () => {
        const condition = {
          [ComparisonOperator.Equals]: {
            'resolvedResource.department': { $ref: 'user.metadata.department' },
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept condition with boolean value', () => {
        const condition = {
          [ComparisonOperator.Equals]: {
            'resolvedResource.status': true,
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept condition with multiple field comparisons', () => {
        const condition = {
          [ComparisonOperator.Equals]: {
            'user.metadata.department': 'sales',
            'user.metadata.region': 'us-east',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });
    });

    describe('logical operators', () => {
      it('should accept And condition with array', () => {
        const condition = {
          [LogicalOperator.And]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'sales' } },
            { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-east' } },
          ],
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept Or condition with array', () => {
        const condition = {
          [LogicalOperator.Or]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'sales' } },
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'engineering' } },
          ],
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept Not condition with single expression', () => {
        const condition = {
          [LogicalOperator.Not]: {
            [ComparisonOperator.Equals]: {
              'user.metadata.department': 'engineering',
            },
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept nested And conditions', () => {
        const condition = {
          [LogicalOperator.And]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'sales' } },
            {
              [LogicalOperator.Or]: [
                { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-east' } },
                { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-west' } },
              ],
            },
          ],
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept nested Or conditions', () => {
        const condition = {
          [LogicalOperator.Or]: [
            { [ComparisonOperator.Equals]: { 'user.metadata.department': 'sales' } },
            {
              [LogicalOperator.And]: [
                { [ComparisonOperator.Equals]: { 'user.metadata.region': 'us-east' } },
                { [ComparisonOperator.Equals]: { 'user.metadata.employeeId': 'EMP-123' } },
              ],
            },
          ],
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept nested Not conditions', () => {
        const condition = {
          [LogicalOperator.Not]: {
            [LogicalOperator.Not]: {
              [ComparisonOperator.Equals]: {
                'user.metadata.department': 'sales',
              },
            },
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });

      it('should accept complex nested conditions', () => {
        const condition = {
          [LogicalOperator.And]: [
            { [ComparisonOperator.StringEquals]: { 'user.id': 'user-123' } },
            {
              [LogicalOperator.Or]: [
                { [ComparisonOperator.In]: { 'user.metadata.policies': ['POLICY-1'] } },
                { [ComparisonOperator.NumericGreaterThan]: { 'resolvedResource.amount': 500 } },
              ],
            },
            {
              [LogicalOperator.Not]: {
                [ComparisonOperator.Equals]: {
                  'user.metadata.department': 'engineering',
                },
              },
            },
          ],
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Invalid Conditions', () => {
    describe('invalid JSON marker', () => {
      it('should reject __invalidJson marker', () => {
        const condition = { __invalidJson: true };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Invalid JSON format. Please check your JSON syntax.'
          );
        }
      });
    });

    describe('non-object types', () => {
      it('should reject string', () => {
        const result = permissionConditionSchema.safeParse('invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Condition must be an object, null, or undefined.'
          );
        }
      });

      it('should reject number', () => {
        const result = permissionConditionSchema.safeParse(123);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Condition must be an object, null, or undefined.'
          );
        }
      });

      it('should reject boolean', () => {
        const result = permissionConditionSchema.safeParse(true);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Condition must be an object, null, or undefined.'
          );
        }
      });

      it('should reject array', () => {
        const result = permissionConditionSchema.safeParse([]);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            'Condition must be an object, null, or undefined.'
          );
        }
      });
    });

    describe('invalid comparison operators', () => {
      it('should reject unknown operator', () => {
        const condition = {
          UnknownOperator: {
            'user.id': '123',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
      });

      it('should reject lowercase operator', () => {
        const condition = {
          stringEquals: {
            'user.id': '123',
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
      });

      it('should reject condition with invalid value type', () => {
        const condition = {
          [ComparisonOperator.Equals]: {
            'user.id': { invalid: 'value' },
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
      });
    });

    describe('invalid logical operators', () => {
      it('should reject And with object instead of array', () => {
        const condition = {
          [LogicalOperator.And]: {
            [ComparisonOperator.Equals]: { 'user.id': '123' },
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
        if (!result.success) {
          // The error message should mention And and array
          const errorMessage = result.error.issues[0].message;
          expect(errorMessage).toMatch(/And.*array|Invalid condition structure/i);
        }
      });

      it('should reject Or with object instead of array', () => {
        const condition = {
          [LogicalOperator.Or]: {
            [ComparisonOperator.Equals]: { 'user.id': '123' },
          },
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
        if (!result.success) {
          // The error message should mention Or and array
          const errorMessage = result.error.issues[0].message;
          expect(errorMessage).toMatch(/Or.*array|Invalid condition structure/i);
        }
      });

      it('should accept And with empty array (empty arrays are valid)', () => {
        const condition = {
          [LogicalOperator.And]: [],
        };
        const result = permissionConditionSchema.safeParse(condition);
        // Empty arrays are technically valid according to the schema
        // The evaluator would handle this as a logical case
        expect(result.success).toBe(true);
      });

      it('should accept Or with empty array (empty arrays are valid)', () => {
        const condition = {
          [LogicalOperator.Or]: [],
        };
        const result = permissionConditionSchema.safeParse(condition);
        // Empty arrays are technically valid according to the schema
        // The evaluator would handle this as a logical case
        expect(result.success).toBe(true);
      });

      it('should reject Not with array instead of object', () => {
        const condition = {
          [LogicalOperator.Not]: [{ [ComparisonOperator.Equals]: { 'user.id': '123' } }],
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
      });

      it('should reject unknown logical operator', () => {
        const condition = {
          UnknownLogical: [{ [ComparisonOperator.Equals]: { 'user.id': '123' } }],
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
      });
    });

    describe('invalid structure', () => {
      it('should accept object with multiple comparison operators (loose mode allows extra keys)', () => {
        const condition = {
          [ComparisonOperator.Equals]: { 'user.id': '123' },
          [ComparisonOperator.NotEquals]: { 'user.id': '456' },
        };
        const result = permissionConditionSchema.safeParse(condition);
        // The schema uses .loose() which allows extra keys
        // It will match the first valid operator in the union
        expect(result.success).toBe(true);
      });

      it('should accept object with multiple logical operators (loose mode allows extra keys)', () => {
        const condition = {
          [LogicalOperator.And]: [{ [ComparisonOperator.Equals]: { 'user.id': '123' } }],
          [LogicalOperator.Or]: [{ [ComparisonOperator.Equals]: { 'user.id': '456' } }],
        };
        const result = permissionConditionSchema.safeParse(condition);
        // The schema uses .loose() which allows extra keys
        // It will match the first valid operator in the union
        expect(result.success).toBe(true);
      });

      it('should accept object with both comparison and logical operator (loose mode allows extra keys)', () => {
        const condition = {
          [ComparisonOperator.Equals]: { 'user.id': '123' },
          [LogicalOperator.And]: [{ [ComparisonOperator.Equals]: { 'user.id': '456' } }],
        };
        const result = permissionConditionSchema.safeParse(condition);
        // The schema uses .loose() which allows extra keys
        // It will match the first valid operator in the union
        expect(result.success).toBe(true);
      });

      it('should reject nested condition with invalid structure', () => {
        const condition = {
          [LogicalOperator.And]: [
            { [ComparisonOperator.Equals]: { 'user.id': '123' } },
            { invalid: 'structure' },
          ],
        };
        const result = permissionConditionSchema.safeParse(condition);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should accept condition with empty field comparison object', () => {
      const condition = {
        [ComparisonOperator.Equals]: {},
      };
      const result = permissionConditionSchema.safeParse(condition);
      expect(result.success).toBe(true);
    });

    it('should accept condition with numeric zero', () => {
      const condition = {
        [ComparisonOperator.NumericEquals]: {
          'resolvedResource.amount': 0,
        },
      };
      const result = permissionConditionSchema.safeParse(condition);
      expect(result.success).toBe(true);
    });

    it('should accept condition with empty string', () => {
      const condition = {
        [ComparisonOperator.StringEquals]: {
          'user.id': '',
        },
      };
      const result = permissionConditionSchema.safeParse(condition);
      expect(result.success).toBe(true);
    });

    it('should accept condition with empty array value', () => {
      const condition = {
        [ComparisonOperator.In]: {
          'user.metadata.policies': [],
        },
      };
      const result = permissionConditionSchema.safeParse(condition);
      expect(result.success).toBe(true);
    });

    it('should accept deeply nested conditions', () => {
      const condition = {
        [LogicalOperator.And]: [
          {
            [LogicalOperator.Or]: [
              { [ComparisonOperator.Equals]: { 'user.id': '123' } },
              {
                [LogicalOperator.Not]: {
                  [ComparisonOperator.Equals]: { 'user.id': '456' },
                },
              },
            ],
          },
          { [ComparisonOperator.StringEquals]: { 'user.metadata.department': 'sales' } },
        ],
      };
      const result = permissionConditionSchema.safeParse(condition);
      expect(result.success).toBe(true);
    });
  });
});
