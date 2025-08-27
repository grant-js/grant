import {
  getAvailableTagColors as getSharedTagColors,
  isValidTagColor as isValidSharedTagColor,
  getTagBackgroundClasses as getSharedTagBackgroundClasses,
  getTagBorderClasses as getSharedTagBorderClasses,
} from '@/lib/constants/colors';

/**
 * Get the CSS classes for a tag background color
 * @param color - The color identifier (e.g., 'purple', 'indigo')
 * @returns The CSS classes for the tag background color
 * @deprecated Use getTagBackgroundClasses from @/lib/constants/colors instead
 */
export function getTagBackgroundColorClasses(color: string): string {
  if (isValidSharedTagColor(color)) {
    return getSharedTagBackgroundClasses(color);
  }
  // Fallback to purple if color is not valid
  return getSharedTagBackgroundClasses('purple');
}

/**
 * Get border color classes for badges and avatars based on tag color
 * @param color - The color identifier (e.g., 'purple', 'indigo')
 * @returns The CSS classes for the border color
 * @deprecated Use getTagBorderClasses from @/lib/constants/colors instead
 */
export function getTagBorderColorClasses(color: string): string {
  if (isValidSharedTagColor(color)) {
    return getSharedTagBorderClasses(color);
  }
  // Fallback to purple if color is not valid
  return getSharedTagBorderClasses('purple');
}

/**
 * Get all available tag colors
 * @returns Array of available color identifiers
 * @deprecated Use getAvailableTagColors from @/lib/constants/colors instead
 */
export function getAvailableTagColors(): string[] {
  return getSharedTagColors();
}

/**
 * Check if a color is a valid tag color
 * @param color - The color identifier to check
 * @returns True if the color is valid
 * @deprecated Use isValidTagColor from @/lib/constants/colors instead
 */
export function isValidTagColor(color: string): boolean {
  return isValidSharedTagColor(color);
}
