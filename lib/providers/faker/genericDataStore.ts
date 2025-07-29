import fs from 'fs';
import path from 'path';

import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { Auditable } from '@/graphql/generated/types';

// Generic types for the data store
export interface BaseEntity extends Auditable {
  [key: string]: any;
}

export interface CreateInput {
  [key: string]: any;
}

export interface UpdateInput {
  [key: string]: any;
}

export interface SortConfig {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface ValidationRule {
  field: string;
  unique: boolean;
  required?: boolean;
  validator?: (value: any) => boolean;
}

// Helper function to generate audit timestamps
export const generateAuditTimestamps = () => {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    updatedAt: now,
  };
};

// Helper function to update audit timestamp
export const updateAuditTimestamp = () => {
  return {
    updatedAt: new Date().toISOString(),
  };
};

export interface EntityConfig<T extends BaseEntity, C extends CreateInput, U extends UpdateInput> {
  entityName: string;
  dataFileName: string;
  generateId: (input: C) => string;
  generateEntity: (input: C, id: string) => T;
  updateEntity: (entity: T, input: U) => T;
  sortableFields: string[];
  validationRules: ValidationRule[];
  initialData?: () => T[];
}

export class GenericFakerDataStore<
  T extends BaseEntity,
  C extends CreateInput,
  U extends UpdateInput,
> {
  private config: EntityConfig<T, C, U>;
  private dataFilePath: string;

  constructor(config: EntityConfig<T, C, U>) {
    this.config = config;
    this.dataFilePath = path.join(process.cwd(), 'data', config.dataFileName);
  }

  // Ensure the data directory exists
  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dataFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  // Initialize or load the data store
  private initializeDataStore(): T[] {
    this.ensureDataDirectory();

    if (!fs.existsSync(this.dataFilePath)) {
      const entities = this.config.initialData ? this.config.initialData() : [];
      fs.writeFileSync(this.dataFilePath, JSON.stringify(entities, null, 2));
      return entities;
    }

    const data = fs.readFileSync(this.dataFilePath, 'utf-8');
    return JSON.parse(data);
  }

  // Save entities to the data store
  private saveEntities(entities: T[]): void {
    this.ensureDataDirectory();
    fs.writeFileSync(this.dataFilePath, JSON.stringify(entities, null, 2));
  }

  // Validate entity uniqueness
  private validateUniqueness(entities: T[], newEntity: T, excludeId?: string): void {
    for (const rule of this.config.validationRules) {
      if (rule.unique) {
        const existingEntity = entities.find(
          (entity) => entity.id !== excludeId && entity[rule.field] === newEntity[rule.field]
        );

        if (existingEntity) {
          throw new ApiError(
            `${this.config.entityName} with ${rule.field} '${newEntity[rule.field]}' already exists`,
            ApolloServerErrorCode.BAD_REQUEST
          );
        }
      }
    }
  }

  // Sort entities based on configuration
  private sortEntities(entities: T[], sortConfig?: SortConfig): T[] {
    if (!sortConfig || !this.config.sortableFields.includes(sortConfig.field)) {
      return entities;
    }

    return [...entities].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Handle string comparison (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase() < bValue.toLowerCase() ? -1 : 1;
        return sortConfig.order === 'ASC' ? comparison : -comparison;
      }

      // Handle other types
      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.order === 'ASC' ? comparison : -comparison;
    });
  }

  // Get all entities with optional sorting
  public getEntities(sortConfig?: SortConfig): T[] {
    const entities = this.initializeDataStore();
    return this.sortEntities(entities, sortConfig);
  }

  // Create a new entity
  public createEntity(input: C): T {
    const entities = this.getEntities();
    const id = this.config.generateId(input);

    const newEntity = this.config.generateEntity(input, id);

    // Validate uniqueness
    this.validateUniqueness(entities, newEntity);

    entities.push(newEntity);
    this.saveEntities(entities);
    return newEntity;
  }

  // Update an entity
  public updateEntity(entityId: string, input: U): T | null {
    const entities = this.getEntities();
    const entityIndex = entities.findIndex((entity) => entity.id === entityId);

    if (entityIndex === -1) {
      return null;
    }

    const updatedEntity = this.config.updateEntity(entities[entityIndex], input);

    // Validate uniqueness (excluding the current entity)
    this.validateUniqueness(entities, updatedEntity, entityId);

    entities[entityIndex] = updatedEntity;
    this.saveEntities(entities);
    return updatedEntity;
  }

  // Delete an entity
  public deleteEntity(entityId: string): T | null {
    const entities = this.getEntities();
    const entityToDelete = entities.find((entity) => entity.id === entityId);

    if (!entityToDelete) {
      return null;
    }

    const filteredEntities = entities.filter((entity) => entity.id !== entityId);
    this.saveEntities(filteredEntities);
    return entityToDelete;
  }

  // Check if an entity exists by ID
  public entityExists(entityId: string): boolean {
    const entities = this.getEntities();
    return entities.some((entity) => entity.id === entityId);
  }

  // Get entity by ID
  public getEntityById(entityId: string): T | null {
    const entities = this.getEntities();
    return entities.find((entity) => entity.id === entityId) || null;
  }
}

// Helper function to create a data store instance
export function createFakerDataStore<
  T extends BaseEntity,
  C extends CreateInput,
  U extends UpdateInput,
>(config: EntityConfig<T, C, U>): GenericFakerDataStore<T, C, U> {
  return new GenericFakerDataStore(config);
}
