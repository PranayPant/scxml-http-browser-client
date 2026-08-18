// ---------------------------------------------------------------------------
// Client-specific types
// ---------------------------------------------------------------------------

/** Discriminated union for consistent API responses. */
export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: string };
export type Result<T> = Ok<T> | Err;

/** Configuration for the EngineClient. */
export interface EngineConfig {
  /** Base URL of the scxml-http-engine server (e.g. "http://localhost:4000"). */
  baseUrl: string;
}

// Convenience aliases for generated OpenAPI types
export type InstanceSnapshot = import('./generated').components['schemas']['Snapshot'];
export type HealthStatus = import('./generated').components['schemas']['HealthStatus'];
export type StateInfo = import('./generated').components['schemas']['StateInfo'];
export type EngineError = import('./generated').components['schemas']['EngineError'];
export type ExecutionStatus = InstanceSnapshot['execution_status'];

/**
 * Framework-agnostic HTTP client for the SCXML HTTP Engine REST API.
 *
 * Uses native `fetch` — zero runtime dependencies. Works in any browser
 * or environment that supports the Fetch API.
 *
 * @example
 * ```ts
 * const client = new EngineClient('http://localhost:4000');
 *
 * const health = await client.health();
 * if (health.ok) {
 *   console.log('Engine status:', health.data.status);
 * }
 * ```
 */
export class EngineClient {
  private readonly baseUrl: string;

  /**
   * @param baseUrl - Base URL of the scxml-http-engine server
   *   (e.g. `"http://localhost:4000"`). Trailing slashes are stripped.
   * @param _config - Optional configuration (reserved for future use).
   */
  constructor(baseUrl: string, _config?: EngineConfig) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Perform a JSON request and parse the response.
   * Handles 204 No Content by returning `null`.
   */
  private async fetchJson<T>(url: string, options?: RequestInit): Promise<Result<T>> {
    try {
      console.info(`[EngineClient] ${options?.method || 'GET'} ${url}`, {
        body: options?.body,
      });

      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      if (response.status === 204) {
        console.info(`[EngineClient] Response: 204 No Content`);
        return { ok: true, data: null as unknown as T };
      }

      const body = await response.json();

      if (!response.ok) {
        const message = typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`;
        console.info(`[EngineClient] Response: ${response.status}`, {
          error: message,
        });
        return { ok: false, error: message };
      }

      console.info(`[EngineClient] Response: ${response.status}`, {
        data: body,
      });
      return { ok: true, data: body as T };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      console.info(`[EngineClient] Error:`, { error: message });
      return { ok: false, error: message };
    }
  }

  /**
   * Fetch a plain text response (used for /healthz which returns text/plain).
   */
  private async fetchText(url: string): Promise<Result<string>> {
    try {
      const response = await fetch(url);
      const text = await response.text();

      if (!response.ok) {
        return { ok: false, error: text || `HTTP ${response.status}` };
      }

      return { ok: true, data: text };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      return { ok: false, error: message };
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * GET /healthz — Liveness probe.
   * Maps the engine's `"ok"` text response to `{ status: "ok" }`.
   */
  async health(): Promise<Result<HealthStatus>> {
    const result = await this.fetchText(`${this.baseUrl}/healthz`);
    if (!result.ok) return result;
    return { ok: true, data: { status: result.data } };
  }

  /**
   * POST /statecharts — Upload an SCXML AST document and start an instance.
   *
   * @param document - The SCXML AST as a JSON string or a plain object.
   *   Objects are serialized internally. The server accepts both formats.
   * @param instanceId - Optional custom instance identifier.
   */
  async createStatechart(
    document: string | object,
    instanceId?: string,
  ): Promise<Result<InstanceSnapshot>> {
    const body: Record<string, unknown> = {
      document: typeof document === 'string' ? document : JSON.stringify(document),
    };
    if (instanceId !== undefined) {
      body.instance_id = instanceId;
    }
    return this.fetchJson<InstanceSnapshot>(`${this.baseUrl}/statecharts`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * POST /instances — Start an instance from a previously stored graph.
   *
   * @param graphId - ID of the compiled graph (from a prior createStatechart call).
   * @param instanceId - Optional custom instance identifier.
   * @param initialDatamodel - Optional initial datamodel values.
   */
  async createInstance(
    graphId: string,
    instanceId?: string,
    initialDatamodel?: Record<string, unknown>,
  ): Promise<Result<InstanceSnapshot>> {
    const body: Record<string, unknown> = { graph_id: graphId };
    if (instanceId !== undefined) {
      body.instance_id = instanceId;
    }
    if (initialDatamodel !== undefined) {
      body.initial_datamodel = initialDatamodel;
    }
    return this.fetchJson<InstanceSnapshot>(`${this.baseUrl}/instances`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * GET /instances/:id — Get a snapshot of a running instance.
   */
  async getInstance(instanceId: string): Promise<Result<InstanceSnapshot>> {
    return this.fetchJson<InstanceSnapshot>(
      `${this.baseUrl}/instances/${encodeURIComponent(instanceId)}`,
    );
  }

  /**
   * POST /instances/:id/events — Send an event to a running instance
   * and return the settled state after the macrostep completes.
   *
   * @param instanceId - The instance to send the event to.
   * @param eventName - The event name (e.g. "next", "error", "cancel").
   * @param data - Optional event payload.
   */
  async sendEvent(
    instanceId: string,
    eventName: string,
    data?: Record<string, unknown>,
  ): Promise<Result<InstanceSnapshot>> {
    const body: Record<string, unknown> = { name: eventName };
    if (data !== undefined) {
      body.data = data;
    }
    return this.fetchJson<InstanceSnapshot>(
      `${this.baseUrl}/instances/${encodeURIComponent(instanceId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  /**
   * DELETE /instances/:id — Stop and remove a running instance.
   */
  async deleteInstance(instanceId: string): Promise<Result<{ deleted: boolean }>> {
    return this.fetchJson<{ deleted: boolean }>(
      `${this.baseUrl}/instances/${encodeURIComponent(instanceId)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * GET /instances — List all running instances.
   * Returns an array of full InstanceSnapshot objects.
   */
  async listInstances(): Promise<Result<InstanceSnapshot[]>> {
    return this.fetchJson<InstanceSnapshot[]>(`${this.baseUrl}/instances`);
  }
}
