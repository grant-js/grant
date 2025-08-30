import { eq } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { SortOrder } from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

import { buildOrderBy, toEntity, buildSelectObject, buildWhereClause } from './utils';

export interface BaseEntityModel {
  id: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

export interface BaseEntity extends BaseEntityModel {
  [key: string]: unknown;
}

export interface BaseQueryArgs<TModel extends BaseEntityModel = BaseEntityModel> {
  ids?: string[];
  page?: number;
  limit?: number;
  search?: string;
  sort?: {
    field: keyof TModel;
    order: SortOrder;
  };
  requestedFields?: Array<keyof TModel>;
}

export interface BasePageResult<T> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
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

export abstract class EntityRepository<TModel extends BaseEntityModel, TEntity extends BaseEntity> {
  protected abstract table: any;
  protected abstract searchFields: Array<keyof TModel>;
  protected abstract defaultSortField: keyof TModel;

  constructor(protected db: PostgresJsDatabase) {}

  protected async query(
    params: BaseQueryArgs<TModel>,
    transaction?: Transaction
  ): Promise<BasePageResult<TEntity>> {
    const { ids, page = 1, limit = 50, search, sort, requestedFields } = params;
    const dbInstance = transaction || this.db;

    try {
      const orderBy = buildOrderBy<TModel>(this.table, sort, this.defaultSortField);

      const whereClause = buildWhereClause<TModel>(this.table, this.searchFields, ids, search);
      const countResult = await dbInstance
        .select({ count: count() })
        .from(this.table)
        .where(whereClause);
      const totalCount = Number(countResult[0]?.count || 0);
      const offset = (page - 1) * limit;

      if (totalCount === 0) {
        return { items: [], totalCount: 0, hasNextPage: false };
      }

      const selectObj = buildSelectObject<TModel>(
        this.table,
        requestedFields,
        this.searchFields,
        search,
        sort
      );

      const results = await dbInstance
        .select(selectObj)
        .from(this.table)
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset);

      const items = results.map((item: TModel) =>
        toEntity<TEntity>(item, requestedFields as string[])
      );

      return {
        items,
        totalCount,
        hasNextPage: page * limit < totalCount,
      };
    } catch (error) {
      console.error('Query error:', error);
      return { items: [], totalCount: 0, hasNextPage: false };
    }
  }

  protected async create(data: BaseCreateArgs, transaction?: Transaction): Promise<TEntity> {
    const dbInstance = transaction || this.db;

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

      const insertedItem = Array.isArray(result) ? result[0] : result;
      return toEntity<TEntity>(insertedItem as TModel);
    } catch (error) {
      console.error('Create error:', error);
      throw error;
    }
  }

  protected async update(params: BaseUpdateArgs, transaction?: Transaction): Promise<TEntity> {
    const dbInstance = transaction || this.db;

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

      const updatedItem = Array.isArray(result) ? result[0] : result;
      return toEntity<TEntity>(updatedItem as TModel);
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  }

  protected async softDelete(params: BaseDeleteArgs, transaction?: Transaction): Promise<TEntity> {
    const dbInstance = transaction || this.db;

    try {
      const result = await dbInstance
        .update(this.table)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, params.id))
        .returning();

      const deletedItem = Array.isArray(result) ? result[0] : result;
      return toEntity<TEntity>(deletedItem as TModel);
    } catch (error) {
      console.error('Soft delete error:', error);
      throw error;
    }
  }

  protected async hardDelete(params: BaseDeleteArgs, transaction?: Transaction): Promise<TEntity> {
    const dbInstance = transaction || this.db;

    try {
      const result = await dbInstance
        .delete(this.table)
        .where(eq(this.table.id, params.id))
        .returning();

      const deletedItem = Array.isArray(result) ? result[0] : result;
      if (!deletedItem) {
        throw new Error('Entity not found');
      }
      return toEntity<TEntity>(deletedItem as TModel);
    } catch (error) {
      console.error('Hard delete error:', error);
      throw error;
    }
  }
}
