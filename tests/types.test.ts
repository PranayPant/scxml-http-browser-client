import { describe, expect, it, expectTypeOf } from "vitest";
import type {
  Err,
  InstanceSnapshot,
  Ok,
  Result,
  StateInfo,
} from "../src/index";

describe("type definitions", () => {
  // -----------------------------------------------------------------------
  // Result<T> discriminated union
  // -----------------------------------------------------------------------

  describe("Result<T>", () => {
    it("narrows Ok branch correctly", () => {
      const ok: Ok<string> = { ok: true, data: "hello" };
      if (ok.ok) {
        expectTypeOf(ok.data).toBeString();
        expect(ok.data).toBe("hello");
      }
    });

    it("narrows Err branch correctly", () => {
      const err: Err = { ok: false, error: "fail" };
      if (!err.ok) {
        expectTypeOf(err.error).toBeString();
        expect(err.error).toBe("fail");
      }
    });

    it("discriminated union narrows both branches", () => {
      const result: Result<number> =
        Math.random() > 0.5
          ? { ok: true, data: 42 }
          : { ok: false, error: "nope" };

      if (result.ok) {
        // Should be narrowed to Ok<number>
        expectTypeOf(result.data).toBeNumber();
      } else {
        // Should be narrowed to Err
        expectTypeOf(result.error).toBeString();
      }
    });
  });

  // -----------------------------------------------------------------------
  // InstanceSnapshot
  // -----------------------------------------------------------------------

  describe("InstanceSnapshot", () => {
    it("has all 6 required fields with correct types", () => {
      const snapshot: InstanceSnapshot = {
        instance_id: "inst-1",
        configuration: ["s1", "s2"],
        datamodel: { key: "value" },
        done: false,
        execution_status: "idle",
        active_states: [],
      };

      expectTypeOf(snapshot.instance_id).toBeString();
      expectTypeOf(snapshot.configuration).toBeArray();
      expectTypeOf(snapshot.configuration).items.toBeString();
      expectTypeOf(snapshot.datamodel).toMatchTypeOf<Record<
        string,
        unknown
      > | null>();
      expectTypeOf(snapshot.done).toBeBoolean();
      expectTypeOf(snapshot.execution_status).toMatchTypeOf<
        "idle" | "running" | "completed" | "error"
      >();
      expectTypeOf(snapshot.active_states).toBeArray();
      expectTypeOf(snapshot.active_states).items.toMatchTypeOf<StateInfo>();
    });

    it("datamodel can be null", () => {
      const snapshot: InstanceSnapshot = {
        instance_id: "inst-1",
        configuration: [],
        datamodel: null,
        done: false,
        execution_status: "idle",
        active_states: [],
      };
      expect(snapshot.datamodel).toBeNull();
    });

    it("datamodel can be a record", () => {
      const snapshot: InstanceSnapshot = {
        instance_id: "inst-1",
        configuration: [],
        datamodel: { count: 42, name: "test" },
        done: false,
        execution_status: "idle",
        active_states: [],
      };
      expect(snapshot.datamodel?.count).toBe(42);
      expect(snapshot.datamodel?.name).toBe("test");
    });
  });

  // -----------------------------------------------------------------------
  // StateInfo
  // -----------------------------------------------------------------------

  describe("StateInfo", () => {
    it('type includes "initial" and excludes "history"', () => {
      // "initial" should be valid
      const state: StateInfo = {
        id: "s1",
        status: "running",
        type: "initial",
      };
      expect(state.type).toBe("initial");

      // All valid type values
      const validTypes: StateInfo["type"][] = [
        "atomic",
        "compound",
        "parallel",
        "final",
        "initial",
      ];
      expect(validTypes).toHaveLength(5);

      // Verify "history" is NOT in the valid types
      // @ts-expect-error - "history" should not be assignable to StateInfo.type
      const invalid: StateInfo["type"] = "history";
      void invalid;
    });

    it("status can be running, completed, or error", () => {
      const statuses: StateInfo["status"][] = ["running", "completed", "error"];
      expect(statuses).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // ExecutionStatus
  // -----------------------------------------------------------------------

  describe("ExecutionStatus", () => {
    it("matches the engine values", () => {
      const status: InstanceSnapshot["execution_status"] = "idle";
      expect(["idle", "running", "completed", "error"]).toContain(status);
    });
  });
});
