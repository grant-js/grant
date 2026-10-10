/** Process exit codes. 0 is success (Commander default). */
export const EXIT_ERROR = 1;
export const EXIT_AUTH = 2;

export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = EXIT_ERROR) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

export function isAuthFailure(status: number, message: string): boolean {
  if (status === 401 || status === 403) return true;
  return /unauthorized|forbidden|invalid or expired|no credentials/i.test(message);
}

export function handleCliError(err: unknown): never {
  if (err instanceof CliError) {
    console.error(err.message);
    process.exit(err.exitCode);
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(isAuthFailure(0, message) ? EXIT_AUTH : EXIT_ERROR);
}
