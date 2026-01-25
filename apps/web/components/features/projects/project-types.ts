import { Project } from '@grantjs/schema';
import { z } from 'zod';

export interface ProjectsQueryResult {
  projects: {
    projects: Project[];
    totalCount: number;
    hasNextPage: boolean;
  };
}

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export const editProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  primaryTagId: z.string().optional(),
});

export type ProjectCreateFormValues = z.infer<typeof createProjectSchema>;
export type ProjectEditFormValues = z.infer<typeof editProjectSchema>;

export enum ProjectView {
  CARD = 'card',
  TABLE = 'table',
}
