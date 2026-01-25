import { DbSchema } from '@grantjs/database';
import { SQLWrapper, and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { NotFoundError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';

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

export abstract class PivotRepository<
  TPivotModel extends BasePivotModel,
  TPivotEntity extends BasePivotEntity,
> {
  protected readonly logger = createModuleLogger('PivotRepository');
  protected abstract table: any;
  protected abstract uniqueIndexFields: Array<keyof TPivotModel>;

  protected abstract toEntity(dbPivot: TPivotModel): TPivotEntity;

  constructor(protected db: DbSchema) {}

  protected whereUnique(params: Record<string, unknown>): SQLWrapper | undefined {
    const conditions: SQLWrapper[] = [];

    for (const fieldKey of this.uniqueIndexFields) {
      const fieldValue = params[fieldKey as string];
      if (fieldValue !== undefined) {
        conditions.push(eq(this.table[fieldKey], fieldValue));
      }
    }

    if (conditions.length === 0) {
      return undefined;
    }
    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  protected toInsertValues(params: Record<string, unknown>): Record<string, unknown> {
    const baseValues: Record<string, unknown> = {
      ...params,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    this.uniqueIndexFields.forEach((field: keyof TPivotModel) => {
      const fieldValue = params[field as string];
      if (fieldValue !== undefined) {
        baseValues[field as string] = fieldValue;
      }
    });

    return baseValues;
  }

  protected first<T>(result: T | T[]): T {
    return Array.isArray(result) ? result[0] : result;
  }

  protected async query(
    params: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<TPivotEntity[]> {
    const db = transaction || this.db;

    try {
      const unique = this.whereUnique(params);
      const notSoftDeleted = unique
        ? and(unique, isNull(this.table.deletedAt))
        : isNull(this.table.deletedAt);

      const result = await db.select().from(this.table).where(notSoftDeleted);

      return result.map((item: TPivotModel) => this.toEntity(item));
    } catch (error) {
      this.logger.error({
        msg: 'Error querying pivot table',
        err: error,
      });
      throw error;
    }
  }

  protected async queryIntersection(
    params: Record<string, string[]>,
    transaction?: Transaction
  ): Promise<TPivotEntity[]> {
    const db = transaction || this.db;
    const intersected = Object.entries(params).map(([fieldKey, values]) => {
      return inArray(this.table[fieldKey], values);
    });
    const notSoftDeleted = and(...intersected, isNull(this.table.deletedAt));

    const result = await db.select().from(this.table).where(notSoftDeleted);

    return result.map((item: TPivotModel) => this.toEntity(item));
  }

  protected async add(
    params: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<TPivotEntity> {
    const db = transaction || this.db;
    try {
      const unique = this.whereUnique(params);
      const softDeleted = and(unique, isNotNull(this.table.deletedAt));

      const existingSoftDeleted = await db.select().from(this.table).where(softDeleted).limit(1);

      if (existingSoftDeleted.length > 0) {
        const result = await db
          .update(this.table)
          .set({
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(softDeleted)
          .returning();

        const reactivatedItem = this.first(result);
        return this.toEntity(reactivatedItem as TPivotModel);
      }

      const notSoftDeleted = and(unique, isNull(this.table.deletedAt));
      const existingPivot = await db.select().from(this.table).where(notSoftDeleted).limit(1);

      if (existingPivot.length > 0) {
        return this.toEntity(existingPivot[0]);
      }

      const insertValues = this.toInsertValues(params);

      const result = await db.insert(this.table).values(insertValues).returning();
      const insertedItem = this.first(result);
      return this.toEntity(insertedItem as TPivotModel);
    } catch (error) {
      this.logger.error({
        msg: 'Error adding pivot relationship',
        err: error,
      });
      throw error;
    }
  }

  protected async update(
    params: Record<string, unknown>,
    update: Partial<TPivotModel>,
    transaction?: Transaction
  ): Promise<TPivotEntity> {
    const db = transaction || this.db;
    const unique = this.whereUnique(params);
    const notSoftDeleted = and(unique, isNull(this.table.deletedAt));

    const updatedItem = await db.update(this.table).set(update).where(notSoftDeleted).returning();
    return this.toEntity(updatedItem[0] as TPivotModel);
  }

  protected async softDelete(
    params: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<TPivotEntity> {
    const db = transaction || this.db;

    try {
      const unique = this.whereUnique(params);
      const notSoftDeleted = and(unique, isNull(this.table.deletedAt));

      const result = await db
        .update(this.table)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(notSoftDeleted)
        .returning();

      const deletedItem = this.first(result);
      if (!deletedItem) {
        throw new NotFoundError('Relationship not found', 'errors:notFound.resource');
      }

      return this.toEntity(deletedItem as TPivotModel);
    } catch (error) {
      this.logger.error({
        msg: 'Error soft deleting pivot relationship',
        err: error,
      });
      throw error;
    }
  }

  protected async hardDelete(
    params: Record<string, unknown>,
    transaction?: Transaction
  ): Promise<TPivotEntity> {
    const db = transaction || this.db;

    try {
      const unique = this.whereUnique(params);

      const result = await db.delete(this.table).where(unique?.getSQL()).returning();

      const deletedItem = this.first(result);
      if (!deletedItem) {
        throw new NotFoundError('Relationship not found', 'errors:notFound.resource');
      }

      return this.toEntity(deletedItem as TPivotModel);
    } catch (error) {
      this.logger.error({
        msg: 'Error hard deleting pivot relationship',
        err: error,
      });
      throw error;
    }
  }
}
