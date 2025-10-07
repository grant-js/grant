import type { User, PermissionAction, ScopeLevel, ACLOptions } from '../types';

// Core ACL class
export class ACL {
  constructor(options: ACLOptions) {
    // TODO: Implement ACL core logic
  }

  hasPermission(user: User, action: PermissionAction, scope: ScopeLevel): boolean {
    // TODO: Implement permission checking logic
    return false;
  }
}
