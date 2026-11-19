'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tag } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';

import { ActionItem, Actions } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useTagsStore } from '@/stores/tags.store';

interface TagActionsProps {
  tag: Tag;
}

export function TagActions({ tag }: TagActionsProps) {
  const t = useTranslations('tags');
  const setTagToEdit = useTagsStore((state) => state.setTagToEdit);
  const setTagToDelete = useTagsStore((state) => state.setTagToDelete);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) setHasBeenOpened(true);
    },
    [hasBeenOpened]
  );

  const scope = useScopeFromParams();

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Tag,
    ResourceAction.Update,
    {
      scope: scope!,
      context: { resource: { id: tag.id, scope: { tags: [tag.id] } } },
      enabled: hasBeenOpened,
      returnLoading: true,
    }
  ) as UseGrantResult;

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.Tag,
    ResourceAction.Delete,
    {
      scope: scope!,
      context: { resource: { id: tag.id, scope: { tags: [tag.id] } } },
      enabled: hasBeenOpened,
      returnLoading: true,
    }
  ) as UseGrantResult;

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) return null;

  const permissionsResolved = hasBeenOpened && !isUpdateLoading && !isDeleteLoading;

  // Build actions array based on permissions
  const actions: ActionItem<Tag>[] = [];

  if (canUpdate) {
    actions.push({
      key: 'edit',
      label: t('actions.edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: () => setTagToEdit(tag),
    });
  }

  if (canDelete) {
    actions.push({
      key: 'delete',
      label: t('actions.delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: () => setTagToDelete(tag),
      variant: 'destructive',
    });
  }

  const isLoading = !permissionsResolved;

  return (
    <Actions entity={tag} actions={actions} onOpenChange={handleOpenChange} isLoading={isLoading} />
  );
}
