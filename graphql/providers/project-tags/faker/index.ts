import { addProjectTag } from '@/graphql/providers/project-tags/faker/addProjectTag';
import { getProjectTags } from '@/graphql/providers/project-tags/faker/getProjectTags';
import { removeProjectTag } from '@/graphql/providers/project-tags/faker/removeProjectTag';
import { ProjectTagDataProvider } from '@/graphql/providers/project-tags/types';
export const projectTagFakerProvider: ProjectTagDataProvider = {
  getProjectTags,
  addProjectTag,
  removeProjectTag,
};
