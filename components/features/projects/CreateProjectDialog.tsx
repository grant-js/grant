'use client';

import { Plus } from 'lucide-react';

import { CreateDialog } from '@/components/common';
import { useProjectMutations, useOrganizationProjectMutations } from '@/hooks';
import { useOrganizationsStore } from '@/stores/organizations.store';
import { useProjectsStore } from '@/stores/projects.store';

import { createProjectSchema, type CreateProjectFormValues } from './types';

export function CreateProjectDialog() {
  const isOpen = useProjectsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useProjectsStore((state) => state.setCreateDialogOpen);
  const selectedOrganizationId = useOrganizationsStore((state) => state.selectedOrganizationId);
  const { createProject } = useProjectMutations();
  const { addOrganizationProject } = useOrganizationProjectMutations();

  const handleSubmit = async (values: CreateProjectFormValues) => {
    if (!selectedOrganizationId) {
      throw new Error('No organization selected');
    }

    // First, create the project
    const createdProject = await createProject(values);

    if (createdProject) {
      // Then, create the organization-project relationship
      await addOrganizationProject({
        organizationId: selectedOrganizationId,
        projectId: createdProject.id,
      });
    }

    setCreateDialogOpen(false);
  };

  return (
    <CreateDialog
      open={isOpen}
      onOpenChange={setCreateDialogOpen}
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
      translationNamespace="projects"
      submittingText="createDialog.submitting"
    />
  );
}
