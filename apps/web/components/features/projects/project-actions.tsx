'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Project } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectsStore } from '@/stores/projects.store';

interface ProjectActionsProps {
  project: Project;
}

export function ProjectActions({ project }: ProjectActionsProps) {
  const t = useTranslations('projects');
  const setProjectToEdit = useProjectsStore((state) => state.setProjectToEdit);
  const setProjectToDelete = useProjectsStore((state) => state.setProjectToDelete);

  // Get scope from URL params (AccountProject or OrganizationProject)
  const scope = useScopeFromParams();

  // Check permissions using the Grant client (always call hooks, pass undefined scope if not available)
  const canUpdate = useGrant(ResourceSlug.Project, ResourceAction.Update, {
    scope: scope!,
    context: { resource: { id: project.id, scope: { projects: [project.id] } } },
  });
  const canDelete = useGrant(ResourceSlug.Project, ResourceAction.Delete, {
    scope: scope!,
    context: { resource: { id: project.id, scope: { projects: [project.id] } } },
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || (!canUpdate && !canDelete) || requiresEmailVerification) {
    return null;
  }

  // Build actions array based on permissions
  const actions = [];

  if (canUpdate) {
    actions.push({
      key: 'edit',
      label: t('actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: () => setProjectToEdit(project),
    });
  }

  if (canDelete) {
    actions.push({
      key: 'delete',
      label: t('actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => setProjectToDelete({ id: project.id, name: project.name }),
      variant: 'destructive' as const,
    });
  }

  return <Actions entity={project} actions={actions} />;
}
