# Cortex — Agent Guide

This file provides AI coding agents with the knowledge needed to understand, modify, and extend Cortex autonomously. Cortex is the memory layer for AI agents — persistent, distributed, open source, built on Harper Fabric.

## Architecture

```
AI Agents (Claude, Cursor, Windsurf, OpenClaw, LangChain)
    |
    +-- MCP protocol --> cortex-mcp-server (auth, safety, rate limiting)
    +-- HTTP / SDK ----> cortex-client
    +-- Plugin hooks --> openclaw-memory (auto-recall / auto-capture)
          |
    [Cortex Core on Harper Fabric]
    Memory table (HNSW) + SynapseEntry table (HNSW)
    classify -> embed (ONNX, local) -> store
    MemorySearch | REST | MQTT real-time
```

## Monorepo Layout

```
packages/
  cortex/                  # Harper Fabric app (JavaScript)
    schema.graphql         #   Table definitions with HNSW vector indexes
    config.yaml            #   Harper app config
    resources.js           #   Barrel re-export (all resource classes)
    resources/             #   Modular resource implementations
      memory.js            #     MemoryTable, MemorySearch, MemoryStore, etc.
      synapse.js           #     SynapseEntry, SynapseSearch, SynapseIngest, etc.
      slack-webhook.js     #     SlackWebhook (Slack Events API ingestion)
      shared.js            #     generateEmbedding, log, constants
      classification-provider.js  # Provider-agnostic LLM classification
    bin/synapse.js         #   Synapse CLI
  cortex-client/           # TypeScript HTTP SDK
    src/client.ts          #   Client core
    src/memory.ts          #   Memory API methods
    src/synapse.ts         #   Synapse API methods
  openclaw-memory/         # TypeScript OpenClaw plugin
    src/lifecycle.ts       #   auto-recall + auto-capture hooks
    src/safety.ts          #   Content safety filtering
  cortex-mcp-server/       # TypeScript MCP server
    src/index.ts           #   Server entry (stdio + HTTP transport)
    src/tools/             #   MCP tool implementations
    src/auth.ts            #   JWT/JWKS auth
    harper/                #   Self-contained Harper deployment
```

## Code Conventions

- **ES modules** exclusively (import/export, no CommonJS)
- **Tabs** for indentation, **single quotes**, **always braces** (enforced by dprint)
- **No `@export`** on tables extended in resources.js — the resource class IS the API
- **Vitest** for all tests (workspace mode, run with `npm test`)
- **oxlint** for linting, **dprint** for formatting
- Shared devDependencies at root, package-specific deps in each package
- Conventional commits for automated semantic versioning

## Harper Fabric Patterns

### Schema (schema.graphql)

Tables use GraphQL directives:

- `@table` — declares a Harper table
- `@export` — auto-generates REST/WebSocket APIs (omit for tables extended in resources.js)
- `@primaryKey` — primary key field
- `@indexed` — standard query index
- `@indexed(type: "HNSW")` — HNSW vector index for similarity search (cosine distance)
- `@relationship(from: "field")` / `@relationship(to: "field")` — table relationships

### Resource Classes

**Table extension** — extends auto-generated table, overrides HTTP methods:

```javascript
import { tables } from 'harperdb';
class MemoryTable extends tables.Memory {
	async post(data) {/* validate, transform, then super.post() */}
}
```

**Custom resource** — standalone endpoint, class name = URL path:

```javascript
import { Resource } from 'harperdb';
class MemorySearch extends Resource {
	async post(data) {/* custom logic, return JSON */}
}
```

### Vector Search

```javascript
for await (
	const result of Table.search({
		sort: { attribute: 'embedding', value: vector, algorithm: 'HNSW' },
		conditions: [{
			attribute: 'embedding',
			comparator: 'lt',
			value: threshold,
		}],
		limit: topK,
	})
) { /* ranked results */ }
```

### Memory Write Pipeline

All ingestion follows: **receive -> classify -> embed -> store**

1. Validate and authenticate
2. `classifyMessage(text)` — LLM or keyword fallback -> `{ category, entities, summary }`
3. `generateEmbedding(text)` — local ONNX, 384-dim vector
4. `Memory.put(record)` — stored with HNSW index

### Adding New Webhook Sources

Create a Resource class in `resources/`, verify body-level tokens (no HTTP headers available in Harper Resources), classify + embed + store, export from `resources.js`. See `slack-webhook.js` for reference.

### Config (config.yaml)

Points Harper to `.env`, enables REST, loads `schema.graphql`, and mounts `resources.js` as the resource entry point.

## Development Commands

```bash
npm ci                    # Install dependencies
npm test                  # Run all tests
npm run build             # Build TypeScript packages
npm run format:check      # Check formatting (dprint)
npm run format:fix        # Fix formatting
npm run lint:check        # Lint (oxlint)
npm run dev -w packages/cortex              # Dev server on :9926
npm run deploy -w packages/cortex           # Deploy to Fabric
```

## Extending Cortex

This repo is designed to be cloned and customized. Common extension points:

1. **New ingestion source** — add a Resource class in `packages/cortex/resources/` (GitHub, Discord, Linear, etc.)
2. **New classification provider** — add a provider in `classification-provider.js`
3. **New embedding model** — swap the model in `shared.js` (update dimensions in schema)
4. **New MCP tools** — add tool files in `packages/cortex-mcp-server/src/tools/`
5. **New client methods** — extend `packages/cortex-client/src/`
6. **Schema changes** — modify `schema.graphql`, ensure no `@export` on extended tables
