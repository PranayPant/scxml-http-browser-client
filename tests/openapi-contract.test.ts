import { describe, expect, it } from 'vitest';
import {
  EngineClient,
  type ExecutionStatus,
  type InstanceSnapshot,
  type StateInfo,
} from '../src/client';

/**
 * Contract test that locks the client's public type aliases to the engine's
 * OpenAPI wire contract.
 *
 * The client's `InstanceSnapshot` / `StateInfo` / `ExecutionStatus` aliases
 * are derived from `src/generated.ts`, which is regenerated from the server's
 * released `openapi.json`. This suite pins the *runtime semantics* those
 * types commit to, so a drift between the engine (orchestrator + server
 * `schemas.ex`), the generated types, and what the client advertises is caught
 * here rather than silently in production.
 *
 * Run with: npm run test:typecheck-spec
 */
describe('OpenAPI contract (client ↔ engine)', () => {
  it('StateInfo.type matches the engine state types (history valid, initial not)', () => {
    // RuntimeState.type — the engine's authoritative set. "history" IS a state
    // type; "initial" is the initial pseudo-state, NOT a StateInfo.type.
    const validTypes: StateInfo['type'][] = ['atomic', 'compound', 'parallel', 'final', 'history'];
    expect(validTypes).toHaveLength(5);

    // Drift canaries:
    //   - a valid history state must be assignable
    const historyState: StateInfo = { id: 'h1', status: 'running', type: 'history' };
    expect(historyState.type).toBe('history');

    //   - "initial" must NOT be assignable to StateInfo.type.
    // @ts-expect-error - "initial" is not a StateInfo.type
    const invalid: StateInfo['type'] = 'initial';
    void invalid;
  });

  it('ExecutionStatus matches the Snapshot contract', () => {
    const statuses: ExecutionStatus[] = ['idle', 'running', 'completed', 'error'];
    expect(statuses).toHaveLength(4);
  });

  it('InstanceSnapshot carries the required OpenAPI fields', () => {
    const snapshot: InstanceSnapshot = {
      instance_id: 'x',
      configuration: ['red'],
      done: false,
      execution_status: 'idle',
      active_states: [{ id: 'red', status: 'running', type: 'atomic' }],
      datamodel: { data: { color: 'red' } },
    };
    expect(snapshot.instance_id).toBe('x');
    expect(snapshot.configuration).toEqual(['red']);
    expect(snapshot.active_states[0]).toMatchObject({ id: 'red', status: 'running' });
  });

  it('EngineClient exposes the 7 documented methods', () => {
    const c = new EngineClient('http://localhost:4000');
    expect(typeof c.health).toBe('function');
    expect(typeof c.createStatechart).toBe('function');
    expect(typeof c.createInstance).toBe('function');
    expect(typeof c.getInstance).toBe('function');
    expect(typeof c.sendEvent).toBe('function');
    expect(typeof c.deleteInstance).toBe('function');
    expect(typeof c.listInstances).toBe('function');
  });
});
