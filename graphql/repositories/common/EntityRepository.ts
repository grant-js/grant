import { eq, inArray, ilike, or, and, isNull, count, desc, asc } from 'drizzle-orm';

import { Auditable, Searchable, SortOrder } from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import type { Schema } from '@/graphql/repositories/schema';

interface BaseEntity extends Auditable {
  [key: string]: unknown;
}

interface BaseSortable<TModel> {
  field: keyof TModel;
  order: SortOrder;
}

interface BaseQueryArgs<TModel, TEntity> extends Searchable {
  sort?: BaseSortable<TModel> | null;
  requestedFields?: Array<keyof TEntity> | null;
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
  protected abstract table: any;
  protected abstract schemaName: keyof Schema;
  protected abstract searchFields: Array<keyof TModel>;
  protected abstract defaultSortField: keyof TModel;
  protected abstract relations: RelationsConfig<TEntity>;

  constructor(protected db: DbSchema) {}

  private get queryBuilder() {
    const queryApi = this.db.query as any;
    return queryApi[this.schemaName];
  }

  private where(ids?: string[] | null, search?: string | null) {
    const conditions: any[] = [];

    if (ids && ids.length > 0) {
      conditions.push(inArray(this.table.id, ids));
    }

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

    conditions.push(isNull(this.table.deletedAt));

    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  private orderBy(sort?: { field: keyof TModel; order: SortOrder } | null) {
    if (!sort) {
      return [this.table[this.defaultSortField]];
    }
    return sort.order === SortOrder.Asc
      ? [asc(this.table[sort.field])]
      : [desc(this.table[sort.field])];
  }

  private async getTotalCount(where: any): Promise<number> {
    try {
      const countResult = await this.db.select({ count: count() }).from(this.table).where(where);
      return Number(countResult[0]?.count ?? 0);
    } catch (error) {
      console.error('Count error:', error);
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

  protected async query(params: BaseQueryArgs<TModel, TEntity>): Promise<BasePageResult<TEntity>> {
    const { requestedFields } = params;

    const { ids, search, sort } = params;
    const page = params.page ?? 1;
    const safeLimit = params.limit ?? 50;
    const limit = safeLimit > -1 ? safeLimit : undefined;
    const offset = limit ? (page - 1) * limit : undefined;

    try {
      const withRelations = this.withRelations(requestedFields);
      const where = this.where(ids, search);
      const orderBy = this.orderBy(sort);
      const hasRelations = withRelations && Object.keys(withRelations).length > 0;
      const totalCount = await this.getTotalCount(where);
      const hasNextPage = limit ? page * limit < totalCount : false;
      const filter = {
        where,
        orderBy,
        limit,
        offset,
      };

      let results = [];

      if (hasRelations) {
        results = await this.queryBuilder.findMany({
          with: withRelations,
          ...filter,
        });
        results = results.map((row: TModel & TEntity) =>
          this.extractRelations(row, requestedFields)
        );
      } else {
        results = await this.queryBuilder.findMany(filter);
      }

      return {
        items: results as unknown as TEntity[],
        totalCount,
        hasNextPage,
      };
    } catch (error) {
      console.error('Query error:', error);
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
      console.error('Create error:', error);
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
      console.error('Update error:', error);
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
      console.error('Soft delete error:', error);
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
        throw new Error('Entity not found');
      }
      return deletedItem as TEntity;
    } catch (error) {
      console.error('Hard delete error:', error);
      throw error;
    }
  }
}
