'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { Group, Permission } from '@/graphql/generated/types';
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions/usePermissions';

import { editGroupSchema, EditGroupFormValues } from './types';

interface EditGroupDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
}

export function EditGroupDialog({ group, open, onOpenChange, currentPage }: EditGroupDialogProps) {
  const t = useTranslations('groups');
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { updateGroup, addGroupPermission, removeGroupPermission } = useGroupMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields: EditDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.namePlaceholder',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.descriptionPlaceholder',
      type: 'textarea',
    },
  ];

  const relationships: EditDialogRelationship[] = [
    {
      name: 'permissionIds',
      label: 'form.permissions',
      items: permissions.map((permission: Permission) => ({
        id: permission.id,
        name: permission.name,
        description: permission.description ?? undefined,
      })),
      loading: permissionsLoading,
      loadingText: 'form.permissionsLoading',
      emptyText: 'form.noPermissionsAvailable',
    },
  ];

  const mapGroupToFormValues = (group: Group): EditGroupFormValues => ({
    name: group.name,
    description: group.description || '',
    permissionIds: group.permissions?.map((permission) => permission.id),
  });

  const handleUpdate = async (groupId: string, values: EditGroupFormValues) => {
    setIsSubmitting(true);
    try {
      await updateGroup(groupId, {
        name: values.name,
        description: values.description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRelationships = async (
    groupId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'permissionIds') {
      const addPromises = itemIds.map((permissionId) =>
        addGroupPermission({
          groupId,
          permissionId,
        }).catch((error: any) => {
          console.error('Error adding group permission:', error);
          // Continue with other permission assignments even if one fails
        })
      );
      await Promise.all(addPromises);
    }
  };

  const handleRemoveRelationships = async (
    groupId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'permissionIds') {
      const removePromises = itemIds.map((permissionId) =>
        removeGroupPermission({
          groupId,
          permissionId,
        }).catch((error: any) => {
          // Handle "GroupPermission not found" error gracefully
          if (error.message?.includes('GroupPermission not found')) {
            console.warn('GroupPermission not found, skipping removal:', {
              groupId,
              permissionId,
            });
            return;
          }
          console.error('Error removing group permission:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    }
  };

  return (
    <EditDialog
      entity={group}
      open={open}
      onOpenChange={onOpenChange}
      title="edit.title"
      description="edit.description"
      confirmText="actions.update"
      cancelText="actions.cancel"
      updatingText="actions.updating"
      schema={editGroupSchema}
      defaultValues={{
        name: '',
        description: '',
        permissionIds: [],
      }}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapGroupToFormValues}
      onUpdate={handleUpdate}
      onAddRelationships={handleAddRelationships}
      onRemoveRelationships={handleRemoveRelationships}
      translationNamespace="groups"
      isSubmitting={isSubmitting}
    />
  );
}
