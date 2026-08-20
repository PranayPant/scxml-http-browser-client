/**
 * scxml-http-browser-client
 *
 * Framework-agnostic TypeScript HTTP client for the SCXML HTTP Engine REST API.
 * Minimal runtime dependency — `@opentelemetry/api` only (no-op when no SDK
 * is registered by the host). Uses native `fetch`.
 */

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
} from './client';
// Re-export the client class and all public types
export { EngineClient } from './client';
// Re-export the OTel tracer helper so hosts can toggle span detail.
export { clientTracer } from './tracing';
