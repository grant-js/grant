import { inArray, isNull, or, like, desc, asc, sql, and, eq } from 'drizzle-orm';

import { SortOrder } from '@/graphql/generated/types';

import { BaseEntityModel } from './EntityRepository';
import { BasePivotModel } from './PivotRepository';

export const buildWhereClause = <TModel extends BaseEntityModel>(
  table: any,
  searchFields: Array<keyof TModel>,
  ids?: string[],
  search?: string
): any => {
  const conditions = [isNull(table.deletedAt)];

  if (ids && ids.length > 0) {
    conditions.push(inArray(table.id, ids));
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    const orConditions = searchFields.map((field) => like(table[field], searchTerm));
    const searchCondition = or(...orConditions);
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions.length === 1 ? conditions[0] : sql`${sql.join(conditions, sql` AND `)}`;
};

export const buildOrderBy = <TModel extends BaseEntityModel>(
  table: any,
  sort?: { field: keyof TModel; order: SortOrder },
  defaultField: keyof TModel = 'createdAt'
): any[] => {
  if (sort) {
    return [sort.order === SortOrder.Asc ? asc(table[sort.field]) : desc(table[sort.field])];
  }
  return [desc(table[defaultField])];
};

export const toEntity = <T>(dbModel: any, requestedFields?: string[]): T => {
  if (!requestedFields || requestedFields.length === 0) {
    return dbModel;
  }

  const output: any = { id: dbModel.id };
  requestedFields.forEach((field) => {
    if (field in dbModel) {
      output[field] = dbModel[field];
    }
  });

  return output;
};

export const buildSelectObject = <TModel extends BaseEntityModel>(
  table: any,
  requestedFields: Array<keyof TModel> | undefined,
  searchFields: Array<keyof TModel>,
  search?: string,
  sort?: { field: keyof TModel; order: SortOrder }
): any => {
  const selectObj: any = { id: table.id };

  if (!requestedFields) {
    return selectObj;
  }

  requestedFields.forEach((field) => {
    if (table[field]) {
      selectObj[field] = table[field];
    }
  });

  if (search && search.trim()) {
    searchFields.forEach((searchField) => {
      if (!selectObj[searchField]) {
        selectObj[searchField] = searchField;
      }
    });
  }

  if (sort && !selectObj[sort.field]) {
    selectObj[sort.field] = table[sort.field];
  }

  return selectObj;
};

export const buildPivotWhereClause = <TModel extends BasePivotModel>(
  table: any,
  parentIdField: keyof TModel,
  relatedIdField: keyof TModel,
  parentId: string,
  relatedId?: string
): any => {
  const conditions = [isNull(table.deletedAt)];

  if (relatedId) {
    const relationCondition = and(
      eq(table[parentIdField], parentId),
      eq(table[relatedIdField], relatedId)
    );
    if (relationCondition) {
      conditions.push(relationCondition);
    }
  } else {
    const parentCondition = eq(table[parentIdField], parentId);
    if (parentCondition) {
      conditions.push(parentCondition);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

export const buildPivotInsertValues = <TModel extends BasePivotModel>(
  parentIdField: keyof TModel,
  relatedIdField: keyof TModel,
  parentId: string,
  relatedId: string
): Record<string, unknown> => ({
  [parentIdField]: parentId,
  [relatedIdField]: relatedId,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

export const getFirstResult = <T>(result: T | T[]): T => {
  return Array.isArray(result) ? result[0] : result;
};
