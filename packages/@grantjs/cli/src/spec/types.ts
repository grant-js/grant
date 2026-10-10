export interface CliOperation {
  operationId: string;
  method: string;
  path: string;
  tags: string[];
  summary: string;
  pathParams: string[];
}
