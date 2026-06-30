import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export interface SsrfGuardOptions {
  /** Allowed URL protocols (default: https only). */
  allowedProtocols?: string[];
  /** When true, skip private/loopback checks (dev/test only). */
  allowPrivateTargets?: boolean;
  /** Hostnames that bypass all checks. */
  allowlist?: string[];
  /** Hostnames that are always rejected. */
  denylist?: string[];
}

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (cidrBase: string, bits: number) => {
    const base = ipv4ToInt(cidrBase);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (base & mask);
  };
  return (
    inRange('10.0.0.0', 8) ||
    inRange('172.16.0.0', 12) ||
    inRange('192.168.0.0', 16) ||
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) || // link-local
    inRange('0.0.0.0', 8) ||
    inRange('100.64.0.0', 10) // carrier-grade NAT
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fe80') || // link-local
    lower.startsWith('fc') || // unique local
    lower.startsWith('fd') ||
    lower.startsWith('::ffff:') // IPv4-mapped — check embedded v4 separately below
  );
}

function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.slice('::ffff:'.length);
      if (isIP(v4) === 4) return isPrivateIPv4(v4);
    }
    return isPrivateIPv6(ip);
  }
  return false;
}

/**
 * Validate that a URL is a safe external delivery target. Rejects disallowed
 * protocols, denylisted hosts, and (unless allowed) hosts that resolve to
 * private/loopback/link-local addresses. Throws {@link SsrfBlockedError}.
 */
export async function assertUrlAllowed(
  rawUrl: string,
  options: SsrfGuardOptions = {}
): Promise<void> {
  const allowedProtocols = options.allowedProtocols ?? ['https:'];

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError('Invalid webhook URL');
  }

  if (!allowedProtocols.includes(url.protocol)) {
    throw new SsrfBlockedError(`Webhook URL protocol not allowed: ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase();

  if (options.denylist?.some((h) => h.toLowerCase() === host)) {
    throw new SsrfBlockedError(`Webhook host is denylisted: ${host}`);
  }

  if (options.allowlist?.some((h) => h.toLowerCase() === host)) {
    return;
  }

  if (options.allowPrivateTargets) {
    return;
  }

  // Literal IP host
  const literalFamily = isIP(host);
  if (literalFamily !== 0) {
    if (isPrivateAddress(host)) {
      throw new SsrfBlockedError(`Webhook URL targets a private address: ${host}`);
    }
    return;
  }

  // Resolve DNS and ensure no resolved address is private.
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new SsrfBlockedError(`Webhook host could not be resolved: ${host}`);
  }

  if (addresses.length === 0) {
    throw new SsrfBlockedError(`Webhook host did not resolve: ${host}`);
  }

  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new SsrfBlockedError(`Webhook host resolves to a private address: ${host}`);
    }
  }
}
