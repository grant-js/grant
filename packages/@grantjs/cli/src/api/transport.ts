import { CliError, EXIT_AUTH, EXIT_ERROR, isAuthFailure } from './errors.js';

export interface TransportRequest {
  apiUrl: string;
  method: string;
  path: string;
  token?: string;
  originVerifySecret?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  extraHeaders?: Record<string, string>;
}

export interface TransportResponse<T = unknown> {
  status: number;
  data: T;
}

interface ApiErrorBody {
  success?: false;
  error?: { code?: string; message?: string };
  reason?: string;
  code?: string;
  message?: string;
}

const DEBUG = process.env.GRANT_CLI_DEBUG === '1' || process.env.GRANT_CLI_DEBUG === 'true';

function joinUrl(apiUrl: string, path: string): URL {
  const base = apiUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return new URL(base + suffix);
}

function parseErrorMessage(status: number, text: string): string {
  let message = `Request failed (${status})`;
  try {
    const data = JSON.parse(text) as ApiErrorBody;
    if (data?.error?.message) message = data.error.message;
    else if (data?.message) message = data.message;
    if (data?.reason) message += ` — ${data.reason}`;
  } catch {
    if (text) message = text.slice(0, 200);
  }
  return message;
}

export async function apiRequest<T = unknown>(req: TransportRequest): Promise<TransportResponse<T>> {
  const url = joinUrl(req.apiUrl, req.path);
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (value === undefined || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...req.extraHeaders,
  };
  if (req.token) {
    headers.Authorization = `Bearer ${req.token}`;
  }
  if (req.originVerifySecret) {
    headers['x-origin-verify'] = req.originVerifySecret;
  }

  const init: RequestInit = { method: req.method.toUpperCase(), headers };
  if (req.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(req.body);
  }

  if (DEBUG) {
    console.error(`[Grant CLI] ${init.method} ${url.href}`);
  }

  let res: Response;
  try {
    res = await fetch(url.href, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new CliError(`Request failed: ${msg}. URL: ${url.href}`, EXIT_ERROR);
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message = parseErrorMessage(res.status, text);
    throw new CliError(message, isAuthFailure(res.status, message) ? EXIT_AUTH : EXIT_ERROR);
  }

  const envelope = parsed as { data?: T } | T;
  const data =
    envelope && typeof envelope === 'object' && envelope !== null && 'data' in envelope
      ? ((envelope as { data: T }).data ?? (envelope as T))
      : (envelope as T);

  return { status: res.status, data };
}
