'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Plus } from 'lucide-react';
import { DefaultValues } from 'react-hook-form';

import {
  CreateDialog,
  DialogField,
  DialogRelationship,
  PrimaryTagSelector,
  PrimaryTagSelectorProps,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useProjectMutations } from '@/hooks';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useProjectScope, useScopeFromParams } from '@/hooks/common';
import { useTags } from '@/hooks/tags';
import { useProjectsStore } from '@/stores/projects.store';

import { createProjectSchema, type ProjectCreateFormValues } from './project-types';

interface ProjectCreateDialogProps {
  /** When true, no trigger is rendered; dialog is opened only via store (e.g. from project switcher). */
  hideTrigger?: boolean;
}

export function ProjectCreateDialog({ hideTrigger }: ProjectCreateDialogProps = {}) {
  const grantScope = useScopeFromParams();
  const projectScope = useProjectScope();
  const { tags, loading: tagsLoading } = useTags({ scope: grantScope!, limit: -1 });
  const isCreateDialogOpen = useProjectsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useProjectsStore((state) => state.setCreateDialogOpen);
  const { createProject } = useProjectMutations();

  const canCreate = useGrant(ResourceSlug.Project, ResourceAction.Create, {
    scope: grantScope!,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(grantScope);

  if (!grantScope || !canCreate || requiresEmailVerification) {
    return null;
  }

  const fields: DialogField[] = [
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
  ];

  const defaultValues: DefaultValues<ProjectCreateFormValues> = {
    name: '',
    description: '',
    tagIds: [],
    primaryTagId: '',
  };

  const handleSubmit = async (values: ProjectCreateFormValues) => {
    await createProject({
      name: values.name,
      description: values.description,
      scope: projectScope!,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  const relationships: DialogRelationship[] = [
    {
      name: 'tagIds',
      label: 'form.tags',
      renderComponent: (props: TagCheckboxListProps) => <TagCheckboxList {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
    {
      name: 'primaryTagId',
      label: 'form.primaryTag',
      renderComponent: (props: PrimaryTagSelectorProps) => <PrimaryTagSelector {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      icon={Plus}
      schema={createProjectSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="createDialog.cancel"
      translationNamespace="projects"
      submittingText="createDialog.submitting"
      onCreate={handleSubmit}
      onOpenChange={handleOpenChange}
      hideTrigger={hideTrigger}
    />
  );
}
