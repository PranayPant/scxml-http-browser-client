import { defineConfig } from 'vitest/config';

/**
 * E2E Vitest config for `scxml-http-browser-client`.
 *
 * Runs ONLY `tests/e2e/**` against a real running `scxml-http-server` (no
 * mocked `fetch`). It is deliberately separate from `vitest.config.ts` so the
 * fast, 100%-coverage unit suite stays hermetic.
 *
 * Usage:
 *   npm run test:e2e
 *
 * The server must be reachable at `SCXML_E2E_BASE_URL` (default
 * `http://localhost:4000`) — see `tests/e2e/engine-client.e2e.ts`.
 *
 * Coverage is disabled here: these tests exercise a live external process, so
 * the 100% unit gate is not the right metric for them.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.e2e.ts'],
    // Long timeout: real HTTP round-trips over a socket.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      enabled: false,
    },
  },
});
