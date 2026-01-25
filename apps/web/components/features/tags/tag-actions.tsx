'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tag } from '@grantjs/schema';
import { MoreVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useScopeFromParams } from '@/hooks/common';
import { useTagsStore } from '@/stores/tags.store';

interface TagActionsProps {
  tag: Tag;
}

export function TagActions({ tag }: TagActionsProps) {
  const t = useTranslations('tags');
  const setTagToEdit = useTagsStore((state) => state.setTagToEdit);
  const setTagToDelete = useTagsStore((state) => state.setTagToDelete);

  // Get scope from URL params (can be Organization, AccountProject, or OrganizationProject)
  const scope = useScopeFromParams();

  // Check permissions using the Grant client (always call hooks, pass undefined scope if not available)
  const canUpdate = useGrant(ResourceSlug.Tag, ResourceAction.Update, {
    scope: scope!,
  });
  const canDelete = useGrant(ResourceSlug.Tag, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || (!canUpdate && !canDelete)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate && (
          <DropdownMenuItem onClick={() => setTagToEdit(tag)}>{t('actions.edit')}</DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem
            onClick={() => setTagToDelete(tag)}
            className="text-destructive focus:text-destructive"
          >
            {t('actions.delete')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
