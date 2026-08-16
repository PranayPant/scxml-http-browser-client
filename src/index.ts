/**
 * scxml-http-browser-client
 *
 * Framework-agnostic TypeScript HTTP client for the SCXML HTTP Engine REST API.
 * Zero runtime dependencies — uses native `fetch` only.
 */

// Re-export all public types
export type {
  EngineConfig,
  EngineError,
  Err,
  ExecutionStatus,
  HealthStatus,
  InstanceSnapshot,
  Ok,
  Result,
  StateInfo,
} from "./types";

// Re-export the client class
export { EngineClient } from "./client";
