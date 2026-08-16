/**
 * Types for the SCXML HTTP Engine REST API.
 *
 * These types define the contract between the browser client and the
 * scxml-http-engine server. They match the engine's actual response
 * format exactly (as defined in the server's OpenAPI schemas).
 */

/** Current execution status of a statechart instance. */
export type ExecutionStatus = "idle" | "running" | "completed" | "error";

/** Per-state execution status reported by the engine. */
export interface StateInfo {
  id: string;
  status: "running" | "completed" | "error";
  type: "atomic" | "compound" | "parallel" | "final" | "initial";
}

/**
 * Full snapshot of a running statechart instance.
 * Returned by all instance-related endpoints.
 */
export interface InstanceSnapshot {
  instance_id: string;
  configuration: string[];
  datamodel: Record<string, unknown> | null;
  done: boolean;
  execution_status: ExecutionStatus;
  active_states: StateInfo[];
}

/** Response from the GET /healthz endpoint (mapped to JSON). */
export interface HealthStatus {
  status: string;
}

/** Error response body from the engine. */
export interface EngineError {
  error: string;
}

/**
 * Discriminated union for consistent API responses.
 *
 * - `Ok<T>`: `{ ok: true; data: T }`
 * - `Err`:   `{ ok: false; error: string }`
 *
 * Use `result.ok` to narrow:
 * ```ts
 * if (result.ok) { console.log(result.data); }
 * else           { console.error(result.error); }
 * ```
 */
export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: string };
export type Result<T> = Ok<T> | Err;

/** Configuration for the EngineClient. */
export interface EngineConfig {
  /** Base URL of the scxml-http-engine server (e.g. "http://localhost:4000"). */
  baseUrl: string;
}
