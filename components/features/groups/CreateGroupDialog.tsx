'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions/usePermissions';
import { Permission } from '@/graphql/generated/types';
import { createGroupSchema, CreateGroupFormValues, CreateGroupDialogProps } from './types';
import { Group } from 'lucide-react';
import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';

interface CreateGroupDialogComponentProps extends Partial<CreateGroupDialogProps> {
  children?: React.ReactNode;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  children,
}: CreateGroupDialogComponentProps) {
  const t = useTranslations('groups');
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { createGroup, addGroupPermission } = useGroupMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.namePlaceholder',
      type: 'text',
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.descriptionPlaceholder',
      type: 'text',
    },
  ];

  const relationships: CreateDialogRelationship[] = [
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

  const handleCreate = async (values: CreateGroupFormValues) => {
    setIsSubmitting(true);
    try {
      return await createGroup({
        name: values.name,
        description: values.description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRelationships = async (groupId: string, values: CreateGroupFormValues) => {
    if (values.permissionIds && values.permissionIds.length > 0) {
      const addPromises = values.permissionIds.map((permissionId) =>
        addGroupPermission({
          groupId,
          permissionId,
        }).catch((error: any) => {
          console.error('Error adding group permission:', error);
        })
      );
      await Promise.all(addPromises);
    }
  };

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="create.title"
      description="create.description"
      triggerText="createDialog.trigger"
      confirmText="actions.create"
      cancelText="actions.cancel"
      icon={Group}
      schema={createGroupSchema}
      defaultValues={{
        name: '',
        description: '',
        permissionIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="groups"
      isSubmitting={isSubmitting}
      submittingText="actions.creating"
    >
      {children}
    </CreateDialog>
  );
}
