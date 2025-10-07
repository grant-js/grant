import { getTagBorderClasses, TagColor } from '@logusgraphics/grant-constants';
import { Tag } from '@logusgraphics/grant-schema';

export function transformTagsToBadges(tags: Tag[] | null | undefined) {
  return (tags || []).map((tag) => ({
    id: tag.id,
    label: tag.name,
    className: getTagBorderClasses(tag.color as TagColor),
  }));
}
