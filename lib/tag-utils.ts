import { Tag } from '@/graphql/generated/types';

import { getTagBorderClasses, TagColor } from './constants/colors';

export function transformTagsToBadges(tags: Tag[] | null | undefined) {
  return (tags || []).map((tag) => ({
    id: tag.id,
    label: tag.name,
    className: getTagBorderClasses(tag.color as TagColor),
  }));
}
