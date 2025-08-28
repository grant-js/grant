export * from './validation';
export * from './schemas';
export * from './AuditService';
export * from './dynamicSchemas';

export interface UnifiedDeleteParams {
  id: string;
  hardDelete?: boolean;
}

export interface UnifiedDeleteResult<T> {
  entity: T;
  isHardDelete: boolean;
}
