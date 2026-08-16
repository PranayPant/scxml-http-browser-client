import { describe, expect, it, vi } from "vitest";
import { EngineClient } from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock fetch response with JSON body. */
function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/** Create a mock fetch response with text body. */
function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EngineClient", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  describe("constructor", () => {
    it("strips trailing slashes from baseUrl", async () => {
      const client = new EngineClient("http://localhost:4000/");
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(textResponse("ok"));
      await client.health();
      expect(fetchSpy).toHaveBeenCalledWith("http://localhost:4000/healthz");
    });

    it("accepts baseUrl without trailing slash", async () => {
      const client = new EngineClient("http://localhost:4000");
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(textResponse("ok"));
      await client.health();
      expect(fetchSpy).toHaveBeenCalledWith("http://localhost:4000/healthz");
    });

    it("accepts optional config parameter", () => {
      const client = new EngineClient("http://localhost:4000", {
        baseUrl: "http://localhost:4000",
      });
      expect(client).toBeInstanceOf(EngineClient);
    });
  });

  // -----------------------------------------------------------------------
  // health()
  // -----------------------------------------------------------------------

  describe("health()", () => {
    it("returns HealthStatus from text/plain response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(textResponse("ok"));
      const client = new EngineClient("http://localhost:4000");
      const result = await client.health();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ status: "ok" });
      }
    });

    it("returns error on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        textResponse("Service Unavailable", 503),
      );
      const client = new EngineClient("http://localhost:4000");
      const result = await client.health();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Service Unavailable");
      }
    });

    it("returns error on network failure", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Network error"),
      );
      const client = new EngineClient("http://localhost:4000");
      const result = await client.health();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Network error");
      }
    });

    it("falls back to HTTP status when error body is empty", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("", { status: 503 }),
      );
      const client = new EngineClient("http://localhost:4000");
      const result = await client.health();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("HTTP 503");
      }
    });

    it("handles non-Error rejection in fetchText", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue("string rejection");
      const client = new EngineClient("http://localhost:4000");
      const result = await client.health();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Unknown network error");
      }
    });
  });

  // -----------------------------------------------------------------------
  // createStatechart()
  // -----------------------------------------------------------------------

  describe("createStatechart()", () => {
    const snapshot = {
      instance_id: "inst-1",
      configuration: ["s1"],
      datamodel: { x: 1 },
      done: false,
      execution_status: "idle" as const,
      active_states: [
        { id: "s1", status: "running" as const, type: "atomic" as const },
      ],
    };

    it("sends document as string", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot, 201));
      const client = new EngineClient("http://localhost:4000");
      const result = await client.createStatechart(
        JSON.stringify({ scxml: {} }),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(snapshot);
      }
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:4000/statecharts",
        expect.objectContaining({ method: "POST" }),
      );
      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.document).toBe(JSON.stringify({ scxml: {} }));
    });

    it("sends document as object (serializes internally)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot, 201));
      const client = new EngineClient("http://localhost:4000");
      const result = await client.createStatechart({ scxml: {} });

      expect(result.ok).toBe(true);
      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.document).toBe(JSON.stringify({ scxml: {} }));
    });

    it("includes instance_id when provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot, 201));
      const client = new EngineClient("http://localhost:4000");
      await client.createStatechart("{}", "my-instance");

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.instance_id).toBe("my-instance");
    });

    it("omits instance_id when not provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot, 201));
      const client = new EngineClient("http://localhost:4000");
      await client.createStatechart("{}");

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.instance_id).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // createInstance()
  // -----------------------------------------------------------------------

  describe("createInstance()", () => {
    const snapshot = {
      instance_id: "inst-1",
      configuration: [],
      datamodel: null,
      done: false,
      execution_status: "idle" as const,
      active_states: [],
    };

    it("sends graph_id", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot, 201));
      const client = new EngineClient("http://localhost:4000");
      await client.createInstance("graph-1");

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.graph_id).toBe("graph-1");
    });

    it("includes instance_id when provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot, 201));
      const client = new EngineClient("http://localhost:4000");
      await client.createInstance("graph-1", "my-inst");

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.instance_id).toBe("my-inst");
    });

    it("includes initial_datamodel when provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot, 201));
      const client = new EngineClient("http://localhost:4000");
      await client.createInstance("graph-1", undefined, { count: 0 });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.initial_datamodel).toEqual({ count: 0 });
    });

    it("omits optional fields when not provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot, 201));
      const client = new EngineClient("http://localhost:4000");
      await client.createInstance("graph-1");

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.instance_id).toBeUndefined();
      expect(body.initial_datamodel).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // getInstance()
  // -----------------------------------------------------------------------

  describe("getInstance()", () => {
    it("calls GET /instances/:id", async () => {
      const snapshot = {
        instance_id: "inst-1",
        configuration: [],
        datamodel: null,
        done: false,
        execution_status: "idle" as const,
        active_states: [],
      };
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot));
      const client = new EngineClient("http://localhost:4000");
      const result = await client.getInstance("inst-1");

      expect(result.ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:4000/instances/inst-1",
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("encodes URI components in instanceId", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({}));
      const client = new EngineClient("http://localhost:4000");
      await client.getInstance("my/id");

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:4000/instances/my%2Fid",
        expect.anything(),
      );
    });
  });

  // -----------------------------------------------------------------------
  // sendEvent()
  // -----------------------------------------------------------------------

  describe("sendEvent()", () => {
    const snapshot = {
      instance_id: "inst-1",
      configuration: ["s2"],
      datamodel: {},
      done: false,
      execution_status: "idle" as const,
      active_states: [
        { id: "s2", status: "running" as const, type: "atomic" as const },
      ],
    };

    it("sends event name", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot));
      const client = new EngineClient("http://localhost:4000");
      await client.sendEvent("inst-1", "next");

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.name).toBe("next");
    });

    it("includes data when provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot));
      const client = new EngineClient("http://localhost:4000");
      await client.sendEvent("inst-1", "next", { key: "value" });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.data).toEqual({ key: "value" });
    });

    it("omits data when not provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse(snapshot));
      const client = new EngineClient("http://localhost:4000");
      await client.sendEvent("inst-1", "next");

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.data).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // deleteInstance()
  // -----------------------------------------------------------------------

  describe("deleteInstance()", () => {
    it("calls DELETE /instances/:id", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({ deleted: true }));
      const client = new EngineClient("http://localhost:4000");
      const result = await client.deleteInstance("inst-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ deleted: true });
      }
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:4000/instances/inst-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // listInstances()
  // -----------------------------------------------------------------------

  describe("listInstances()", () => {
    it("returns array of snapshots", async () => {
      const snapshots = [
        {
          instance_id: "inst-1",
          configuration: [],
          datamodel: null,
          done: false,
          execution_status: "idle" as const,
          active_states: [],
        },
      ];
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(snapshots));
      const client = new EngineClient("http://localhost:4000");
      const result = await client.listInstances();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].instance_id).toBe("inst-1");
      }
    });

    it("returns empty array when no instances", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));
      const client = new EngineClient("http://localhost:4000");
      const result = await client.listInstances();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe("error handling", () => {
    it("returns error from JSON error response body", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse({ error: "instance not found" }, 404),
      );
      const client = new EngineClient("http://localhost:4000");
      const result = await client.getInstance("nonexistent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("instance not found");
      }
    });

    it("returns HTTP status as error when body has no error field", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse({ message: "Not Found" }, 404),
      );
      const client = new EngineClient("http://localhost:4000");
      const result = await client.getInstance("nonexistent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("HTTP 404");
      }
    });

    it("returns error on network failure", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("fetch failed"),
      );
      const client = new EngineClient("http://localhost:4000");
      const result = await client.getInstance("inst-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("fetch failed");
      }
    });

    it("returns error on non-Error rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue("string error");
      const client = new EngineClient("http://localhost:4000");
      const result = await client.getInstance("inst-1");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Unknown network error");
      }
    });

    it("handles 204 No Content", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(null, { status: 204 }),
      );
      // Use a method that might return 204 in the future (e.g., deleteInstance
      // if the engine changes). For now, 204 handling is in fetchJson.
      // We test it via the internal path by calling a method that goes through
      // fetchJson.
      // Actually, deleteInstance returns 200 with body. Let's just verify
      // the fetchJson helper handles 204 by testing a scenario where we
      // mock a 204 on a GET endpoint.
      // We'll make getInstance return 204 (unrealistic but tests the code path).
      const client = new EngineClient("http://localhost:4000");
      // We can't directly call fetchJson, but we can test through getInstance
      // with a 204 response. This verifies the code path exists.
      // Since 204 on getInstance is unrealistic, we verify the fetchJson
      // handles it by checking the response is null-data.
      // Actually, the 204 path returns { ok: true, data: null } cast to T.
      // Let's test this via a realistic scenario: no endpoint currently returns 204,
      // but the code handles it. We'll test it directly.
      // The simplest: call getInstance with a 204 mock.
      const result = await client.getInstance("inst-1");
      expect(result.ok).toBe(true);
    });
  });
});
