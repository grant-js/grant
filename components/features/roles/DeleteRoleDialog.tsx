'use client';

import { DeleteDialog } from '@/components/common';
import { Tenant } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useOrganizationRoleMutations } from '@/hooks/organization-roles';
import { useProjectRoleMutations } from '@/hooks/project-roles';
import { useRoleMutations } from '@/hooks/roles';
import { useRolesStore } from '@/stores/roles.store';

export function DeleteRoleDialog() {
  const scope = useScopeFromParams();
  const { deleteRole, removeRoleGroup, removeRoleTag } = useRoleMutations();
  const { removeProjectRole } = useProjectRoleMutations();
  const { removeOrganizationRole } = useOrganizationRoleMutations();

  const roleToDelete = useRolesStore((state) => state.roleToDelete);
  const setRoleToDelete = useRolesStore((state) => state.setRoleToDelete);

  const handleDelete = async (id: string, name: string) => {
    await deleteRole(id, name);
  };

  const handleSuccess = async () => {
    if (!roleToDelete) {
      return;
    }

    try {
      const promises: Promise<any>[] = [];

      if (scope.tenant === Tenant.Organization) {
        promises.push(
          removeOrganizationRole({
            organizationId: scope.id,
            roleId: roleToDelete.id,
          })
        );
      } else if (scope.tenant === Tenant.Project) {
        promises.push(
          removeProjectRole({
            projectId: scope.id,
            roleId: roleToDelete.id,
          }).catch((error: any) => {
            console.error('Error removing project role:', error);
          })
        );
      }

      if (roleToDelete.groups && roleToDelete.groups.length > 0) {
        const removeGroupPromises = roleToDelete.groups.map((group) =>
          removeRoleGroup({
            roleId: roleToDelete.id,
            groupId: group.id,
          })
        );
        promises.push(...removeGroupPromises);
      }

      // Remove all tag relationships
      if (roleToDelete.tags && roleToDelete.tags.length > 0) {
        const removeTagPromises = roleToDelete.tags.map((tag) =>
          removeRoleTag({
            roleId: roleToDelete.id,
            tagId: tag.id,
          })
        );
        promises.push(...removeTagPromises);
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      setRoleToDelete(null);
    } catch (error) {
      console.error('Error during role cleanup:', error);
      setRoleToDelete(null);
    }
  };

  return (
    <DeleteDialog
      open={!!roleToDelete}
      onOpenChange={(open) => !open && setRoleToDelete(null)}
      entityToDelete={roleToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      onSuccess={handleSuccess}
      translationNamespace="roles"
    />
  );
}
