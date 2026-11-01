'use client';

import { useMemo } from 'react';

import { partitionApiKeyScopeRows } from '@/lib/api-key-scope-kind';

import { ApiKeyScopesTable, type ApiKeyScopesTableProps } from './api-key-scopes-table';

type SharedScopesTableProps = Omit<ApiKeyScopesTableProps, 'title' | 'description' | 'rows'>;

export interface ApiKeyScopeCardsProps extends SharedScopesTableProps {
  grantTitle: string;
  grantDescription?: string;
  projectTitle: string;
  projectDescription?: string;
  rows: ApiKeyScopesTableProps['rows'];
  grantPage?: number;
  projectPage?: number;
  onGrantPageChange?: (page: number) => void;
  onProjectPageChange?: (page: number) => void;
}

export function ApiKeyScopeCards({
  grantTitle,
  grantDescription,
  projectTitle,
  projectDescription,
  rows,
  grantPage,
  projectPage,
  onGrantPageChange,
  onProjectPageChange,
  notice,
  footerActions,
  ...shared
}: ApiKeyScopeCardsProps) {
  const { grant, project } = useMemo(() => partitionApiKeyScopeRows(rows), [rows]);

  return (
    <>
      <ApiKeyScopesTable
        {...shared}
        title={grantTitle}
        description={grantDescription}
        rows={grant}
        page={grantPage}
        onPageChange={onGrantPageChange}
        notice={notice}
        footerActions={footerActions}
      />
      {project.length > 0 ? (
        <ApiKeyScopesTable
          {...shared}
          title={projectTitle}
          description={projectDescription}
          rows={project}
          page={projectPage}
          onPageChange={onProjectPageChange}
        />
      ) : null}
    </>
  );
}
