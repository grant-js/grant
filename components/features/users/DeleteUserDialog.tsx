'use client';

import { DeleteDialog } from '@/components/common';
import { Tenant } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useOrganizationUserMutations } from '@/hooks/organization-users';
import { useProjectUserMutations } from '@/hooks/project-users';
import { useUserMutations } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

export function DeleteUserDialog() {
  const scope = useScopeFromParams();
  const { deleteUser, removeUserRole, removeUserTag } = useUserMutations();
  const { removeOrganizationUser } = useOrganizationUserMutations();
  const { removeProjectUser } = useProjectUserMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
  const userToDelete = useUsersStore((state) => state.userToDelete);
  const setUserToDelete = useUsersStore((state) => state.setUserToDelete);

  const handleDelete = async (id: string, name: string) => {
    await deleteUser(id, name);
  };

  const handleSuccess = async () => {
    if (!userToDelete) {
      return;
    }

    try {
      const relationshipPromises: Promise<any>[] = [];

      if (scope.tenant === Tenant.Organization) {
        const removeOrganizationUserPromise = removeOrganizationUser({
          organizationId: scope.id,
          userId: userToDelete.id,
        }).catch((error: any) => {
          console.error('Error removing organization user:', error);
        });
        relationshipPromises.push(removeOrganizationUserPromise);
      } else if (scope.tenant === Tenant.Project) {
        const removeProjectUserPromise = removeProjectUser({
          projectId: scope.id,
          userId: userToDelete.id,
        }).catch((error: any) => {
          console.error('Error removing project user:', error);
        });
        relationshipPromises.push(removeProjectUserPromise);
      }

      if (userToDelete.roles && userToDelete.roles.length > 0) {
        const removeRolePromises = userToDelete.roles.map((role) =>
          removeUserRole({
            userId: userToDelete.id,
            roleId: role.id,
          }).catch((error: any) => {
            console.error('Error removing user role:', error);
          })
        );
        relationshipPromises.push(...removeRolePromises);
      }

      // Remove user tags
      if (userToDelete.tags && userToDelete.tags.length > 0) {
        const removeTagPromises = userToDelete.tags.map((tag) =>
          removeUserTag({
            userId: userToDelete.id,
            tagId: tag.id,
          }).catch((error: any) => {
            console.error('Error removing user tag:', error);
          })
        );
        relationshipPromises.push(...removeTagPromises);
      }

      if (relationshipPromises.length > 0) {
        await Promise.all(relationshipPromises);
      }

      setUserToDelete(null);
    } catch (error) {
      console.error('Error during user cleanup:', error);
      setUserToDelete(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUserToDelete(null);
    }
  };

  return (
    <DeleteDialog
      open={!!userToDelete}
      onOpenChange={handleOpenChange}
      entityToDelete={userToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      onSuccess={handleSuccess}
      translationNamespace="users"
    />
  );
}
