/**
 * Measures how long the Next standalone server takes to accept its first connection.
 *
 *   pnpm --filter grant-web build
 *   pnpm --filter grant-web measure:boot [runs]
 *
 * **This is the app's share of Lambda cold start, and the reason it is measurable at all
 * is `AWS_LWA_READINESS_CHECK_PROTOCOL=tcp`** (`apps/web/Dockerfile`). The Lambda Web
 * Adapter treats an execution environment as ready when something listens on
 * `AWS_LWA_PORT`, so "time from `node server.js` to accepting a TCP connection" is
 * precisely what the application contributes to init duration. Everything else in a cold
 * start — image pull, runtime init, the adapter's own startup — belongs to AWS and is not
 * something this repository can change.
 *
 * It is therefore a **regression signal, not a cold-start number.** A deployed cold start
 * is larger and is measured from CloudWatch `Init Duration` (phase C: 526–630 ms). Do not
 * compare the two directly; compare this against its own history.
 *
 * Exists because ADR 0003's OpenNext decision is conditional — it rests on this app using
 * neither ISR nor Next image optimization — and a conditional decision needs a cheap way
 * to re-check it. Slice 15 of the AWS follow-ups closeout story reconstructed this method
 * from scratch and got it wrong twice (`/dev/tcp` is a bash builtin and the repo's shell
 * is zsh, which fails open as an eight-second timeout that looks like a boot time).
 */

import { spawn } from 'node:child_process';
import net from 'node:net';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const STANDALONE = resolve(here, '..', '.next', 'standalone', 'apps', 'web');

/** Unlikely to collide with a dev server on 3000 or the e2e stack on 3001. */
const PORT = 3999;
const RUNS = Number(process.argv[2] ?? 7);

function waitForListen(port, deadlineMs = 60_000) {
  const start = performance.now();
  return new Promise((resolve_, reject) => {
    const attempt = () => {
      const socket = net.connect({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolve_(performance.now() - start);
      });
      socket.once('error', () => {
        socket.destroy();
        if (performance.now() - start > deadlineMs) {
          reject(new Error(`nothing listened on ${port} within ${deadlineMs} ms`));
          return;
        }
        void delay(5).then(attempt);
      });
    };
    attempt();
  });
}

async function main() {
  if (!existsSync(join(STANDALONE, 'server.js'))) {
    throw new Error(
      `No standalone server at ${STANDALONE}. Run \`pnpm --filter grant-web build\` first ` +
        "(it requires `output: 'standalone'`, which next.config.ts sets)."
    );
  }

  const results = [];
  for (let run = 0; run < RUNS; run++) {
    const started = performance.now();
    const child = spawn('node', ['server.js'], {
      cwd: STANDALONE,
      env: { ...process.env, PORT: String(PORT), HOSTNAME: '127.0.0.1', NODE_ENV: 'production' },
      stdio: 'ignore',
    });
    try {
      await waitForListen(PORT);
      results.push(performance.now() - started);
    } finally {
      child.kill('SIGKILL');
      // The port is not free the instant the process dies, and a failed connect on a
      // lingering socket would be recorded as the next run's boot time.
      await delay(300);
    }
  }

  results.sort((a, b) => a - b);
  const at = (fraction) => results[Math.min(results.length - 1, Math.floor(results.length * fraction))];
  const ms = (n) => `${n.toFixed(0)} ms`;

  process.stdout.write(
    [
      '## Next standalone boot to first accepted connection',
      '',
      `- Runs: ${results.map((r) => r.toFixed(0)).join(', ')} (ms)`,
      `- min **${ms(results[0])}**, median **${ms(at(0.5))}**, max **${ms(results[results.length - 1])}**`,
      '',
      'The application half of Lambda init duration, per the adapter\'s TCP readiness check.',
      'A regression signal against its own history — not comparable to a deployed cold start.',
      '',
    ].join('\n')
  );
}

await main();
