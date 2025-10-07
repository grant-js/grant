'use client';

import { Building2 } from 'lucide-react';

import { CreateDialog, CreateDialogField } from '@/components/common/CreateDialog';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { createOrganizationSchema, CreateOrganizationFormValues } from './types';

export function CreateOrganizationDialog() {
  const { createOrganization } = useOrganizationMutations();

  const isCreateDialogOpen = useOrganizationsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useOrganizationsStore((state) => state.setCreateDialogOpen);

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
  ];

  const handleCreate = async (values: CreateOrganizationFormValues) => {
    return await createOrganization({
      name: values.name,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      onOpenChange={handleOpenChange}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="deleteDialog.cancel"
      icon={Building2}
      schema={createOrganizationSchema}
      defaultValues={{
        name: '',
        tagIds: [],
      }}
      fields={fields}
      onCreate={handleCreate}
      translationNamespace="organizations"
      submittingText="createDialog.submitting"
    />
  );
}
