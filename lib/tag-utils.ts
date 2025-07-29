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

/**
 * Transform tags to round badge items for ScrollBadges component
 * @param tags - Array of tags to transform
 * @returns Array of badge items configured for round display with border colors
 */
export function transformTagsToRoundBadges(tags: Tag[] | null | undefined) {
  return (tags || []).map((tag) => ({
    id: tag.id,
    label: '', // Empty label for round badges
    className: getTagBorderColorClasses(tag.color), // Use border colors instead of background colors
  }));
}
