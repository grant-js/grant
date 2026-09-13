import { describe, expect, it, vi } from 'vitest';

import {
  DirectUploadError,
  type DirectUploadTicket,
  runDirectUpload,
  sendDirectUpload,
} from './direct-upload';

const ORIGIN = 'https://app.example';

function ticket(overrides: Partial<DirectUploadTicket> = {}): DirectUploadTicket {
  return {
    url: '/storage/users/u-1/picture.jpg?exp=1&len=3&ct=image%2Fjpeg&sig=s',
    method: 'PUT',
    expiresAt: new Date(Date.now() + 60_000),
    headers: [{ name: 'Content-Type', value: 'image/jpeg' }],
    ...overrides,
  };
}

function body(): Blob {
  return new Blob(['abc'], { type: 'image/jpeg' });
}

/**
 * A `fetch` stand-in that records the request it was given. Typed with the parameters
 * rather than ignoring them, so `mock.calls` carries what each assertion inspects.
 */
function respondWith(status: number) {
  return vi.fn(async (_url: string, _init: RequestInit) => new Response(null, { status }));
}

describe('an expired ticket', () => {
  it('fails without making a request, rather than sending bytes to be refused', async () => {
    const fetchImpl = respondWith(204);

    await expect(
      sendDirectUpload({
        ticket: ticket({ expiresAt: new Date(Date.now() - 1_000) }),
        body: body(),
        origin: ORIGIN,
        fetchImpl,
      })
    ).rejects.toMatchObject({ failure: 'expired' });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('treats an unreadable expiry as expired, not as permission to try', async () => {
    // Fails closed. A ticket whose expiry did not survive serialization tells us
    // nothing about the window, and "unknown window" must not read as "open".
    const fetchImpl = respondWith(204);

    await expect(
      sendDirectUpload({
        ticket: ticket({ expiresAt: 'not-a-date' }),
        body: body(),
        origin: ORIGIN,
        fetchImpl,
      })
    ).rejects.toMatchObject({ failure: 'expired' });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('accepts an expiry that arrived as an ISO string', async () => {
    // Apollo hands back a `Date` for the `Date` scalar; anything that has been through
    // JSON hands back the string. Both are the same instant and both must work.
    const fetchImpl = respondWith(204);

    await expect(
      sendDirectUpload({
        ticket: ticket({ expiresAt: new Date(Date.now() + 60_000).toISOString() }),
        body: body(),
        origin: ORIGIN,
        fetchImpl,
      })
    ).resolves.toBeUndefined();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('the request the ticket describes', () => {
  it('sends the method and headers the API named, and no others', async () => {
    const fetchImpl = respondWith(204);

    await sendDirectUpload({ ticket: ticket(), body: body(), origin: ORIGIN, fetchImpl });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.method).toBe('PUT');
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('image/jpeg');
    expect([...headers.keys()]).toEqual(['content-type']);
  });

  it('never sends credentials to the storage origin', async () => {
    // The URL is the authorization. A session cookie adds nothing the store can use
    // and everything an unrelated origin should not be given.
    const fetchImpl = respondWith(204);

    await sendDirectUpload({ ticket: ticket(), body: body(), origin: ORIGIN, fetchImpl });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.credentials).toBe('omit');
  });

  it('resolves an application-relative URL against the app origin', async () => {
    const fetchImpl = respondWith(204);

    await sendDirectUpload({ ticket: ticket(), body: body(), origin: ORIGIN, fetchImpl });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://app.example/storage/users/u-1/picture.jpg?exp=1&len=3&ct=image%2Fjpeg&sig=s'
    );
  });

  it('leaves an absolute URL alone, query signature included', async () => {
    // The S3 case. Re-encoding a SigV4 query string is how a valid signature becomes
    // an invalid one, so the ticket URL has to survive byte for byte.
    const s3Url =
      'https://bucket.s3.eu-central-1.amazonaws.com/users/u-1/picture.jpg' +
      '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&X-Amz-SignedHeaders=content-type%3Bhost';
    const fetchImpl = respondWith(200);

    await sendDirectUpload({
      ticket: ticket({ url: s3Url }),
      body: body(),
      origin: ORIGIN,
      fetchImpl,
    });

    expect(fetchImpl.mock.calls[0][0]).toBe(s3Url);
  });
});

describe('a store that refuses the upload', () => {
  it('reports the refusal with its status, so a 403 is not read as a network fault', async () => {
    const fetchImpl = respondWith(403);

    await expect(
      sendDirectUpload({ ticket: ticket(), body: body(), origin: ORIGIN, fetchImpl })
    ).rejects.toMatchObject({ failure: 'rejected', status: 403 });
  });

  it('treats a 413 as a refusal too, not as success', async () => {
    const fetchImpl = respondWith(413);

    await expect(
      sendDirectUpload({ ticket: ticket(), body: body(), origin: ORIGIN, fetchImpl })
    ).rejects.toMatchObject({ failure: 'rejected', status: 413 });
  });
});

describe('a transfer that never gets an answer', () => {
  it('is a network failure when nothing was cancelled', async () => {
    // Includes the case that matters on the deployed target: a cross-origin PUT whose
    // preflight the bucket does not answer surfaces in the browser as exactly this.
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => {
      throw new TypeError('Failed to fetch');
    });

    const error = await sendDirectUpload({
      ticket: ticket(),
      body: body(),
      origin: ORIGIN,
      fetchImpl,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DirectUploadError);
    expect(error).toMatchObject({ failure: 'network' });
    expect((error as DirectUploadError).cause).toBeInstanceOf(TypeError);
  });

  it('is an abort when the caller cancelled, so navigating away is not reported as a fault', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      init.signal?.throwIfAborted();
      throw new Error('unreachable');
    });
    controller.abort();

    await expect(
      sendDirectUpload({
        ticket: ticket(),
        body: body(),
        origin: ORIGIN,
        signal: controller.signal,
        fetchImpl,
      })
    ).rejects.toMatchObject({ failure: 'aborted' });
  });

  it('hands the signal to the request, so an in-flight transfer can actually be stopped', async () => {
    // Without this the abort would only stop the caller waiting — the bytes would keep
    // going, and a user who closed the dialog would still overwrite their picture.
    const controller = new AbortController();
    const fetchImpl = respondWith(204);

    await sendDirectUpload({
      ticket: ticket(),
      body: body(),
      origin: ORIGIN,
      signal: controller.signal,
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });
});

describe('the window between storing the bytes and claiming them', () => {
  function steps(overrides: Partial<Parameters<typeof runDirectUpload>[0]> = {}) {
    return {
      mint: vi.fn(async () => ticket()),
      confirm: vi.fn(async () => ({ url: '/storage/users/u-1/picture.jpg', path: 'p' })),
      ...overrides,
    } as Parameters<typeof runDirectUpload>[0];
  }

  const file = () => ({ body: body(), filename: 'profile.jpg', contentType: 'image/jpeg' });

  it('mints against the byte length it is about to send, not the one the caller guessed', async () => {
    // The URL commits to an exact length. If the mint is told anything but the blob's
    // own size, every upload is refused by the store for the right reason.
    const plan = steps();

    await runDirectUpload(plan, file(), { origin: ORIGIN, fetchImpl: respondWith(204) });

    expect(plan.mint).toHaveBeenCalledWith({
      filename: 'profile.jpg',
      contentType: 'image/jpeg',
      contentLength: 3,
    });
  });

  it('does not send bytes when minting produced no ticket', async () => {
    const fetchImpl = respondWith(204);
    const plan = steps({ mint: vi.fn(async () => null) });

    await expect(
      runDirectUpload(plan, file(), { origin: ORIGIN, fetchImpl })
    ).rejects.toMatchObject({ failure: 'rejected' });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(plan.confirm).not.toHaveBeenCalled();
  });

  it('claims nothing when the store refused the bytes', async () => {
    const plan = steps();

    await expect(
      runDirectUpload(plan, file(), { origin: ORIGIN, fetchImpl: respondWith(403) })
    ).rejects.toMatchObject({ failure: 'rejected', status: 403 });

    expect(plan.confirm).not.toHaveBeenCalled();
  });

  it('stops before the PUT when the caller has already navigated away', async () => {
    const controller = new AbortController();
    const fetchImpl = respondWith(204);
    const plan = steps({
      mint: vi.fn(async () => {
        controller.abort();
        return ticket();
      }),
    });

    await expect(
      runDirectUpload(plan, file(), {
        origin: ORIGIN,
        fetchImpl,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ failure: 'aborted' });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(plan.confirm).not.toHaveBeenCalled();
  });

  it('still claims bytes that landed, even if the caller gave up afterwards', async () => {
    // The asymmetry, stated as a test. Honouring the abort here would leave an object
    // in the store that the API was never told about — which is the one outcome the
    // whole sequence exists to avoid.
    const controller = new AbortController();
    const plan = steps();
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => {
      controller.abort();
      return new Response(null, { status: 204 });
    });

    await expect(
      runDirectUpload(plan, file(), {
        origin: ORIGIN,
        fetchImpl,
        signal: controller.signal,
      })
    ).resolves.toEqual({ url: '/storage/users/u-1/picture.jpg', path: 'p' });

    expect(plan.confirm).toHaveBeenCalledTimes(1);
  });

  it('reports a failed confirm as unclaimed, distinctly from a failed upload', async () => {
    const plan = steps({
      confirm: vi.fn(async () => {
        throw new Error('Session expired');
      }),
    });

    const error = await runDirectUpload(plan, file(), {
      origin: ORIGIN,
      fetchImpl: respondWith(204),
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DirectUploadError);
    expect(error).toMatchObject({ failure: 'unclaimed' });
    expect((error as DirectUploadError).cause).toMatchObject({ message: 'Session expired' });
  });

  it('reports an empty confirm as unclaimed too, rather than as a silent success', async () => {
    const plan = steps({ confirm: vi.fn(async () => null) });

    await expect(
      runDirectUpload(plan, file(), { origin: ORIGIN, fetchImpl: respondWith(204) })
    ).rejects.toMatchObject({ failure: 'unclaimed' });
  });

  it('confirms with the same filename it minted with, so both derive one path', async () => {
    // The server re-derives the storage path from identity plus this filename at both
    // ends. Two different filenames would confirm an object the PUT never wrote.
    const plan = steps();

    await runDirectUpload(plan, file(), { origin: ORIGIN, fetchImpl: respondWith(204) });

    expect(plan.confirm).toHaveBeenCalledWith({ filename: 'profile.jpg' });
  });
});
