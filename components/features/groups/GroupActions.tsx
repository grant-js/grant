'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';
import { Group } from '@/graphql/generated/types';

interface GroupActionsProps {
  group: Group;
  onEditClick: (group: Group) => void;
  onDeleteClick: (group: Group) => void;
}

export function GroupActions({ group, onEditClick, onDeleteClick }: GroupActionsProps) {
  const t = useTranslations('groups.actions');

  const actions: ActionItem<Group>[] = [
    {
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: onEditClick,
    },
    {
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: onDeleteClick,
      variant: 'destructive',
    },
  ];

  return <Actions entity={group} actions={actions} />;
}
