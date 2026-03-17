/**
 * Tailwind v4 scanner-only safelist.
 *
 * Tailwind v4's typed config no longer exposes `safelist`, and scanning can miss
 * class strings defined in linked workspace packages. Keeping these class names
 * as literals inside `apps/web` ensures the tag palette utilities are always
 * generated in production builds.
 *
 * Keep in sync with `packages/@grantjs/constants/src/colors.ts` TAG_CONFIGURATION.
 */
export const TAILWIND_TAG_PALETTE_SAFE_CLASSES = [
  // purple
  'bg-purple-100',
  'text-purple-800',
  'border-purple-300',
  'dark:bg-purple-900',
  'dark:text-purple-200',
  'dark:border-purple-600',
  // indigo
  'bg-indigo-100',
  'text-indigo-800',
  'border-indigo-300',
  'dark:bg-indigo-900',
  'dark:text-indigo-200',
  'dark:border-indigo-600',
  // blue
  'bg-blue-100',
  'text-blue-800',
  'border-blue-300',
  'dark:bg-blue-900',
  'dark:text-blue-200',
  'dark:border-blue-600',
  // cyan
  'bg-cyan-100',
  'text-cyan-800',
  'border-cyan-300',
  'dark:bg-cyan-900',
  'dark:text-cyan-200',
  'dark:border-cyan-600',
  // teal
  'bg-teal-100',
  'text-teal-800',
  'border-teal-300',
  'dark:bg-teal-900',
  'dark:text-teal-200',
  'dark:border-teal-600',
  // emerald
  'bg-emerald-100',
  'text-emerald-800',
  'border-emerald-300',
  'dark:bg-emerald-900',
  'dark:text-emerald-200',
  'dark:border-emerald-600',
  // sky
  'bg-sky-100',
  'text-sky-800',
  'border-sky-300',
  'dark:bg-sky-900',
  'dark:text-sky-200',
  'dark:border-sky-600',
  // violet
  'bg-violet-100',
  'text-violet-800',
  'border-violet-300',
  'dark:bg-violet-900',
  'dark:text-violet-200',
  'dark:border-violet-600',
  // rose
  'bg-rose-100',
  'text-rose-800',
  'border-rose-300',
  'dark:bg-rose-900',
  'dark:text-rose-200',
  'dark:border-rose-600',
  // pink
  'bg-pink-100',
  'text-pink-800',
  'border-pink-300',
  'dark:bg-pink-900',
  'dark:text-pink-200',
  'dark:border-pink-600',
  // fuchsia
  'bg-fuchsia-100',
  'text-fuchsia-800',
  'border-fuchsia-300',
  'dark:bg-fuchsia-900',
  'dark:text-fuchsia-200',
  'dark:border-fuchsia-600',
  // gray
  'bg-gray-100',
  'text-gray-800',
  'border-gray-300',
  'dark:bg-gray-900',
  'dark:text-gray-200',
  'dark:border-gray-600',
  // red
  'bg-red-100',
  'text-red-800',
  'border-red-300',
  'dark:bg-red-900',
  'dark:text-red-200',
  'dark:border-red-600',
  // orange
  'bg-orange-100',
  'text-orange-800',
  'border-orange-300',
  'dark:bg-orange-900',
  'dark:text-orange-200',
  'dark:border-orange-600',
  // amber
  'bg-amber-100',
  'text-amber-800',
  'border-amber-300',
  'dark:bg-amber-900',
  'dark:text-amber-200',
  'dark:border-amber-600',
  // yellow
  'bg-yellow-100',
  'text-yellow-800',
  'border-yellow-300',
  'dark:bg-yellow-900',
  'dark:text-yellow-200',
  'dark:border-yellow-600',
  // lime
  'bg-lime-100',
  'text-lime-800',
  'border-lime-300',
  'dark:bg-lime-900',
  'dark:text-lime-200',
  'dark:border-lime-600',
  // green
  'bg-green-100',
  'text-green-800',
  'border-green-300',
  'dark:bg-green-900',
  'dark:text-green-200',
  'dark:border-green-600',
] as const;

