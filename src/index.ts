/**
 * scxml-http-browser-client
 *
 * Framework-agnostic TypeScript HTTP client for the SCXML HTTP Engine REST API.
 * Zero runtime dependencies — uses native `fetch` only.
 */

// Re-export the client class and all public types
export { EngineClient } from './client';
export type {
  EngineConfig,
  Err,
  Ok,
  Result,
} from './client';

// Re-export OpenAPI-generated type aliases
export type {
  EngineError,
  ExecutionStatus,
  HealthStatus,
  InstanceSnapshot,
  StateInfo,
} from './client';
