import { and, eq } from 'drizzle-orm';

import { db } from '@/graphql/lib/providers/database/connection';

import { buildPivotWhereClause, buildPivotInsertValues, getFirstResult } from './utils';

export interface BasePivotModel {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | null;
  [key: string]: unknown;
}

export interface BasePivotEntity extends BasePivotModel {
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | null;
  [key: string]: unknown;
}

export interface BasePivotQueryArgs {
  parentId: string;
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

  protected async query(params: BasePivotQueryArgs): Promise<TPivotEntity[]> {
    try {
      const whereClause = buildPivotWhereClause<TPivotModel>(
        this.table,
        this.parentIdField,
        this.relatedIdField,
        params.parentId
      );

      const result = await db.select().from(this.table).where(whereClause);

      return result.map((item: TPivotModel) => this.toEntity(item));
    } catch (error) {
      console.error('Error querying pivot table:', error);
      throw error;
    }
  }

  protected async add(params: BasePivotAddArgs): Promise<TPivotEntity> {
    try {
      const softDeletedWhereClause = and(
        eq(this.table[this.parentIdField as string], params.parentId),
        eq(this.table[this.relatedIdField as string], params.relatedId)
      );

      const existingSoftDeleted = await db
        .select()
        .from(this.table)
        .where(softDeletedWhereClause)
        .limit(1);

      if (existingSoftDeleted.length > 0) {
        const result = await db
          .update(this.table)
          .set({
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(softDeletedWhereClause)
          .returning();

        const reactivatedItem = getFirstResult(result);
        return this.toEntity(reactivatedItem as TPivotModel);
      }

      const whereClause = buildPivotWhereClause<TPivotModel>(
        this.table,
        this.parentIdField,
        this.relatedIdField,
        params.parentId,
        params.relatedId
      );

      const existingPivot = await db.select().from(this.table).where(whereClause).limit(1);

      if (existingPivot.length > 0) {
        return this.toEntity(existingPivot[0]);
      }

      const insertValues = buildPivotInsertValues<TPivotModel>(
        this.parentIdField,
        this.relatedIdField,
        params.parentId,
        params.relatedId
      );

      const result = await db.insert(this.table).values(insertValues).returning();

      const insertedItem = getFirstResult(result);
      return this.toEntity(insertedItem as TPivotModel);
    } catch (error) {
      console.error('Error adding pivot relationship:', error);
      throw error;
    }
  }

  protected async softDelete(params: BasePivotRemoveArgs): Promise<TPivotEntity> {
    try {
      const whereClause = buildPivotWhereClause(
        this.table,
        this.parentIdField as string,
        this.relatedIdField as string,
        params.parentId,
        params.relatedId
      );

      const result = await db
        .update(this.table)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(whereClause)
        .returning();

      const deletedItem = getFirstResult(result);
      if (!deletedItem) {
        throw new Error('Relationship not found');
      }

      return this.toEntity(deletedItem as TPivotModel);
    } catch (error) {
      console.error('Error soft deleting pivot relationship:', error);
      throw error;
    }
  }

  protected async hardDelete(params: BasePivotRemoveArgs): Promise<TPivotEntity> {
    try {
      const whereClause = buildPivotWhereClause(
        this.table,
        this.parentIdField as string,
        this.relatedIdField as string,
        params.parentId,
        params.relatedId
      );

      const result = await db.delete(this.table).where(whereClause).returning();

      const deletedItem = getFirstResult(result);
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
