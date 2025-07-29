'use client';

import { useState, useCallback, useEffect } from 'react';

import { Group, GroupSortableField, GroupSortOrder } from '@/graphql/generated/types';
import { useGroups } from '@/hooks/groups';

import { DeleteGroupDialog } from './DeleteGroupDialog';
import { EditGroupDialog } from './EditGroupDialog';
import { GroupViewer } from './GroupViewer';
import { GroupView } from './GroupViewSwitcher';

interface GroupsContainerProps {
  page: number;
  limit: number;
  search: string;
  sort?: {
    field: GroupSortableField;
    order: GroupSortOrder;
  };
  view: GroupView;
  onTotalCountChange?: (totalCount: number) => void;
}

export function GroupsContainer({
  page,
  limit,
  search,
  sort,
  view,
  onTotalCountChange,
}: GroupsContainerProps) {
  const { groups, loading, error, totalCount } = useGroups({
    page,
    limit,
    search,
    sort,
  });

  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);

  // Update parent with total count when data changes
  useEffect(() => {
    if (totalCount) {
      onTotalCountChange?.(totalCount);
    }
  }, [totalCount, onTotalCountChange]);

  const handleEditClick = useCallback((group: Group) => {
    setGroupToEdit(group);
  }, []);

  const handleDeleteClick = useCallback((group: Group) => {
    setGroupToDelete({ id: group.id, name: group.name });
  }, []);

  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      <GroupViewer
        limit={limit}
        groups={groups}
        loading={loading}
        search={search}
        view={view}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

      <DeleteGroupDialog
        groupToDelete={groupToDelete}
        onOpenChange={() => setGroupToDelete(null)}
      />

      <EditGroupDialog
        group={groupToEdit}
        open={!!groupToEdit}
        onOpenChange={(open: boolean) => !open && setGroupToEdit(null)}
        currentPage={page}
      />
    </>
  );
}
