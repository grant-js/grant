import { GraphQLScalarType, Kind, GraphQLError } from 'graphql';
import { GraphQLJSON } from 'graphql-type-json';

export const resolvers = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    serialize(value: unknown): string {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        return new Date(value).toISOString();
      }
      throw new GraphQLError(`Value is not a valid Date: ${value}`);
    },
    parseValue(value: unknown): Date {
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError(`Value is not a valid Date: ${value}`);
        }
        return date;
      }
      throw new GraphQLError(`Value is not a valid Date: ${value}`);
    },
    parseLiteral(ast): Date {
      if (ast.kind === Kind.STRING) {
        const date = new Date(ast.value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError(`Value is not a valid Date: ${ast.value}`);
        }
        return date;
      }
      throw new GraphQLError(`Can only parse strings to dates but got a: ${ast.kind}`);
    },
  }),
  JSON: GraphQLJSON,
};
