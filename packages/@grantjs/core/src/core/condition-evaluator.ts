import {
  ComparisonOperator,
  LogicalOperator,
  type ConditionExpression,
  type ExecutionContext,
  type FieldValue,
  type FieldReference,
  type FieldComparison,
} from '../types';

export class ConditionEvaluator {
  async evaluate(condition: ConditionExpression, context: ExecutionContext): Promise<boolean> {
    // Check for logical operators using the enum values (case-sensitive)
    if (LogicalOperator.And in condition) {
      const results = await Promise.all(
        condition[LogicalOperator.And].map((c) => this.evaluate(c, context))
      );
      return results.every((result: boolean) => result);
    }

    if (LogicalOperator.Or in condition) {
      const results = await Promise.all(
        condition[LogicalOperator.Or].map((c) => this.evaluate(c, context))
      );
      return results.some((result: boolean) => result);
    }

    if (LogicalOperator.Not in condition) {
      const result = await this.evaluate(condition[LogicalOperator.Not], context);
      return !result;
    }

    const operator = Object.keys(condition)[0] as ComparisonOperator;
    const fieldComparisons = (condition as Record<ComparisonOperator, FieldComparison>)[operator];

    for (const [fieldPath, comparisonValue] of Object.entries(fieldComparisons)) {
      const fieldValue = this.getFieldValue(fieldPath, context);
      const resolvedValue = this.resolveValue(comparisonValue, context);

      if (!this.compare(fieldValue, operator, resolvedValue)) {
        return false;
      }
    }

    return true;
  }

  private getFieldValue<T = unknown>(fieldPath: string, context: ExecutionContext): T | undefined {
    const parts = fieldPath.split('.');

    if (parts[0] === 'resource') {
      if (!context.resolvedResource) {
        return undefined;
      }
      return this.getNestedValue(context.resolvedResource, parts.slice(1)) as T;
    }

    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }
      value = (value as Record<string, unknown>)?.[part];
      if (value === undefined) {
        return undefined;
      }
    }

    return value as T;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
    let value: unknown = obj;

    for (const part of path) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }
      value = (value as Record<string, unknown>)?.[part];
      if (value === undefined) {
        return undefined;
      }
    }

    return value;
  }

  private resolveValue(
    value: FieldValue,
    context: ExecutionContext
  ): string | number | boolean | unknown[] | unknown {
    if (typeof value === 'object' && value !== null && '$ref' in value) {
      return this.getFieldValue((value as FieldReference).$ref, context);
    }

    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const path = value.slice(2, -2).trim();
      return this.getFieldValue(path, context);
    }

    if (Array.isArray(value)) {
      const resolved = value.map((item) => this.resolveValue(item, context));
      // Flatten if any resolved item is an array (e.g., ['{{user.metadata.policies}}'] -> ['POLICY-1', 'POLICY-2'])
      const flattened: unknown[] = [];
      for (const item of resolved) {
        if (Array.isArray(item)) {
          flattened.push(...item);
        } else {
          flattened.push(item);
        }
      }
      return flattened;
    }

    return value;
  }

  private compare(left: unknown, operator: ComparisonOperator, right: unknown): boolean {
    switch (operator) {
      case ComparisonOperator.Equals:
      case ComparisonOperator.StringEquals:
        return String(left) === String(right);
      case ComparisonOperator.NotEquals:
      case ComparisonOperator.StringNotEquals:
        return String(left) !== String(right);
      case ComparisonOperator.In:
      case ComparisonOperator.StringIn:
        return Array.isArray(right) && right.includes(left);
      case ComparisonOperator.NotIn:
      case ComparisonOperator.StringNotIn:
        return Array.isArray(right) && !right.includes(left);
      case ComparisonOperator.Contains:
        return Array.isArray(left) && left.includes(right);
      case ComparisonOperator.StartsWith:
        return String(left).startsWith(String(right));
      case ComparisonOperator.EndsWith:
        return String(left).endsWith(String(right));
      case ComparisonOperator.NumericEquals:
        return Number(left) === Number(right);
      case ComparisonOperator.NumericGreaterThan:
        return Number(left) > Number(right);
      case ComparisonOperator.NumericLessThan:
        return Number(left) < Number(right);
      case ComparisonOperator.NumericGreaterThanEquals:
        return Number(left) >= Number(right);
      case ComparisonOperator.NumericLessThanEquals:
        return Number(left) <= Number(right);
      default:
        return false;
    }
  }
}
