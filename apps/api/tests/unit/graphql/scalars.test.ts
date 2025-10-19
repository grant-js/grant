import { IntValueNode, Kind, StringValueNode } from 'graphql';
import { describe, expect, it } from 'vitest';

import { resolvers } from '@/graphql/resolvers/scalars';

const DateScalar = resolvers.Date;

describe('Date Scalar', () => {
  describe('serialize', () => {
    it('should return ISO string when given a Date', () => {
      const testDate = new Date('2023-01-01T00:00:00.000Z');
      const result = DateScalar.serialize(testDate);
      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should return ISO string when given an ISO string', () => {
      const testString = '2023-01-01T00:00:00.000Z';
      const result = DateScalar.serialize(testString);
      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should throw error for invalid types', () => {
      expect(() => DateScalar.serialize(123)).toThrow('Value is not a valid Date: 123');
      expect(() => DateScalar.serialize(null)).toThrow('Value is not a valid Date: null');
      expect(() => DateScalar.serialize(undefined)).toThrow('Value is not a valid Date: undefined');
    });
  });

  describe('parseValue', () => {
    it('should convert string to Date when given an ISO string', () => {
      const testString = '2023-01-01T00:00:00.000Z';
      const result = DateScalar.parseValue(testString);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(testString);
    });

    it('should throw error for Date objects', () => {
      const testDate = new Date('2023-01-01T00:00:00.000Z');
      expect(() => DateScalar.parseValue(testDate)).toThrow('Value is not a valid Date:');
    });

    it('should throw error for invalid types', () => {
      expect(() => DateScalar.parseValue(123)).toThrow('Value is not a valid Date: 123');
      expect(() => DateScalar.parseValue(null)).toThrow('Value is not a valid Date: null');
      expect(() => DateScalar.parseValue(undefined)).toThrow(
        'Value is not a valid Date: undefined'
      );
    });
  });

  describe('parseLiteral', () => {
    it('should convert string literal to Date', () => {
      const ast: StringValueNode = {
        kind: Kind.STRING,
        value: '2023-01-01T00:00:00.000Z',
        loc: undefined,
      };
      const result = DateScalar.parseLiteral(ast, {});
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should throw error for non-string literals', () => {
      const intAst: IntValueNode = {
        kind: Kind.INT,
        value: '123',
        loc: undefined,
      };
      expect(() => DateScalar.parseLiteral(intAst, {})).toThrow(
        'Can only parse strings to dates but got a: IntValue'
      );
    });

    it('should throw error for invalid literal kind', () => {
      const invalidAst = { kind: 'INVALID', value: 'test' };
      expect(() => DateScalar.parseLiteral(invalidAst as never, {})).toThrow(
        'Can only parse strings to dates but got a: INVALID'
      );
    });
  });
});
