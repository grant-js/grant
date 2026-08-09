/**
 * Project-app (OAuth app per project) service port.
 * Covers: ProjectApp, ProjectAppTag.
 */
import type {
  AddProjectAppTagInput,
  CreateProjectAppInput,
  CreateProjectAppResult,
  MutationDeleteProjectAppArgs,
  ProjectApp,
  ProjectAppPage,
  ProjectAppTag,
  QueryProjectAppsArgs,
  RemoveProjectAppTagInput,
  UpdateProjectAppInput,
  UpdateProjectAppTagInput,
} from '@grantjs/schema';

import type { SelectedFields } from '../repositories/common';
import type { DeleteParams } from '../repositories/common';

export interface IProjectAppService {
  getProjectApps(
    params: Omit<QueryProjectAppsArgs, 'scope'> & {
      projectId: string;
    } & SelectedFields<ProjectApp>,
    transaction?: unknown
  ): Promise<ProjectAppPage>;

  createProjectApp(
    params: { projectId: string } & Omit<CreateProjectAppInput, 'scope'>,
    transaction?: unknown
  ): Promise<CreateProjectAppResult>;

  getProjectAppById(id: string, transaction?: unknown): Promise<ProjectApp | null>;

  getProjectAppByClientId(clientId: string, transaction?: unknown): Promise<ProjectApp | null>;

  updateProjectApp(
    params: { id: string; projectId: string } & Omit<UpdateProjectAppInput, 'scope'>,
    transaction?: unknown
  ): Promise<ProjectApp>;

  deleteProjectApp(
    params: Omit<MutationDeleteProjectAppArgs, 'scope'> & { projectId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectApp>;
}

export interface IProjectAppTagService {
  getProjectAppTags(
    params: { projectAppId: string },
    transaction?: unknown
  ): Promise<ProjectAppTag[]>;

  getProjectAppTagsByProjectAppIds(
    projectAppIds: string[],
    transaction?: unknown
  ): Promise<ProjectAppTag[]>;

  getProjectAppTagIntersection(
    params: { projectAppIds: string[]; tagIds: string[] },
    transaction?: unknown
  ): Promise<ProjectAppTag[]>;

  addProjectAppTag(params: AddProjectAppTagInput, transaction?: unknown): Promise<ProjectAppTag>;

  updateProjectAppTag(
    params: UpdateProjectAppTagInput,
    transaction?: unknown
  ): Promise<ProjectAppTag>;

  removeProjectAppTag(
    params: RemoveProjectAppTagInput & DeleteParams,
    transaction?: unknown
  ): Promise<ProjectAppTag>;
}
