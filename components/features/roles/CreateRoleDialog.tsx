'use client';

import { useTranslations } from 'next-intl';
import { createRoleSchema, CreateRoleFormValues, CreateRoleDialogProps } from './types';
import { useRoleMutations } from '@/hooks/roles';
import { useGroups } from '@/hooks/groups';
import { Group } from '@/graphql/generated/types';
import { Shield } from 'lucide-react';
import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';

interface CreateRoleDialogComponentProps extends Partial<CreateRoleDialogProps> {
  children?: React.ReactNode;
}

export function CreateRoleDialog({ open, onOpenChange, children }: CreateRoleDialogComponentProps) {
  const t = useTranslations('roles');
  const { groups, loading: groupsLoading } = useGroups();
  const { createRole, addRoleGroup } = useRoleMutations();

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.description',
      type: 'text',
    },
  ];

  const relationships: CreateDialogRelationship[] = [
    {
      name: 'groupIds',
      label: 'form.groups',
      items: groups.map((group: Group) => ({
        id: group.id,
        name: group.name,
        description: group.description ?? undefined,
      })),
      loading: groupsLoading,
      loadingText: 'form.groupsLoading',
      emptyText: 'form.noGroupsAvailable',
    },
  ];

  const handleCreate = async (values: CreateRoleFormValues) => {
    return await createRole({
      name: values.name,
      description: values.description,
    });
  };

  const handleAddRelationships = async (roleId: string, values: CreateRoleFormValues) => {
    if (values.groupIds && values.groupIds.length > 0) {
      const addPromises = values.groupIds.map((groupId) =>
        addRoleGroup({
          roleId,
          groupId,
        }).catch((error: any) => {
          console.error('Error adding role group:', error);
        })
      );
      await Promise.all(addPromises);
    }
  };

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="deleteDialog.cancel"
      icon={Shield}
      schema={createRoleSchema}
      defaultValues={{
        name: '',
        description: '',
        groupIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="roles"
    >
      {children}
    </CreateDialog>
  );
}
