/**
 * Routes that exist in one implementation and not the canonical table, on purpose.
 *
 * The point of an explicit list is that drift becomes *an unlisted difference*
 * rather than *any difference*. A parity check that fires on every difference is
 * noise, and a noisy check gets deleted — so each entry below carries the reason it
 * is allowed, and the test fails if an entry stops being divergent. A list that
 * accumulates dead entries stops meaning anything.
 */

/** Which implementation a divergence belongs to. */
export type ParitySource = 'gateway' | 'next-rewrites';

export interface IntentionalDivergence {
  readonly source: ParitySource;
  /** Normalized path, matched exactly against the parsed route. */
  readonly path: string;
  readonly reason: string;
}

export const INTENTIONAL_DIVERGENCES: readonly IntentionalDivergence[] = [
  // swagger-ui-express serves its assets relative to the page in development, so the
  // dashboard has to rewrite them from the root. Behind the gateway the browser
  // requests them under /api-docs/, which the /api-docs route already covers, so
  // these four have no production counterpart to diverge from.
  {
    source: 'next-rewrites',
    path: '/swagger-ui.css',
    reason: 'Swagger UI asset requested at root in dev; covered by /api-docs in production.',
  },
  {
    source: 'next-rewrites',
    path: '/swagger-ui-bundle.js',
    reason: 'Swagger UI asset requested at root in dev; covered by /api-docs in production.',
  },
  {
    source: 'next-rewrites',
    path: '/swagger-ui-standalone-preset.js',
    reason: 'Swagger UI asset requested at root in dev; covered by /api-docs in production.',
  },
  {
    source: 'next-rewrites',
    path: '/swagger-ui-init.js',
    reason: 'Swagger UI asset requested at root in dev; covered by /api-docs in production.',
  },
];

export function isIntentionalDivergence(source: ParitySource, path: string): boolean {
  return INTENTIONAL_DIVERGENCES.some(
    (divergence) => divergence.source === source && divergence.path === path
  );
}
