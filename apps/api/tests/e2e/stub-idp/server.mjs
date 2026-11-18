/**
 * Stub identity provider for the E2E stack: Google's token and userinfo endpoints and
 * GitHub's token, `/user` and `/user/emails` endpoints, so the social sign-in callback runs
 * end to end without a real IdP.
 *
 * Stateless by design: the authorization code a test sends to the callback is the
 * base64url-encoded JSON profile the IdP should assert. The token endpoints hand the code
 * back as the access token, and the profile endpoints decode it. Each test therefore
 * chooses its own identity (address, `email_verified`, `hd`, GitHub email list).
 *
 *   Google profile: { sub, email, email_verified, hd?, name? }
 *   GitHub profile: { id, login, name?, emails: [{ email, primary, verified }] }
 *
 * Test-only. Plain Node, no dependencies; run by docker-compose.e2e.yml.
 */
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { URL, URLSearchParams } from 'node:url';

const PORT = Number(process.env.STUB_IDP_PORT ?? 8080);

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/** The `code` from a form-encoded (Google) or JSON (GitHub) token request. */
function codeFrom(rawBody, contentType) {
  if ((contentType ?? '').includes('application/json')) {
    return JSON.parse(rawBody || '{}').code;
  }
  return new URLSearchParams(rawBody).get('code');
}

function profileFrom(req) {
  const header = req.headers.authorization ?? '';
  const token = header.replace(/^(Bearer|token)\s+/i, '');
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://stub-idp');

  if (req.method === 'GET' && pathname === '/health') {
    return send(res, 200, { status: 'ok' });
  }

  if (req.method === 'POST' && (pathname === '/google/token' || pathname === '/github/token')) {
    const code = codeFrom(await readBody(req), req.headers['content-type']);
    if (!code) return send(res, 400, { error: 'invalid_grant' });
    return send(res, 200, { access_token: code, token_type: 'Bearer', expires_in: 3600 });
  }

  const profile = profileFrom(req);
  if (!profile) return send(res, 401, { message: 'Bad credentials' });

  if (req.method === 'GET' && pathname === '/google/userinfo') {
    const { sub, email, email_verified, hd, name } = profile;
    return send(res, 200, { sub, email, email_verified, hd, name: name ?? 'E2E Google User' });
  }

  if (req.method === 'GET' && pathname === '/github-api/user') {
    return send(res, 200, {
      id: profile.id,
      login: profile.login,
      name: profile.name ?? 'E2E GitHub User',
      avatar_url: null,
      bio: null,
      company: null,
      location: null,
    });
  }

  if (req.method === 'GET' && pathname === '/github-api/user/emails') {
    const emails = (profile.emails ?? []).map((e) => ({ ...e, visibility: null }));
    return send(res, 200, emails);
  }

  return send(res, 404, { message: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`stub-idp listening on ${PORT}`);
});
