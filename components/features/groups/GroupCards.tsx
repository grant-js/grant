'use client';

import { Group } from '@/graphql/generated/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ColoredList } from '@/components/ui/colored-list';
import { GroupActions } from './GroupActions';
import { GroupCardSkeleton } from './GroupCardSkeleton';
import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateGroupDialog } from './CreateGroupDialog';

interface GroupCardsProps {
  groups: Group[];
  loading: boolean;
  search: string;
  onEditClick: (group: Group) => void;
  onDeleteClick: (group: Group) => void;
}

export function GroupCards({
  groups,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: GroupCardsProps) {
  const t = useTranslations('groups');

  return (
    <>
      <div className="w-full p-4">
        <div className="space-y-4">
          {groups.length === 0 && !loading ? (
            <EmptyState
              icon={<Shield className="h-12 w-12" />}
              title={search ? t('noSearchResults.title') : t('noGroups.title')}
              description={search ? t('noSearchResults.description') : t('noGroups.description')}
              action={search ? undefined : <CreateGroupDialog />}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {loading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <GroupCardSkeleton key={i} />
                  ))}
                </>
              ) : (
                groups.map((group) => (
                  <Card key={group.id} className="group relative h-full">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 space-y-2">
                          <CardTitle className="text-base leading-none truncate">
                            {group.name}
                          </CardTitle>
                          {group.description && (
                            <CardDescription className="text-sm leading-none truncate">
                              {group.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <GroupActions
                        group={group}
                        onEditClick={onEditClick}
                        onDeleteClick={onDeleteClick}
                      />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ColoredList
                        items={group.permissions || []}
                        labelField="name"
                        title={t('permissions')}
                        icon={<Shield className="h-3 w-3" />}
                        height={80}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
