/** Subset of selected fields requested by GraphQL field selection */
export type SelectedFields<T> = { requestedFields?: Array<keyof T> };
