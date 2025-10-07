'use client';

import { Tag } from '@logusgraphics/grant-schema';
import { MoreVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTagsStore } from '@/stores/tags.store';

interface TagActionsProps {
  tag: Tag;
}

export function TagActions({ tag }: TagActionsProps) {
  const t = useTranslations('tags');
  const setTagToEdit = useTagsStore((state) => state.setTagToEdit);
  const setTagToDelete = useTagsStore((state) => state.setTagToDelete);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTagToEdit(tag)}>{t('actions.edit')}</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTagToDelete(tag)}
          className="text-destructive focus:text-destructive"
        >
          {t('actions.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
