/**
 * Whether this deployment has an API that serves `/storage`.
 *
 * The API mounts `/storage` only for the local storage provider
 * (`apps/api/src/create-app.ts`). On any other provider the path is not a route anywhere,
 * and the `/storage/:path*` rewrite in `next.config.ts` would send it to an API that either
 * answers 404 or, on a target where the web app runs apart from the API (the AWS target's
 * web Lambda), is not there at all and turns into a 500 (`ECONNREFUSED`).
 *
 * Read from the same `STORAGE_PROVIDER` the API reads. Unset means the web app is run the
 * way `pnpm dev` and the local Docker setup run it, with a local-provider API beside it, so
 * the rewrite stays on exactly as before.
 */
export function proxiesStorageToApi(
  env: Record<string, string | undefined> = process.env
): boolean {
  const provider = env.STORAGE_PROVIDER?.trim().toLowerCase();
  return !provider || provider === 'local';
}

export function isStoragePath(pathname: string): boolean {
  return pathname === '/storage' || pathname.startsWith('/storage/');
}
