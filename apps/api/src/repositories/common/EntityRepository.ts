import { DbSchema } from '@logusgraphics/grant-database';
import { Auditable, Searchable, SortOrder } from '@logusgraphics/grant-schema';
import {
  SQL,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';

import { NotFoundError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';

import type { Schema } from '@logusgraphics/grant-database';

interface BaseEntity extends Auditable {
  [key: string]: unknown;
}

interface BaseSortable<TModel> {
  field: keyof TModel;
  order: SortOrder;
}

// New filter types
export type FilterOperator = 'eq' | 'gte' | 'lte' | 'in' | 'ilike' | 'isNull';

export interface FilterCondition<TModel> {
  field: keyof TModel;
  operator: FilterOperator;
  value?: any;
}

export interface FilterGroup<TModel> {
  conditions: (FilterCondition<TModel> | FilterGroup<TModel>)[];
  logic: 'AND' | 'OR';
}

export type Filter<TModel> =
  | FilterCondition<TModel>
  | FilterGroup<TModel>
  | (FilterCondition<TModel> | FilterGroup<TModel>)[];

interface BaseQueryArgs<TModel, TEntity> extends Searchable {
  sort?: BaseSortable<TModel> | null;
  requestedFields?: Array<keyof TEntity> | null;
  filters?: Filter<TModel> | null; // New flexible filter system
}

interface BasePageResult<T> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
}

interface RelationConfig {
  field: string;
  table: any;
  extract: (value: any) => any;
}

export interface BaseCreateArgs {
  [key: string]: unknown;
}

export interface BaseUpdateArgs {
  id: string;
  input: Record<string, unknown>;
}

export interface BaseDeleteArgs {
  id: string;
}

export type RelationsConfig<TEntity> = Partial<Record<keyof TEntity, RelationConfig>>;
export abstract class EntityRepository<TModel extends Auditable, TEntity extends BaseEntity> {
  protected readonly logger = createModuleLogger('EntityRepository');
  protected abstract table: any;
  protected abstract schemaName: keyof Schema;
  protected abstract searchFields: Array<keyof TModel>;
  protected abstract defaultSortField: keyof TModel;
  protected abstract relations: RelationsConfig<TEntity>;

  constructor(protected db: DbSchema) {}

  private queryBuilder(transaction?: Transaction) {
    const dbInstance = transaction ?? (this.db as any);
    return dbInstance.query[this.schemaName];
  }

  private where(ids?: string[] | null, search?: string | null, filters?: Filter<TModel> | null) {
    const conditions: any[] = [];

    // Legacy support for ids parameter
    if (ids && ids.length > 0) {
      conditions.push(inArray(this.table.id, ids));
    }

    // Legacy support for search parameter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const searchConditions: any[] = [];

      this.searchFields.forEach((field) => {
        if (this.table[field]) {
          searchConditions.push(ilike(this.table[field], searchTerm));
        }
      });

      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions));
      }
    }

    // New flexible filter system
    if (filters) {
      const filterCondition = this.buildFilterCondition(filters);
      if (filterCondition) {
        conditions.push(filterCondition);
      }
    }

    // Always exclude soft-deleted records
    conditions.push(isNull(this.table.deletedAt));

    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  private buildFilterCondition(filter: Filter<TModel>): SQL | undefined {
    // Handle array of conditions/groups
    if (Array.isArray(filter)) {
      const conditions = filter
        .map((f) => this.buildFilterCondition(f))
        .filter((c): c is SQL => c !== undefined);
      return conditions.length > 0 ? and(...conditions) : undefined;
    }

    // Handle filter group
    if ('conditions' in filter && 'logic' in filter) {
      const conditions = filter.conditions
        .map((c) => this.buildFilterCondition(c))
        .filter((c): c is SQL => c !== undefined);
      if (conditions.length === 0) return undefined;
      return filter.logic === 'OR' ? or(...conditions) : and(...conditions);
    }

    // Handle single filter condition
    if ('field' in filter && 'operator' in filter) {
      const fieldStr = String(filter.field);

      // Check if this is a JSON field access (contains dot notation)
      if (fieldStr.includes('.')) {
        // Split the field path (e.g., "providerData.otp.token" or "provider_data.otp.token")
        const parts = fieldStr.split('.');
        const rootField = parts[0] as keyof TModel;
        const column = this.table[rootField];

        if (!column) {
          return undefined;
        }

        // Build JSON path for nested access
        const jsonPath = parts.slice(1);

        // Use Drizzle's SQL builder for JSON field access
        // For PostgreSQL: column->'path'->'to'->>'field'
        let jsonAccessor = column;
        for (let i = 0; i < jsonPath.length; i++) {
          const part = jsonPath[i];
          if (i === jsonPath.length - 1) {
            // Last part: use ->> to get text value
            jsonAccessor = sql`${jsonAccessor}->>${part}`;
          } else {
            // Intermediate parts: use -> to navigate
            jsonAccessor = sql`${jsonAccessor}->${part}`;
          }
        }

        switch (filter.operator) {
          case 'eq':
            return eq(jsonAccessor, filter.value);
          case 'gte':
            return gte(jsonAccessor, filter.value);
          case 'lte':
            return lte(jsonAccessor, filter.value);
          case 'in':
            return Array.isArray(filter.value) ? inArray(jsonAccessor, filter.value) : undefined;
          case 'ilike':
            return ilike(jsonAccessor, filter.value);
          case 'isNull':
            return isNull(jsonAccessor);
          default:
            return undefined;
        }
      }

      // Regular column access (no dot notation)
      const column = this.table[filter.field];
      if (!column) {
        return undefined;
      }

      switch (filter.operator) {
        case 'eq':
          return eq(column, filter.value);
        case 'gte':
          return gte(column, filter.value);
        case 'lte':
          return lte(column, filter.value);
        case 'in':
          return Array.isArray(filter.value) ? inArray(column, filter.value) : undefined;
        case 'ilike':
          return ilike(column, filter.value);
        case 'isNull':
          return isNull(column);
        default:
          return undefined;
      }
    }

    return undefined;
  }

  private orderBy(sort?: { field: keyof TModel; order: SortOrder } | null) {
    if (!sort) {
      return [this.table[this.defaultSortField]];
    }
    return sort.order === SortOrder.Asc
      ? [asc(this.table[sort.field])]
      : [desc(this.table[sort.field])];
  }

  private async getTotalCount(where: any, transaction?: Transaction): Promise<number> {
    try {
      const dbInstance = transaction ?? this.db;
      const countResult = await dbInstance.select({ count: count() }).from(this.table).where(where);
      return Number(countResult[0]?.count ?? 0);
    } catch (error) {
      this.logger.error({
        msg: 'Count error',
        err: error,
      });
      return 0;
    }
  }

  private first<T>(result: T | T[]): T {
    return Array.isArray(result) ? result[0] : result;
  }

  private withRelations(
    requestedFields?: Array<keyof TEntity> | null
  ): Record<keyof TEntity, any> | undefined {
    if (!requestedFields || !this.relations) {
      return undefined;
    }
    return requestedFields.reduce(
      (acc, field) => {
        const relation = this.relations[field];
        if (relation) {
          acc[field] = {
            with: { [relation.field]: true },
            where: isNull(relation.table.deletedAt),
          };
        }
        return acc;
      },
      {} as Record<keyof TEntity, any>
    );
  }

  private extractRelations(
    row: TModel & TEntity,
    requestedFields?: Array<keyof TEntity> | null
  ): TModel {
    if (!requestedFields || !this.relations) {
      return row;
    }

    const mappedRow = { ...row };

    requestedFields.forEach((field) => {
      const relation = this.relations[field];
      if (relation && row[field]) {
        mappedRow[field] = relation.extract(row[field]);
      }
    });

    return mappedRow;
  }

  protected async query(
    params: BaseQueryArgs<TModel, TEntity>,
    transaction?: Transaction
  ): Promise<BasePageResult<TEntity>> {
    const { requestedFields } = params;

    const { ids, search, sort } = params;
    const page = params.page ?? 1;
    const safeLimit = params.limit ?? 50;
    const limit = safeLimit > -1 ? safeLimit : undefined;
    const offset = limit ? (page - 1) * limit : undefined;

    try {
      const withRelations = this.withRelations(requestedFields);
      const where = this.where(ids, search, params.filters);
      const orderBy = this.orderBy(sort);
      const hasRelations = withRelations && Object.keys(withRelations).length > 0;
      const totalCount = await this.getTotalCount(where, transaction);
      const hasNextPage = limit ? page * limit < totalCount : false;
      const filter = {
        where,
        orderBy,
        limit,
        offset,
      };

      let results = [];

      if (hasRelations) {
        results = await this.queryBuilder(transaction).findMany({
          with: withRelations,
          ...filter,
        });
        results = results.map((row: TModel & TEntity) =>
          this.extractRelations(row, requestedFields)
        );
      } else {
        results = await this.queryBuilder(transaction).findMany(filter);
      }

      return {
        items: results as unknown as TEntity[],
        totalCount,
        hasNextPage,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Query error',
        err: error,
      });
      return { items: [], totalCount: 0, hasNextPage: false };
    }
  }

  protected async create(data: BaseCreateArgs, transaction?: Transaction): Promise<TEntity> {
    const dbInstance = transaction ?? this.db;

    try {
      const result = await dbInstance
        .insert(this.table)
        .values({
          ...data,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const insertedItem = this.first(result);
      return insertedItem as TEntity;
    } catch (error) {
      this.logger.error({
        msg: 'Create error',
        err: error,
      });
      throw error;
    }
  }

  protected async update(params: BaseUpdateArgs, transaction?: Transaction): Promise<TEntity> {
    const dbInstance = transaction ?? this.db;

    try {
      const updateValues: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      Object.entries(params.input).forEach(([key, value]) => {
        if (value !== undefined) {
          updateValues[key] = value;
        }
      });

      const result = await dbInstance
        .update(this.table)
        .set(updateValues)
        .where(eq(this.table.id, params.id))
        .returning();

      const updatedItem = this.first(result);
      return updatedItem as TEntity;
    } catch (error) {
      this.logger.error({
        msg: 'Update error',
        err: error,
      });
      throw error;
    }
  }

  protected async softDelete(params: BaseDeleteArgs, transaction?: Transaction): Promise<TEntity> {
    const dbInstance = transaction ?? this.db;

    try {
      const result = await dbInstance
        .update(this.table)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, params.id))
        .returning();

      const deletedItem = this.first(result);
      return deletedItem as TEntity;
    } catch (error) {
      this.logger.error({
        msg: 'Soft delete error',
        err: error,
      });
      throw error;
    }
  }

  protected async hardDelete(params: BaseDeleteArgs, transaction?: Transaction): Promise<TEntity> {
    const dbInstance = transaction ?? this.db;

    try {
      const result = await dbInstance
        .delete(this.table)
        .where(eq(this.table.id, params.id))
        .returning();

      const deletedItem = this.first(result);
      if (!deletedItem) {
        throw new NotFoundError('Entity not found', 'errors:notFound.resource');
      }
      return deletedItem as TEntity;
    } catch (error) {
      this.logger.error({
        msg: 'Hard delete error',
        err: error,
      });
      throw error;
    }
  }
}
