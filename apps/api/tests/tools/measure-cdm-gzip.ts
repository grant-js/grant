/**
 * Measures what a CDM sync payload actually costs against Lambda's request cap.
 *
 *   pnpm --filter grant-api measure:cdm-gzip
 *
 * Phase B, slice 1. The story brief records that the gzip mitigation for
 * `POST /api/projects/:id/sync/jobs` "rests entirely on a number nobody has
 * measured". This produces that number. Output is pasted into
 * `plans/2026-08-21-aws-lambda-runtime-measurements.md`; re-run it when the CDM
 * shape changes and update the recorded table.
 *
 * Three sizes matter, and only the third is the one Lambda enforces:
 *
 *   1. Raw JSON bytes — what `API_JSON_BODY_LIMIT_BYTES` governs, because
 *      body-parser applies `limit` to the *decompressed* stream.
 *   2. Gzip bytes — what the client puts on the wire.
 *   3. Invocation payload bytes — the event document Lambda receives, with the
 *      body embedded as a JSON string field. This is what the 6 MB cap applies
 *      to, and it is larger than either of the above:
 *        - a raw JSON body is quote-escaped when embedded in the event JSON,
 *          and CDM is almost all quoted strings;
 *        - a gzip body is binary, so API Gateway base64-encodes it (+33%).
 */

import { gzipSync } from 'node:zlib';

import { CDM_SCALE_PROFILES, generateCdmAtScale } from '../helpers/cdm-scale-fixtures';

/** Lambda synchronous invocation request cap. */
const LAMBDA_REQUEST_CAP_BYTES = 6 * 1024 * 1024;

/**
 * Headers, requestContext, and the rest of the event document around `body`.
 * Deliberately generous: an API Gateway v2 event with a normal header set and
 * an authorizer context runs 1–3 KB.
 */
const EVENT_ENVELOPE_BYTES = 4 * 1024;

const USABLE_BYTES = LAMBDA_REQUEST_CAP_BYTES - EVENT_ENVELOPE_BYTES;

interface Measurement {
  name: string;
  shape: string;
  entities: number;
  rawBytes: number;
  gzipBytes: number;
  gzipMaxBytes: number;
  /** Raw body embedded as a JSON string in the event: quote-escaping included. */
  rawInvocationBytes: number;
  /** Gzip body base64-encoded into the event. */
  gzipInvocationBytes: number;
}

function measure(profile: (typeof CDM_SCALE_PROFILES)[number]): Measurement {
  const cdm = generateCdmAtScale(profile);
  const json = JSON.stringify(cdm);
  const raw = Buffer.byteLength(json, 'utf8');

  const gzip = gzipSync(json, { level: 6 }).length;
  const gzipMax = gzipSync(json, { level: 9 }).length;

  return {
    name: profile.name,
    shape: profile.shape,
    entities:
      profile.users +
      profile.resources +
      profile.resources * profile.actionsPerResource +
      profile.roles +
      profile.groups +
      profile.tags,
    rawBytes: raw,
    gzipBytes: gzip,
    gzipMaxBytes: gzipMax,
    // The event is JSON, so the body string is escaped into it.
    rawInvocationBytes: Buffer.byteLength(JSON.stringify(json), 'utf8') + EVENT_ENVELOPE_BYTES,
    // base64 is 4 bytes per 3, and contains nothing JSON needs to escape.
    gzipInvocationBytes: Math.ceil(gzip / 3) * 4 + EVENT_ENVELOPE_BYTES,
  };
}

function mib(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function pct(part: number, whole: number): string {
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function fits(bytes: number): string {
  return bytes <= LAMBDA_REQUEST_CAP_BYTES ? 'fits' : '**over**';
}

function main(): void {
  const results = CDM_SCALE_PROFILES.map(measure);

  console.log('## Measured payload sizes\n');
  console.log(
    '| Profile | Entities | Raw JSON | Gzip (L6) | Ratio | Invocation, raw | Invocation, gzip+base64 |'
  );
  console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const r of results) {
    console.log(
      `| \`${r.name}\` | ${r.entities.toLocaleString('en-US')} | ${mib(r.rawBytes)} | ${mib(r.gzipBytes)} | ${pct(r.gzipBytes, r.rawBytes)} | ${mib(r.rawInvocationBytes)} ${fits(r.rawInvocationBytes)} | ${mib(r.gzipInvocationBytes)} ${fits(r.gzipInvocationBytes)} |`
    );
  }

  console.log('\n## Derived ceilings\n');

  const ratios = results.map((r) => r.gzipBytes / r.rawBytes);
  const worstRatio = Math.max(...ratios);
  const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  // Raw bodies are quote-escaped into the event; measure that expansion rather
  // than assuming it, since it depends on how quote-dense the document is.
  const escapeFactors = results.map(
    (r) => (r.rawInvocationBytes - EVENT_ENVELOPE_BYTES) / r.rawBytes
  );
  const worstEscape = Math.max(...escapeFactors);

  const uncompressedCeiling = USABLE_BYTES / worstEscape;
  const gzipCeiling = (USABLE_BYTES * 3) / 4 / worstRatio;

  console.log(`- Gzip ratio observed: ${pct(meanRatio, 1)} mean, ${pct(worstRatio, 1)} worst.`);
  console.log(`- JSON quote-escaping expands a raw body by ${worstEscape.toFixed(2)}x worst case.`);
  console.log(
    `- Practical ceiling, uncompressed body: **${mib(uncompressedCeiling)}** of raw CDM.`
  );
  console.log(`- Practical ceiling, gzip body: **${mib(gzipCeiling)}** of raw CDM.`);
  console.log(
    `- Gzip buys **${(gzipCeiling / uncompressedCeiling).toFixed(1)}x** headroom over sending JSON as text.`
  );

  const largest = results[results.length - 1]!;
  console.log(
    `\nLargest profile (\`${largest.name}\`, ${largest.entities.toLocaleString('en-US')} entities) ` +
      `is ${mib(largest.rawBytes)} raw and ${fits(largest.gzipInvocationBytes) === 'fits' ? 'fits' : 'does not fit'} under gzip.`
  );

  console.log(
    `\nCap ${mib(LAMBDA_REQUEST_CAP_BYTES)}, envelope allowance ${(EVENT_ENVELOPE_BYTES / 1024).toFixed(0)} KiB, ` +
      `gzip level 6. Level 9 changes the ratio by at most ` +
      `${pct(Math.max(...results.map((r) => (r.gzipBytes - r.gzipMaxBytes) / r.rawBytes)), 1)}.`
  );
}

main();
