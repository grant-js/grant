'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';
import { Group } from '@/graphql/generated/types';
import { useGroupsStore } from '@/stores/groups.store';

interface GroupActionsProps {
  group: Group;
}

export function GroupActions({ group }: GroupActionsProps) {
  const t = useTranslations('groups.actions');

  // Use selective subscriptions to prevent unnecessary re-renders
  const setGroupToEdit = useGroupsStore((state) => state.setGroupToEdit);
  const setGroupToDelete = useGroupsStore((state) => state.setGroupToDelete);

  const handleEditClick = () => {
    setGroupToEdit(group);
  };

  const handleDeleteClick = () => {
    setGroupToDelete({ id: group.id, name: group.name });
  };

  const actions: ActionItem<Group>[] = [
    {
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: handleEditClick,
    },
    {
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: handleDeleteClick,
      variant: 'destructive',
    },
  ];

  return <Actions entity={group} actions={actions} />;
}
