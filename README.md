# scxml-http-browser-client

Framework-agnostic TypeScript HTTP client for the [SCXML HTTP Engine](https://github.com/PranayPant/scxml-http-server) REST API.

**Zero runtime dependencies** — uses native `fetch` only. Works in any browser or environment that supports the Fetch API.

---

## Installation

```bash
npm install github:PranayPant/scxml-http-browser-client#main
```

Or add to `package.json`:

```json
{
  "dependencies": {
    "scxml-http-browser-client": "github:PranayPant/scxml-http-browser-client#main"
  }
}
```

---

## Quick Start

```typescript
import { EngineClient } from 'scxml-http-browser-client';

const client = new EngineClient('http://localhost:4000');

// Check engine health
const health = await client.health();
if (health.ok) {
  console.log('Engine status:', health.data.status);
}

// Upload a statechart AST and start an instance
const result = await client.createStatechart(
  { scxml: { initial: 'idle', states: [...] } },
  'my-instance',
);
if (result.ok) {
  console.log('Instance started:', result.data.instance_id);
  console.log('Active states:', result.data.active_states);
}

// Send an event
const eventResult = await client.sendEvent('my-instance', 'next', {
  payload: { key: 'value' },
});
if (eventResult.ok) {
  console.log('New configuration:', eventResult.data.configuration);
}
```

---

## API Reference

### `EngineClient`

```typescript
class EngineClient {
  constructor(baseUrl: string, config?: EngineConfig);
}
```

| Parameter | Type                      | Description                                                                                  |
| --------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `baseUrl` | `string`                  | Base URL of the engine server (e.g. `http://localhost:4000`). Trailing slashes are stripped. |
| `config`  | `EngineConfig` (optional) | Reserved for future configuration options.                                                   |

### Methods

All methods return `Result<T>` — a discriminated union for consistent error handling.

| Method                                                    | HTTP     | Endpoint                | Returns                        |
| --------------------------------------------------------- | -------- | ----------------------- | ------------------------------ |
| `health()`                                                | `GET`    | `/healthz`              | `Result<HealthStatus>`         |
| `createStatechart(document, instanceId?)`                 | `POST`   | `/statecharts`          | `Result<InstanceSnapshot>`     |
| `createInstance(graphId, instanceId?, initialDatamodel?)` | `POST`   | `/instances`            | `Result<InstanceSnapshot>`     |
| `getInstance(instanceId)`                                 | `GET`    | `/instances/:id`        | `Result<InstanceSnapshot>`     |
| `sendEvent(instanceId, eventName, data?)`                 | `POST`   | `/instances/:id/events` | `Result<InstanceSnapshot>`     |
| `deleteInstance(instanceId)`                              | `DELETE` | `/instances/:id`        | `Result<{ deleted: boolean }>` |
| `listInstances()`                                         | `GET`    | `/instances`            | `Result<InstanceSnapshot[]>`   |

### `Result<T>` Pattern

```typescript
type Result<T> =
  | { ok: true; data: T } // Success
  | { ok: false; error: string }; // Error

// Usage:
const result = await client.health();
if (result.ok) {
  console.log(result.data.status); // narrowed to HealthStatus
} else {
  console.error(result.error); // narrowed to string
}
```

### Key Types

```typescript
interface InstanceSnapshot {
  instance_id: string;
  configuration: string[];
  datamodel: Record<string, unknown> | null;
  done: boolean;
  execution_status: "idle" | "running" | "completed" | "error";
  active_states: StateInfo[];
}

interface StateInfo {
  id: string;
  status: "running" | "completed" | "error";
  type: "atomic" | "compound" | "parallel" | "final" | "initial";
}

interface HealthStatus {
  status: string;
}
```

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Format and lint
npm run format
npm run lint
npm run check
```

### Build Output

The build script (`scripts/build.mjs`) produces:

| File              | Format                    |
| ----------------- | ------------------------- |
| `dist/index.js`   | CommonJS (browser bundle) |
| `dist/index.mjs`  | ESM (browser bundle)      |
| `dist/index.d.ts` | TypeScript declarations   |

### Pre-commit Hooks

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for git hooks:

- **Pre-commit**: Biome format + lint on staged files
- **Pre-push**: Full Biome check + TypeScript type-check

Install hooks:

```bash
npm run hooks:install
```

---

## Related Projects

| Repository                                                             | Role                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| [scxml-http-server](https://github.com/PranayPant/scxml-http-server)   | Elixir HTTP engine that this client wraps             |
| [scxml-orchestrator](https://github.com/PranayPant/scxml-orchestrator) | Core SCXML runtime engine                             |
| [scxml-parser](https://github.com/PranayPant/scxml-parser)             | SCXML XML/JSON parser                                 |
| [scxml-ui-editor](https://github.com/PranayPant/scxml-ui-editor)       | Visual SCXML editor (primary consumer of this client) |

---

## License

MIT
