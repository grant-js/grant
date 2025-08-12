import { z } from 'zod';

import { Project } from '@/graphql/generated/types';

// GraphQL query result types
export interface ProjectsQueryResult {
  projects: {
    projects: Project[];
    totalCount: number;
    hasNextPage: boolean;
  };
}

// Form schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const editProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

// Form value types
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
export type EditProjectFormValues = z.infer<typeof editProjectSchema>;
