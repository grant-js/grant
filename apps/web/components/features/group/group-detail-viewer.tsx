'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeatureDetailLayout } from '@/components/layout';
import { useScopeFromParams } from '@/hooks/common';
import { useGroups } from '@/hooks/groups';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupGeneralCard } from './group-general-card';
import { GroupMetadataCard } from './group-metadata-card';
import { GroupPermissions } from './group-permissions';
import { GroupTags } from './group-tags';

export function GroupDetailViewer() {
  const t = useTranslations('group');
  const params = useParams();
  const groupId = params.groupId as string;
  const scope = useScopeFromParams();
  const setCurrentGroup = useGroupsStore((state) => state.setCurrentGroup);

  const { groups, loading, error, refetch } = useGroups({
    scope: scope!,
    ids: [groupId],
    limit: 1,
  });

  const group = useMemo(() => groups[0], [groups]);

  useEffect(() => {
    setCurrentGroup(group || null);
    return () => {
      setCurrentGroup(null);
    };
  }, [group, setCurrentGroup]);

  if (loading && !group) {
    return <div>{t('loading.title')}</div>;
  }

  if (error || !group) {
    return <div>{t('loading.error')}</div>;
  }

  return (
    <FeatureDetailLayout>
      <GroupGeneralCard group={group} onAfterGroupMutation={refetch} />
      <GroupMetadataCard group={group} onAfterGroupMutation={refetch} />
      <GroupPermissions group={group} />
      <GroupTags group={group} />
    </FeatureDetailLayout>
  );
}
