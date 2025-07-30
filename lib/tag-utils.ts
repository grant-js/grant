import { Tag } from '@/graphql/generated/types';

import { getTagBorderColorClasses } from './tag-colors';

/**
 * Transform tags to badge items for ScrollBadges component
 * @param tags - Array of tags to transform
 * @returns Array of badge items with border colors
 */
export function transformTagsToBadges(tags: Tag[] | null | undefined) {
  return (tags || []).map((tag) => ({
    id: tag.id,
    label: tag.name,
    className: getTagBorderColorClasses(tag.color), // Use border colors instead of background colors
  }));
}
