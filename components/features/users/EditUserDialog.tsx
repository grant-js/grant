'use client';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Role, User as UserType, Tag } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useRoles } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { editUserSchema, EditUserFormValues } from './types';

export function EditUserDialog() {
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope });
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { updateUser, addUserRole, addUserTag, removeUserRole, removeUserTag } = useUserMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
  const userToEdit = useUsersStore((state) => state.userToEdit);
  const setUserToEdit = useUsersStore((state) => state.setUserToEdit);

  const fields: EditDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'form.email',
      placeholder: 'form.email',
      type: 'email',
      required: true,
    },
  ];

  const relationships: EditDialogRelationship[] = [
    {
      name: 'roleIds',
      label: 'form.roles',
      renderComponent: (props: any) => <CheckboxList {...props} />,
      items: roles.map((role: Role) => ({
        id: role.id,
        name: role.name,
        description: role.description || undefined,
      })),
      loading: rolesLoading,
      loadingText: 'form.rolesLoading',
      emptyText: 'form.noRolesAvailable',
    },
    {
      name: 'tagIds',
      label: 'form.tags',
      renderComponent: (props: any) => <TagCheckboxList {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  const mapUserToFormValues = (user: UserType): EditUserFormValues => ({
    name: user.name,
    email: user.email,
    roleIds: user.roles?.map((role: Role) => role.id),
    tagIds: user.tags?.map((tag: Tag) => tag.id),
  });

  const handleUpdate = async (userId: string, values: EditUserFormValues) => {
    await updateUser(userId, {
      name: values.name,
      email: values.email,
    });
  };

  const handleAddRelationships = async (
    userId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'roleIds') {
      const addPromises = itemIds.map((roleId) =>
        addUserRole({
          userId,
          roleId,
        }).catch((error: any) => {
          console.error('Error adding user role:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    } else if (relationshipName === 'tagIds') {
      const addPromises = itemIds.map((tagId) =>
        addUserTag({
          userId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding user tag:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    }
  };

  const handleRemoveRelationships = async (
    userId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'roleIds') {
      const removePromises = itemIds.map((roleId) =>
        removeUserRole({
          userId,
          roleId,
        }).catch((error: any) => {
          console.error('Error removing user role:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    } else if (relationshipName === 'tagIds') {
      const removePromises = itemIds.map((tagId) =>
        removeUserTag({
          userId,
          tagId,
        }).catch((error: any) => {
          console.error('Error removing user tag:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUserToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={userToEdit}
      open={!!userToEdit}
      onOpenChange={handleOpenChange}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      schema={editUserSchema}
      defaultValues={{
        name: '',
        email: '',
        roleIds: [],
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapUserToFormValues}
      onUpdate={handleUpdate}
      onAddRelationships={handleAddRelationships}
      onRemoveRelationships={handleRemoveRelationships}
      translationNamespace="users"
    />
  );
}
