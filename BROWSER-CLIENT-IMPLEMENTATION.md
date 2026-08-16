# Implementation Plan: scxml-http-browser-client

**Status: ✅ Implemented (2026-08-15)**

## TL;DR

A standalone TypeScript npm package `scxml-http-browser-client` (consumed from GitHub) that wraps the `scxml-http-engine` REST API in a framework-agnostic `EngineClient` class with proper types matching the engine's actual response format. No editor integration work yet — just the client package contract.

**38 tests, 100% coverage, zero runtime dependencies.**

---

## Key Discovery Findings

### Current state of the UI editor's `src/plugins/engine/` (3 files, will be updated later)

- `types.ts` defines `InstanceSnapshot` with only `{instance_id, configuration, datamodel, done}` — **missing** `execution_status` and `active_states`
- `types.ts` defines `StartInstanceResponse` and `ListInstanceInfo` as separate types — but the engine returns the **full snapshot** for both create and list endpoints
- `client.ts` has `EngineClient` class with `Result<T>` pattern — good foundation, but types need updating
- `useEngineStore.ts` has a Zustand store with persist middleware — this stays in the editor

### Key refinement: `createStatechart` accepts `string | object`

The server handler accepts both a JSON string and a raw JSON object for the `document` field. The client serializes objects internally, so callers can pass either format. This is **Option B** — more ergonomic for the editor which produces AST objects.

### Engine's actual response format

Every endpoint returns the **full snapshot** shape:

```typescript
{
  instance_id: string;
  configuration: string[];        // e.g., ["red"]
  datamodel: Record<string, unknown> | null;  // nullable per OpenAPI spec
  done: boolean;
  execution_status: "idle" | "running" | "completed" | "error";
  active_states: Array<{
    id: string;
    status: "running" | "completed" | "error";
    type: "atomic" | "compound" | "parallel" | "final" | "initial";
  }>;
}

// DELETE /instances/:id returns { deleted: true }
// GET /healthz returns plain text "ok"
// Error responses: { error: string }
```

### Engine endpoints verified

| Endpoint                     | Status  | Body                |
| ---------------------------- | ------- | ------------------- |
| `GET /healthz`               | 200     | `"ok"` (text/plain) |
| `POST /statecharts`          | 201     | full snapshot       |
| `POST /instances`            | 201     | full snapshot       |
| `GET /instances/:id`         | 200     | full snapshot       |
| `POST /instances/:id/events` | 200     | full snapshot       |
| `DELETE /instances/:id`      | 200     | `{"deleted": true}` |
| `GET /instances`             | 200     | `Snapshot[]`        |
| Error                        | 400/404 | `{"error": "..."}`  |

---

## Implementation (Completed)

### Build System — esbuild + vitest + biome (matching `scxml-parser`)

| Tool                             | Purpose                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `esbuild`                        | Bundles CJS (`dist/index.js`) + ESM (`dist/index.mjs`)                        |
| `tsc`                            | `--emitDeclarationOnly` for `.d.ts` + `--noEmit` for type-checking            |
| `vitest` + `@vitest/coverage-v8` | Tests with **100% coverage thresholds**                                       |
| `@biomejs/biome`                 | Lint + format (pre-commit + pre-push via Lefthook)                            |
| `lefthook`                       | Git hooks (pre-commit: format+lint staged, pre-push: full check + type-check) |

### Files Created (14 total)

```
scxml-http-browser-client/
├── package.json          # v0.1.0, type:module, exports map, zero runtime deps
├── tsconfig.json         # ES2020, bundler, strict, declarations
├── biome.json            # Matches scxml-parser config
├── vitest.config.ts      # Node env, 100% coverage thresholds
├── lefthook.yml          # Pre-commit + pre-push hooks
├── .gitignore
├── README.md             # Full docs with API reference
├── scripts/
│   └── build.mjs         # esbuild CJS + ESM + tsc declarations
├── src/
│   ├── index.ts          # PUBLIC API CONTRACT — re-exports only
│   ├── types.ts          # InstanceSnapshot, StateInfo, Result<T>, etc.
│   └── client.ts         # EngineClient class (native fetch, 7 methods)
└── tests/
    ├── client.test.ts    # 29 tests — mocked fetch, full method coverage
    └── types.test.ts     # 9 tests — compile-time type assertions
```

### Key Design Decisions (implemented)

| Decision                         | Implementation                                              |
| -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- | ---------- | ------- | -------------------------------------------------------------------------- |
| `createStatechart` document type | `string                                                     | object` — client serializes objects internally (Option B)         |
| `Result<T>` pattern              | `{ ok: true; data: T }                                      | { ok: false; error: string }` — matches editor's existing pattern |
| `StateInfo.type`                 | `"atomic"                                                   | "compound"                                                        | "parallel" | "final" | "initial"`— matches engine, fixes`"history"` bug in editor's current types |
| `health()` mapping               | Maps `text/plain` → `{ status: "ok" }` for JSON consistency |
| All create/list endpoints        | Return full `InstanceSnapshot` (not partial types)          |
| Zero runtime deps                | Native `fetch` only — no axios, no zod                      |

### Verification Results

| Check                   | Result                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm install`           | Installed 221 packages                                                                               |
| `npm run build`         | Produces `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`, `dist/client.d.ts`, `dist/types.d.ts` |
| `npm test`              | **38 tests passed** (29 client + 9 types)                                                            |
| `npm run test:coverage` | **100% lines, 100% branches, 100% functions, 100% statements**                                       |

---

## Files created

| File                   | Purpose                          |
| ---------------------- | -------------------------------- |
| `package.json`         | Package config                   |
| `tsconfig.json`        | TypeScript config                |
| `biome.json`           | Lint/format config               |
| `vitest.config.ts`     | Test runner + 100% coverage      |
| `lefthook.yml`         | Git hooks                        |
| `.gitignore`           | Ignore dist/node_modules         |
| `README.md`            | Documentation                    |
| `scripts/build.mjs`    | Build script (esbuild + tsc)     |
| `src/index.ts`         | Re-exports (public API contract) |
| `src/types.ts`         | Type definitions                 |
| `src/client.ts`        | EngineClient class               |
| `tests/client.test.ts` | 29 tests, 100% coverage          |
| `tests/types.test.ts`  | 9 compile-time type tests        |

---

## Verification (completed)

1. `npm install` — installed 221 packages
2. `npm run build` — produces `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` + `dist/client.d.ts` + `dist/types.d.ts` (declarations)
3. `npm test` — **38 tests passed** (29 client + 9 types)
4. `npm run test:coverage` — **100%** lines, branches, functions, statements
5. `npx biome check src tests` — zero lint/format issues
6. `npx tsc --noEmit` — zero type errors
7. Verify `package.json` exports map to correct `dist/` files
8. Verify `Result<T>` pattern is consistent across all 7 methods
9. Verify `createStatechart` accepts `string | object`

---

## Decisions

- **Scope**: Only the client package. No editor integration, no canvas visualization, no UI components.
- **Consumption model**: GitHub dependency (`"scxml-http-browser-client": "github:PranayPant/scxml-http-browser-client#main"`). No npm publish, no workspace link.
- **Zero runtime dependencies**: Native `fetch` only. No axios, no superagent, no zod.
- **Types match engine exactly**: `InstanceSnapshot` includes `execution_status` and `active_states` fields. `datamodel` is nullable.
- **`createStatechart`/`createInstance` return full `InstanceSnapshot`**: The engine returns the full snapshot on 201, so the client should too. The editor's current `StartInstanceResponse` type is incorrect.
- **`listInstances` returns `InstanceSnapshot[]`**: The engine returns full snapshot objects in the list, not partial `ListInstanceInfo`. The editor's current type is incorrect.
- **`deleteInstance` returns `{deleted: boolean}`**: Matches the engine's `{"deleted": true}` response.
- **`createStatechart` accepts `document: string | object`**: Option B — client serializes objects internally via `JSON.stringify()`. The server already handles both formats.
- **`health()` returns `Result<HealthStatus>`**: But the engine returns `"ok"` (text/plain), so the client maps it to `{status: "ok"}` for consistency.
- **No `instance_id` field on `sendEvent`**: The client infers it from the active instance — the method signature takes `instanceId` as a parameter.
- **No `execution_status` computation on the client**: The engine already returns it, so we don't need to compute it from `configuration` on the client side.
- **Build system**: esbuild (bundling) + tsc (declarations) + vitest (testing, 100% coverage) + biome (lint/format) + lefthook (git hooks) — matching the `scxml-parser` project conventions.
