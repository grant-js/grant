export * from './validation';
export * from './schemas';
export * from './AuditService';
export * from './dynamicSchemas';

export type DeleteParams = {
  hardDelete?: boolean;
};

export type SelectedFields<T> = {
  requestedFields?: Array<keyof T>;
};
