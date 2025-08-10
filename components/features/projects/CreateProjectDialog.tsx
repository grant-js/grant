'use client';

import { Plus } from 'lucide-react';

import { CreateDialog } from '@/components/common';
import { useProjectMutations, useOrganizationProjectMutations } from '@/hooks';
import { useOrganizationsStore } from '@/stores/organizations.store';
import { useProjectsStore } from '@/stores/projects.store';

import { createProjectSchema, type CreateProjectFormValues } from './types';

export function CreateProjectDialog() {
  const selectedOrganizationId = useOrganizationsStore((state) => state.selectedOrganizationId);
  const isCreateDialogOpen = useProjectsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useProjectsStore((state) => state.setCreateDialogOpen);

  const { createProject } = useProjectMutations();
  const { addOrganizationProject } = useOrganizationProjectMutations();

  const handleSubmit = async (values: CreateProjectFormValues) => {
    return createProject(values);
  };

  const handleAddRelationships = async (projectId: string, _values: CreateProjectFormValues) => {
    if (!selectedOrganizationId) {
      throw new Error('No organization selected');
    }
    await addOrganizationProject({
      organizationId: selectedOrganizationId,
      projectId,
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
      cancelText="createDialog.cancel"
      icon={Plus}
      schema={createProjectSchema}
      defaultValues={{
        name: '',
        description: '',
      }}
      fields={[
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
          type: 'textarea',
        },
      ]}
      onCreate={handleSubmit}
      onAddRelationships={handleAddRelationships}
      translationNamespace="projects"
      submittingText="createDialog.submitting"
    />
  );
}
