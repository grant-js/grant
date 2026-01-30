declare const __GRANT_CLI_VERSION__: string;

export function getPackageVersion(): string {
  return typeof __GRANT_CLI_VERSION__ === 'string' ? __GRANT_CLI_VERSION__ : '0.0.0';
}
