import { inArray, isNull, or, like, desc, asc, sql, and, eq } from 'drizzle-orm';

export const buildWhereClause = (
  table: any,
  searchFields: string[],
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

export const buildOrderBy = (
  table: any,
  sort?: { field: string; order: 'ASC' | 'DESC' },
  defaultField = 'createdAt'
): any[] => {
  if (sort) {
    return [sort.order === 'ASC' ? asc(table[sort.field]) : desc(table[sort.field])];
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

export const buildSelectObject = (
  table: any,
  requestedFields: string[] | undefined,
  searchFields: string[],
  search?: string,
  sort?: { field: string; order: 'ASC' | 'DESC' }
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

export const buildPivotWhereClause = (
  table: any,
  parentIdField: string,
  relatedIdField: string,
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

export const buildPivotInsertValues = (
  parentIdField: string,
  relatedIdField: string,
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
