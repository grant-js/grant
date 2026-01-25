import { z } from 'zod';

import { ComparisonOperator, LogicalOperator } from '../types';

import type { FieldValue } from '../types';

const fieldReferenceSchema = z.object({
  $ref: z.string(),
});

const fieldValueSchema: z.ZodType<FieldValue> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  fieldReferenceSchema,
]);

const comparisonConditionSchemas = Object.values(ComparisonOperator).map((operator) =>
  z
    .object({
      [operator]: z.record(z.string(), fieldValueSchema),
    })
    .loose()
);

const comparisonConditionSchema = z.union(
  comparisonConditionSchemas as [
    (typeof comparisonConditionSchemas)[0],
    ...(typeof comparisonConditionSchemas)[number][],
  ]
);

const conditionExpressionSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    comparisonConditionSchema,
    z.union([
      z.object({
        [LogicalOperator.And]: z.array(conditionExpressionSchema),
      }),
      z.object({
        [LogicalOperator.Or]: z.array(conditionExpressionSchema),
      }),
      z.object({
        [LogicalOperator.Not]: conditionExpressionSchema,
      }),
    ]),
  ])
);

export const permissionConditionSchema = z.any().superRefine((val, ctx) => {
  if (val === null || val === undefined) {
    return;
  }

  if (typeof val === 'object' && !Array.isArray(val) && '__invalidJson' in val) {
    ctx.addIssue({
      code: 'custom',
      message: 'Invalid JSON format. Please check your JSON syntax.',
    });
    return;
  }

  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) {
    return;
  }

  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
    const result = conditionExpressionSchema.safeParse(val);
    if (!result.success) {
      type ZodErrorWithErrors = typeof result.error & { errors?: unknown[] };
      const errorWithErrors = result.error as ZodErrorWithErrors;
      const issues = result.error.issues || errorWithErrors.errors || [];

      let errorMessage = 'Invalid condition structure.';

      const logicalOperatorIssue = issues.find((issue: unknown) => {
        const zodIssue = issue as { path?: (string | number)[] };
        return (
          zodIssue.path &&
          zodIssue.path.length > 0 &&
          Object.values(LogicalOperator).includes(zodIssue.path[0] as LogicalOperator)
        );
      });

      if (logicalOperatorIssue) {
        const zodIssue = logicalOperatorIssue as {
          path?: (string | number)[];
          code?: string;
          expected?: string;
          message?: string;
        };
        const operator = zodIssue.path?.[0] as string;

        if (zodIssue.code === 'invalid_type' && zodIssue.expected === 'array') {
          errorMessage = `${operator} must be an array of condition expressions. Example: { "${operator}": [{ "StringEquals": { "field": "value" } }] }`;
        } else if (zodIssue.code === 'invalid_type' && zodIssue.expected === 'object') {
          errorMessage = `${operator} must be a condition expression object. Example: { "${operator}": { "StringEquals": { "field": "value" } } }`;
        } else {
          errorMessage = `${operator}: ${zodIssue.message}`;
        }
      } else {
        const firstIssue = issues[0] as
          | { path?: (string | number)[]; message?: string }
          | undefined;
        if (firstIssue) {
          const path =
            firstIssue.path && firstIssue.path.length > 0
              ? ` at "${firstIssue.path.join('.')}"`
              : '';
          errorMessage = `Invalid condition structure${path}: ${firstIssue.message || 'Invalid input'}`;
        }
      }

      ctx.addIssue({
        code: 'custom',
        message: errorMessage,
      });
      return;
    }
  }

  if (typeof val !== 'object' || Array.isArray(val)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Condition must be an object, null, or undefined.',
    });
  }
});
