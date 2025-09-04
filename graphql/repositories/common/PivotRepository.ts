import { and, eq, inArray, isNull } from 'drizzle-orm';

import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

export interface BasePivotModel {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | null;
  [key: string]: unknown;
}

export interface BasePivotEntity extends BasePivotModel {
  [key: string]: unknown;
}

export interface BasePivotQueryArgs {
  parentId: string;
}

export interface PivotIntersectionQueryArgs {
  parentIds: string[];
  relatedIds: string[];
}

export interface BasePivotAddArgs {
  parentId: string;
  relatedId: string;
}

export interface BasePivotRemoveArgs {
  parentId: string;
  relatedId: string;
}

export abstract class PivotRepository<
  TPivotModel extends BasePivotModel,
  TPivotEntity extends BasePivotEntity,
> {
  protected abstract table: any;
  protected abstract parentIdField: keyof TPivotModel;
  protected abstract relatedIdField: keyof TPivotModel;

  protected abstract toEntity(dbPivot: TPivotModel): TPivotEntity;

  constructor(protected db: DbSchema) {}

  private where(
    table: any,
    parentIdField: keyof TPivotModel,
    relatedIdField: keyof TPivotModel,
    parentId: string,
    relatedId?: string
  ): any {
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
  }

  private insertValues(
    parentIdField: keyof TPivotModel,
    relatedIdField: keyof TPivotModel,
    parentId: string,
    relatedId: string
  ): Record<string, unknown> {
    return {
      [parentIdField]: parentId,
      [relatedIdField]: relatedId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
  }

  private first<T>(result: T | T[]): T {
    return Array.isArray(result) ? result[0] : result;
  }

  protected async query(
    params: BasePivotQueryArgs,
    transaction?: Transaction
  ): Promise<TPivotEntity[]> {
    const dbInstance = transaction || this.db;

    try {
      const whereClause = this.where(
        this.table,
        this.parentIdField,
        this.relatedIdField,
        params.parentId
      );

      const result = await dbInstance.select().from(this.table).where(whereClause);

      return result.map((item: TPivotModel) => this.toEntity(item));
    } catch (error) {
      console.error('Error querying pivot table:', error);
      throw error;
    }
  }

  protected async queryIntersection(
    params: PivotIntersectionQueryArgs,
    transaction?: Transaction
  ): Promise<TPivotEntity[]> {
    const dbInstance = transaction || this.db;
    const whereClause = and(
      inArray(this.table[this.parentIdField], params.parentIds),
      inArray(this.table[this.relatedIdField], params.relatedIds),
      isNull(this.table.deletedAt)
    );

    const result = await dbInstance.select().from(this.table).where(whereClause);

    return result.map((item: TPivotModel) => this.toEntity(item));
  }

  protected async add(params: BasePivotAddArgs, transaction?: Transaction): Promise<TPivotEntity> {
    const dbInstance = transaction || this.db;

    try {
      const softDeletedWhereClause = and(
        eq(this.table[this.parentIdField as string], params.parentId),
        eq(this.table[this.relatedIdField as string], params.relatedId)
      );

      const existingSoftDeleted = await dbInstance
        .select()
        .from(this.table)
        .where(softDeletedWhereClause)
        .limit(1);

      if (existingSoftDeleted.length > 0) {
        const result = await dbInstance
          .update(this.table)
          .set({
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(softDeletedWhereClause)
          .returning();

        const reactivatedItem = this.first(result);
        return this.toEntity(reactivatedItem as TPivotModel);
      }

      const whereClause = this.where(
        this.table,
        this.parentIdField,
        this.relatedIdField,
        params.parentId,
        params.relatedId
      );

      const existingPivot = await dbInstance.select().from(this.table).where(whereClause).limit(1);

      if (existingPivot.length > 0) {
        return this.toEntity(existingPivot[0]);
      }

      const insertValues = this.insertValues(
        this.parentIdField,
        this.relatedIdField,
        params.parentId,
        params.relatedId
      );

      const result = await dbInstance.insert(this.table).values(insertValues).returning();
      console.log('result', result);
      const insertedItem = this.first(result);
      console.log('insertedItem', insertedItem);
      return this.toEntity(insertedItem as TPivotModel);
    } catch (error) {
      console.error('Error adding pivot relationship:', error);
      throw error;
    }
  }

  protected async softDelete(
    params: BasePivotRemoveArgs,
    transaction?: Transaction
  ): Promise<TPivotEntity> {
    const dbInstance = transaction || this.db;

    try {
      const whereClause = this.where(
        this.table,
        this.parentIdField,
        this.relatedIdField,
        params.parentId,
        params.relatedId
      );

      const result = await dbInstance
        .update(this.table)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(whereClause)
        .returning();

      const deletedItem = this.first(result);
      if (!deletedItem) {
        throw new Error('Relationship not found');
      }

      return this.toEntity(deletedItem as TPivotModel);
    } catch (error) {
      console.error('Error soft deleting pivot relationship:', error);
      throw error;
    }
  }

  protected async hardDelete(
    params: BasePivotRemoveArgs,
    transaction?: Transaction
  ): Promise<TPivotEntity> {
    const dbInstance = transaction || this.db;

    try {
      const whereClause = this.where(
        this.table,
        this.parentIdField,
        this.relatedIdField,
        params.parentId,
        params.relatedId
      );

      const result = await dbInstance.delete(this.table).where(whereClause).returning();

      const deletedItem = this.first(result);
      if (!deletedItem) {
        throw new Error('Relationship not found');
      }

      return this.toEntity(deletedItem as TPivotModel);
    } catch (error) {
      console.error('Error hard deleting pivot relationship:', error);
      throw error;
    }
  }
}
