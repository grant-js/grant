import { StandardRoleName } from '@logusgraphics/grant-constants';
import { Role } from '@logusgraphics/grant-schema';

/**
 * Role hierarchy: Higher numbers = more permissions
 * Owner > Admin > Dev > Viewer
 */
const ROLE_HIERARCHY: Record<string, number> = {
  [StandardRoleName.Owner]: 4,
  [StandardRoleName.Admin]: 3,
  [StandardRoleName.Dev]: 2,
  [StandardRoleName.Viewer]: 1,
};

/**
 * Get the hierarchy level of a role
 */
function getRoleLevel(roleName: string | null | undefined): number {
  if (!roleName) return 0;
  return ROLE_HIERARCHY[roleName.toLowerCase()] || 0;
}

/**
 * Check if the current user's role is higher than or equal to the target role
 */
function canManageRole(
  currentRoleName: string | null | undefined,
  targetRoleName: string | null | undefined
): boolean {
  const currentLevel = getRoleLevel(currentRoleName);
  const targetLevel = getRoleLevel(targetRoleName);

  // Cannot manage roles at same level or higher
  // Owner can manage Admin, Dev, Viewer (but not other Owners)
  // Admin can manage Dev, Viewer (but not Owner or Admin)
  return currentLevel > targetLevel;
}

/**
 * Check if user can invite members
 * Only Owner and Admin can invite
 */
export function canInviteMembers(currentRole: Role | null | undefined): boolean {
  if (!currentRole) return false;
  const roleName = currentRole.name?.toLowerCase();
  return roleName === StandardRoleName.Owner || roleName === StandardRoleName.Admin;
}

/**
 * Check if user can update member roles
 * Only Owner and Admin can update roles
 */
export function canUpdateMemberRoles(currentRole: Role | null | undefined): boolean {
  if (!currentRole) return false;
  const roleName = currentRole.name?.toLowerCase();
  return roleName === StandardRoleName.Owner || roleName === StandardRoleName.Admin;
}

/**
 * Check if current user can update a specific member's role
 * Based on hierarchy: can only update roles below their own level
 */
export function canUpdateMemberRole(
  currentRole: Role | null | undefined,
  targetMemberRole: Role | null | undefined
): boolean {
  if (!currentRole || !targetMemberRole) return false;

  const currentRoleName = currentRole.name?.toLowerCase();
  const targetRoleName = targetMemberRole.name?.toLowerCase();

  // Must be Owner or Admin
  if (currentRoleName !== StandardRoleName.Owner && currentRoleName !== StandardRoleName.Admin) {
    return false;
  }

  // Owner can update Admin, Dev, Viewer (but not other Owners)
  // Admin can update Dev, Viewer (but not Owner or Admin)
  return canManageRole(currentRoleName, targetRoleName);
}

/**
 * Get roles that the current user can assign to members
 * Based on hierarchy: can only assign roles below their own level
 */
export function getAssignableRoles(
  currentRole: Role | null | undefined,
  availableRoles: Role[]
): Role[] {
  if (!currentRole) return [];

  const currentRoleName = currentRole.name?.toLowerCase();

  if (currentRoleName === StandardRoleName.Owner) {
    // Owner can assign Admin, Dev, Viewer (but not Owner)
    return availableRoles.filter((role) => role.name?.toLowerCase() !== StandardRoleName.Owner);
  }

  if (currentRoleName === StandardRoleName.Admin) {
    // Admin can assign Dev, Viewer (but not Owner or Admin)
    return availableRoles.filter(
      (role) =>
        role.name?.toLowerCase() !== StandardRoleName.Owner &&
        role.name?.toLowerCase() !== StandardRoleName.Admin
    );
  }

  // Dev and Viewer cannot assign roles
  return [];
}
