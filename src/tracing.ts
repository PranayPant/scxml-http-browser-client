/**
 * Minimal OpenTelemetry tracer helper for the browser client.
 *
 * This client is a published, framework-agnostic library that depends only on
 * `@opentelemetry/api` (the no-op API). When a host application (e.g.
 * `scxml-ui-editor`) has registered an SDK, `trace.getTracer(...)` returns a
 * real tracer and these spans join the host's trace; otherwise every call is a
 * no-op and adds negligible overhead.
 *
 * Detail gating: `spanDetail` defaults to `false` (coarse spans only). Hosts
 * can enable fine-grained tracing via the `EngineConfig.spanDetail` option so
 * the browser client mirrors the server's INFO/DEBUG log-level split.
 */

import {
  type Attributes,
  type Span,
  SpanKind,
  type SpanOptions,
  type Tracer,
  trace,
} from '@opentelemetry/api';

const SERVICE_SCOPE = 'scxml-http-browser-client';

/** Wrapper around the (possibly no-op) OTel tracer for this library. */
class ClientTracer {
  private tracer: Tracer = trace.getTracer(SERVICE_SCOPE, '0.1.0');
  private detail = false;

  /** Enable/disable fine-grained (DEBUG-style) spans from the host. */
  setDetail(enabled: boolean): void {
    this.detail = enabled;
  }

  /** Get a tracer-scoped span for a coarse, always-on operation. */
  startSpan(name: string, attributes?: Attributes): Span {
    return this.tracer.startSpan(name, {
      kind: SpanKind.CLIENT,
      attributes,
    } satisfies SpanOptions);
  }

  /**
   * Get a span for a fine-grained (DEBUG-style) operation, or `null` when
   * detail is disabled so no span is created at all.
   */
  startDetailSpan(name: string, attributes?: Attributes): Span | null {
    if (!this.detail) return null;
    return this.startSpan(name, attributes);
  }
}

export const clientTracer = new ClientTracer();
