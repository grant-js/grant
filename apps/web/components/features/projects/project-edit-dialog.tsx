'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Project, Tag } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';

import {
  DialogField,
  DialogRelationship,
  EditDialog,
  PrimaryTagSelector,
  PrimaryTagSelectorProps,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams, useProjectTags } from '@/hooks/common';
import { useProjectMutations } from '@/hooks/projects';
import { useTags } from '@/hooks/tags';
import { useProjectsStore } from '@/stores/projects.store';

import { editProjectSchema, type ProjectEditFormValues } from './project-types';

export function ProjectEditDialog() {
  const scope = useScopeFromParams();
  const getProjectTags = useProjectTags();
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const projectToEdit = useProjectsStore((state) => state.projectToEdit);
  const setProjectToEdit = useProjectsStore((state) => state.setProjectToEdit);
  const { updateProject } = useProjectMutations();

  const canUpdate = useGrant(ResourceSlug.Project, ResourceAction.Update, {
    scope: scope!,
    context: projectToEdit
      ? { resource: { id: projectToEdit.id, scope: { projects: [projectToEdit.id] } } }
      : undefined,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || !canUpdate || requiresEmailVerification) {
    return null;
  }

  const fields: DialogField[] = [
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

  const defaultValues: DefaultValues<ProjectEditFormValues> = {
    name: projectToEdit?.name || '',
    description: projectToEdit?.description || '',
    tagIds: projectToEdit?.tags?.map((tag: Tag) => tag.id) || [],
    primaryTagId: projectToEdit?.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
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

  const mapProjectToFormValues = (project: Project): ProjectEditFormValues => ({
    name: project.name,
    description: project.description || '',
    tagIds: getProjectTags(project)?.map((tag: Tag) => tag.id),
    primaryTagId: getProjectTags(project)?.find((tag: Tag) => tag.isPrimary)?.id || '',
  });

  const handleUpdate = async (projectId: string, values: ProjectEditFormValues) => {
    await updateProject(projectId, {
      scope: scope!,
      name: values.name,
      description: values.description,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setProjectToEdit(null);
    }
  };

  return (
    <EditDialog
      open={!!projectToEdit}
      entity={projectToEdit}
      schema={editProjectSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      translationNamespace="projects"
      mapEntityToFormValues={mapProjectToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
