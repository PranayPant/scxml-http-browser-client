import { afterAll, describe, expect, it } from 'vitest';
import { EngineClient } from '../../src/client';

/**
 * End-to-end tests for `EngineClient` against a **real** running
 * `scxml-http-server` — no mocked `fetch`.
 *
 * These are excluded from the default unit suite (`vitest.config.ts` only
 * includes `tests/**\/*.test.ts`); run them via `npm run test:e2e`.
 *
 * Precondition: a server must be reachable at `SCXML_E2E_BASE_URL`
 * (default `http://localhost:4000`). The recommended way to start it:
 *
 *   cd ../scxml-http-server && mix run --no-halt
 *
 * Teardown: every instance created here is `DELETE`d in `afterAll` so a
 * mid-run failure never leaves orphaned instances in the engine.
 */

const BASE = process.env.SCXML_E2E_BASE_URL ?? 'http://localhost:4000';

// A realistic "traffic light" SCXML AST matching the parser AST JSON contract
// (`{ scxml: { id, initial, states: [...] } }`).
const TRAFFIC_LIGHT = {
  scxml: {
    id: 'e2e_traffic',
    initial: 'red',
    version: '1.0',
    states: [
      {
        id: 'red',
        type: 'atomic',
        onentry: [{ kind: 'assign', location: 'data.color', expr: '"red"' }],
        transitions: [
          {
            id: 'red_to_green',
            event: 'next',
            target: 'green',
            executable: [],
          },
        ],
      },
      {
        id: 'green',
        type: 'atomic',
        onentry: [{ kind: 'assign', location: 'data.color', expr: '"green"' }],
        transitions: [
          {
            id: 'green_to_yellow',
            event: 'next',
            target: 'yellow',
            executable: [],
          },
        ],
      },
      {
        id: 'yellow',
        type: 'atomic',
        onentry: [{ kind: 'assign', location: 'data.color', expr: '"yellow"' }],
        transitions: [
          {
            id: 'yellow_to_red',
            event: 'next',
            target: 'red',
            executable: [],
          },
        ],
      },
    ],
  },
};

const createdInstanceIds: string[] = [];
const client = new EngineClient(BASE);

afterAll(async () => {
  // Clean up every instance this suite created, even on failure.
  for (const id of createdInstanceIds) {
    await client.deleteInstance(id);
  }
});

describe('EngineClient end-to-end (real server)', () => {
  it('health() returns ok', async () => {
    const health = await client.health();
    expect(health.ok).toBe(true);
    if (health.ok) {
      expect(health.data.status).toBe('ok');
    }
  });

  it('createStatechart → sendEvent → getInstance → deleteInstance', async () => {
    const instanceId = `e2e_client_${Date.now()}`;

    const created = await client.createStatechart(TRAFFIC_LIGHT, instanceId);
    expect(created.ok).toBe(true);
    createdInstanceIds.push(instanceId);
    if (created.ok) {
      expect(created.data.instance_id).toBe(instanceId);
      expect(created.data.configuration).toEqual(['red']);
      expect(created.data.execution_status).toBe('idle');
      expect(created.data.active_states).toEqual([
        { id: 'red', status: 'running', type: 'atomic' },
      ]);
      expect(created.data.done).toBe(false);
    }

    // Step red → green
    const stepped = await client.sendEvent(instanceId, 'next', {});
    expect(stepped.ok).toBe(true);
    if (stepped.ok) {
      expect(stepped.data.configuration).toEqual(['green']);
      expect(stepped.data.execution_status).toBe('running');
      expect(stepped.data.active_states).toEqual([
        { id: 'green', status: 'running', type: 'atomic' },
      ]);
    }

    // Snapshot reflects the settled green state
    const snap = await client.getInstance(instanceId);
    expect(snap.ok).toBe(true);
    if (snap.ok) {
      expect(snap.data.configuration).toEqual(['green']);
    }

    // Clean up
    const deleted = await client.deleteInstance(instanceId);
    expect(deleted.ok).toBe(true);
    if (deleted.ok) {
      expect(deleted.data.deleted).toBe(true);
    }
  });
});
