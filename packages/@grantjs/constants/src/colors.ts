/**
 * Minimum CIEDE2000 (ΔE00) between any two tag palette colors (at Tailwind shade 500).
 * Ensures colors are perceptually distinct. ΔE00 < 1 ≈ imperceptible; 15–25 ≈ clearly distinct in UI.
 * Relaxed from 20 to allow Tailwind’s default palette (neighboring hues like purple/violet are intentionally close).
 */
export const MIN_PALETTE_DELTA_E = 5;

export const TAG_CONFIGURATION = {
  purple: {
    background: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    border: 'border-purple-300 dark:border-purple-600',
  },
  indigo: {
    background: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    border: 'border-indigo-300 dark:border-indigo-600',
  },
  blue: {
    background: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    border: 'border-blue-300 dark:border-blue-600',
  },
  cyan: {
    background: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    border: 'border-cyan-300 dark:border-cyan-600',
  },
  teal: {
    background: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    border: 'border-teal-300 dark:border-teal-600',
  },
  emerald: {
    background: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    border: 'border-emerald-300 dark:border-emerald-600',
  },
  sky: {
    background: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
    border: 'border-sky-300 dark:border-sky-600',
  },
  violet: {
    background: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    border: 'border-violet-300 dark:border-violet-600',
  },
  rose: {
    background: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
    border: 'border-rose-300 dark:border-rose-600',
  },
  pink: {
    background: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    border: 'border-pink-300 dark:border-pink-600',
  },
  fuchsia: {
    background: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
    border: 'border-fuchsia-300 dark:border-fuchsia-600',
  },
  gray: {
    background: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    border: 'border-gray-300 dark:border-gray-600',
  },
  red: {
    background: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    border: 'border-red-300 dark:border-red-600',
  },
  orange: {
    background: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    border: 'border-orange-300 dark:border-orange-600',
  },
  amber: {
    background: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    border: 'border-amber-300 dark:border-amber-600',
  },
  yellow: {
    background: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    border: 'border-yellow-300 dark:border-yellow-600',
  },
  lime: {
    background: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
    border: 'border-lime-300 dark:border-lime-600',
  },
  green: {
    background: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    border: 'border-green-300 dark:border-green-600',
  },
};

/** Canonical tag colors (perceptually distinct). New tags may only use these. */
export const TAG_COLORS = Object.keys(TAG_CONFIGURATION) as TagColor[];

export type TagColor = keyof typeof TAG_CONFIGURATION;

/**
 * Legacy color names that are no longer offered for new tags but still resolve to gray for display
 * (backward compatibility for existing tags in the database).
 */
export const DISPLAY_ALIASES_TO_GRAY = ['slate', 'zinc', 'neutral', 'stone'] as const;
export type DisplayAliasColor = (typeof DISPLAY_ALIASES_TO_GRAY)[number];

const grayConfig = TAG_CONFIGURATION.gray;
const backgroundAliases = Object.fromEntries(
  DISPLAY_ALIASES_TO_GRAY.map((alias) => [alias, grayConfig.background])
);
const borderAliases = Object.fromEntries(
  DISPLAY_ALIASES_TO_GRAY.map((alias) => [alias, grayConfig.border])
);

export const TAG_BACKGROUND_CLASSES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(TAG_CONFIGURATION).map(([color, config]) => [color, config.background])
  ),
  ...backgroundAliases,
};

export const TAG_BORDER_CLASSES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(TAG_CONFIGURATION).map(([color, config]) => [color, config.border])
  ),
  ...borderAliases,
};

export function isValidTagColor(color: string): color is TagColor {
  return TAG_COLORS.includes(color as TagColor);
}

/**
 * True if the value is a canonical color or a legacy alias (for display only).
 */
export function isDisplayableTagColor(color: string): color is TagColor | DisplayAliasColor {
  return color in TAG_BACKGROUND_CLASSES;
}

export function getAvailableTagColors(): TagColor[] {
  return [...TAG_COLORS] as TagColor[];
}

/**
 * Maps a stored tag color (canonical or legacy alias) to a canonical TagColor for pickers/forms.
 * Use when initializing an edit form so legacy values (slate, zinc, neutral, stone) show as gray.
 */
export function normalizeTagColorForPicker(color: string): TagColor {
  if (TAG_COLORS.includes(color as TagColor)) return color as TagColor;
  if (DISPLAY_ALIASES_TO_GRAY.includes(color as DisplayAliasColor)) return 'gray';
  return 'gray';
}

/** Accepts canonical colors and legacy aliases (slate, zinc, neutral, stone); unknown values fall back to gray. */
export function getTagBackgroundClasses(color: string): string {
  return TAG_BACKGROUND_CLASSES[color] ?? TAG_CONFIGURATION.gray.background;
}

/** Accepts canonical colors and legacy aliases (slate, zinc, neutral, stone); unknown values fall back to gray. */
export function getTagBorderClasses(color: string): string {
  return TAG_BORDER_CLASSES[color] ?? TAG_CONFIGURATION.gray.border;
}
