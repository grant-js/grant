'use client';

import { ReactNode } from 'react';

import { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Auditable } from '@/graphql/generated/types';
import { cn } from '@/lib/utils';

// Generic entity interface
export interface BaseEntity extends Auditable {
  name: string;
  description?: string | null;
  [key: string]: any;
}

export interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export interface SkeletonConfig {
  component: ReactNode;
  count: number;
}

export interface CardGridProps<TEntity extends BaseEntity> {
  // Data
  entities: TEntity[];
  loading: boolean;

  // Configuration
  emptyState: EmptyStateConfig;
  skeleton: SkeletonConfig;

  // Render functions
  renderHeader: (entity: TEntity) => ReactNode;
  renderBody: (entity: TEntity) => ReactNode;
  renderFooter?: (entity: TEntity) => ReactNode;

  // Optional customizations
  gridClassName?: string;
  cardClassName?: string;
}

export function CardGrid<TEntity extends BaseEntity>({
  entities,
  loading,
  emptyState,
  skeleton,
  renderHeader,
  renderBody,
  renderFooter,
  gridClassName,
  cardClassName,
}: CardGridProps<TEntity>) {
  return (
    <>
      <div className="w-full p-4">
        <div className="space-y-4">
          {entities.length === 0 && !loading ? (
            <EmptyState
              icon={<emptyState.icon className="h-12 w-12" />}
              title={emptyState.title}
              description={emptyState.description}
              action={emptyState.action}
            />
          ) : (
            <div
              className={cn(
                'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4',
                gridClassName
              )}
            >
              {loading ? (
                <>
                  {Array.from({ length: skeleton.count }).map((_, i) => (
                    <div key={i}>{skeleton.component}</div>
                  ))}
                </>
              ) : (
                entities.map((entity) => (
                  <Card key={entity.id} className={cn('group relative h-full', cardClassName)}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
                      {renderHeader(entity)}
                    </CardHeader>

                    <CardContent className="pt-0">{renderBody(entity)}</CardContent>

                    {renderFooter && (
                      <CardFooter className="px-6">{renderFooter(entity)}</CardFooter>
                    )}
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
