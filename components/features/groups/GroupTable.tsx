'use client';

import { Group } from '@/graphql/generated/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GroupActions } from './GroupActions';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateGroupDialog } from './CreateGroupDialog';
import { ColoredList } from '@/components/ui/colored-list';
import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface GroupTableProps {
  groups: Group[];
  loading: boolean;
  search: string;
  onEditClick: (group: Group) => void;
  onDeleteClick: (group: Group) => void;
}

export function GroupTable({
  groups,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: GroupTableProps) {
  const t = useTranslations('groups');

  return (
    <>
      <div className="w-full px-4">
        <div className="space-y-4">
          {groups.length === 0 && !loading ? (
            <EmptyState
              icon={<Shield className="h-12 w-12" />}
              title={search ? t('noSearchResults.title') : t('noGroups.title')}
              description={search ? t('noSearchResults.description') : t('noGroups.description')}
              action={search ? undefined : <CreateGroupDialog />}
            />
          ) : (
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.name')}</TableHead>
                    <TableHead>{t('table.description')}</TableHead>
                    <TableHead>{t('permissions')}</TableHead>
                    <TableHead className="w-[100px]">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        {t('table.loading')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.description || t('noDescription')}</TableCell>
                        <TableCell>
                          <ColoredList
                            items={group.permissions || []}
                            labelField="name"
                            title=""
                            icon={<Shield className="h-3 w-3" />}
                            height={60}
                          />
                        </TableCell>
                        <TableCell>
                          <GroupActions
                            group={group}
                            onEditClick={onEditClick}
                            onDeleteClick={onDeleteClick}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
