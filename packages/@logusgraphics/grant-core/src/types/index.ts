// Core types for the Grant ACL system
export interface User {
  id: string;
  email: string;
  // TODO: Add more user properties
}

export interface Role {
  id: string;
  name: string;
  // TODO: Add more role properties
}

export interface Group {
  id: string;
  name: string;
  // TODO: Add more group properties
}

export interface Permission {
  id: string;
  action: PermissionAction;
  // TODO: Add more permission properties
}

export interface Organization {
  id: string;
  name: string;
  // TODO: Add more organization properties
}

export interface Project {
  id: string;
  name: string;
  organizationId: string;
  // TODO: Add more project properties
}

export type PermissionAction =
  | 'user:read'
  | 'user:create'
  | 'user:update'
  | 'user:delete'
  | 'role:read'
  | 'role:create'
  | 'role:update'
  | 'role:delete'
  | 'organization:read'
  | 'organization:update'
  | 'project:read'
  | 'project:create'
  | 'project:update'
  | 'project:delete';

export type ScopeLevel = 'organization' | 'project';

export interface ACLContext {
  user: User | null;
  organization?: Organization;
  project?: Project;
}

export interface ACLOptions {
  apiUrl?: string;
  // TODO: Add more configuration options
}
