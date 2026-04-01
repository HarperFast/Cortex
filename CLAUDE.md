# Cortex Monorepo

The memory layer for AI agents. Persistent, distributed, open source. Built on Harper Fabric.

## Monorepo Structure

This is an npm workspaces monorepo with 4 packages:

| Package                         | Path                          | Language   | Description                                                             |
| ------------------------------- | ----------------------------- | ---------- | ----------------------------------------------------------------------- |
| `@harperfast/cortex`            | `packages/cortex/`            | JavaScript | Harper Fabric app — Memory + Synapse tables, classification, embeddings |
| `@harperfast/cortex-client`     | `packages/cortex-client/`     | TypeScript | Lightweight HTTP SDK for Cortex                                         |
| `@harperfast/openclaw-memory`   | `packages/openclaw-memory/`   | TypeScript | OpenClaw plugin — auto-recall/capture lifecycle hooks                   |
| `@harperfast/cortex-mcp-server` | `packages/cortex-mcp-server/` | TypeScript | MCP server — bridges AI agents to Cortex                                |

## Tech Stack

- **Runtime**: Harper Fabric (Node.js-based, ES modules)
- **Node**: v22+ (see `.nvmrc`)
- **Database**: Harper Fabric with HNSW vector indexing (cosine distance)
- **Classification**: Provider-agnostic (Anthropic, OpenAI, Google, Ollama, local keyword fallback)
- **Embeddings**: `@huggingface/transformers` with `all-MiniLM-L6-v2` (384-dim, ONNX, runs locally)
- **Tests**: Vitest (workspace mode)
- **Formatting**: dprint (tabs, single quotes, always braces)
- **Linting**: oxlint

## Development

```bash
npm ci                    # Install all workspace dependencies
npm test                  # Run all tests across all packages
npm run build             # Build all TypeScript packages
npm run format:check      # Check formatting (dprint)
npm run format:fix        # Auto-fix formatting
npm run lint:check        # Lint all packages (oxlint)
```

### Package-specific commands

```bash
# Cortex Core (Harper Fabric app)
npm run dev -w packages/cortex          # Start Harper dev server on port 9926
npm run deploy -w packages/cortex       # Deploy to Harper Fabric

# cortex-mcp-server
npm run dev -w packages/cortex-mcp-server   # Start MCP server with HTTP transport
```

## Key Files

### packages/cortex/ (Harper Fabric app)

- `schema.graphql` — Memory + SynapseEntry tables with HNSW vector indexes
- `config.yaml` — Harper app config (loadEnv, REST, schema, resources)
- `resources/` — Modular resource classes:
  - `memory.js` — MemoryTable, MemorySearch, MemoryStore, MemoryCount, VectorSearch, BatchUpsert
  - `synapse.js` — SynapseEntry, SynapseSearch, SynapseIngest, SynapseEmit
  - `slack-webhook.js` — SlackWebhook (Slack Events API ingestion)
  - `shared.js` — generateEmbedding, EMBEDDING_MODEL, log
  - `classification-provider.js` — Provider-agnostic LLM classification
- `resources.js` — Barrel re-export for all resource classes
- `bin/synapse.js` — Synapse CLI
- `.env.example` — All environment variables documented

### packages/cortex-client/

- `src/client.ts` — HTTP client core
- `src/memory.ts` — Memory API (search, store, recall, forget, count, vectorSearch, batchUpsert)
- `src/synapse.ts` — Synapse API (search, ingest, emit, delete)

### packages/openclaw-memory/

- `src/lifecycle.ts` — auto-recall (before turn) + auto-capture (after turn) hooks
- `src/safety.ts` — Content safety filtering
- `openclaw.plugin.json` — Plugin manifest

### packages/cortex-mcp-server/

- `src/index.ts` — MCP server (stdio + HTTP transport)
- `src/tools/` — Tool implementations (memory, synapse, admin, audit)
- `src/auth.ts` — JWT/JWKS authentication
- `src/quota.ts` — Per-agent storage quota enforcement
- `harper/` — Harper Custom Resource deployment (self-contained)

## Harper Fabric Patterns

These patterns apply when modifying `packages/cortex/` (the Harper Fabric app).

### Schema Design (schema.graphql)

Tables are defined with GraphQL directives:

- `@table` — declares a Harper table
- `@export` — auto-generates REST + WebSocket APIs (do NOT use on tables extended in resources.js)
- `@primaryKey` — designates the primary key field
- `@indexed` — adds a standard index for query performance
- `@indexed(type: "HNSW")` — adds HNSW vector index for similarity search
- `@relationship(from: "field")` / `@relationship(to: "field")` — defines relationships

Both Memory and SynapseEntry use `embedding: [Float] @indexed(type: "HNSW")` for cosine-distance vector search.

### Resource Classes

Two patterns for extending Harper:

**1. Table extension** (used by Memory, SynapseEntry):

```javascript
import { tables } from 'harperdb';
class MemoryTable extends tables.Memory {
	// Override get/post/put/patch/delete
	// Call super methods to preserve default behavior
}
```

Tables extended this way must NOT have `@export` in the schema — the resource class IS the API.

**2. Custom resource** (used by MemorySearch, SlackWebhook, etc.):

```javascript
import { Resource } from 'harperdb';
class MemorySearch extends Resource {
	async post(data) {/* custom logic */}
}
```

Class name = URL path. `MemorySearch` serves at `/MemorySearch/`.

### Vector Search Pattern

```javascript
for await (
	const result of Memory.search({
		sort: { attribute: 'embedding', value: queryEmbedding, algorithm: 'HNSW' },
		conditions: [{
			attribute: 'embedding',
			comparator: 'lt',
			value: distanceThreshold,
		}],
		limit: topK,
	})
) {
	// result has similarity distance in sort metadata
}
```

### Config (config.yaml)

```yaml
loadEnv:
  files: '.env'
rest: true
graphqlSchema:
  files: 'schema.graphql'
jsResource:
  files: 'resources.js'
  resources: '*'
```

### Write Path (Memory Pipeline)

All ingestion (Slack, API, MCP) follows: **receive -> classify -> embed -> store**

1. Validate/authenticate the request
2. `classifyMessage(text)` — returns `{ category, entities, summary }` via LLM or keyword fallback
3. `generateEmbedding(text)` — returns 384-dim Float32Array via local ONNX
4. `Memory.put(record)` — stores with vector index for later similarity search

### Adding a New Webhook Source

Create a new Resource class in `resources/`:

```javascript
import { Resource, tables } from 'harperdb';
import { classifyMessage } from './memory.js';
import { generateEmbedding, log } from './shared.js';
const { Memory } = tables;

export class MyWebhook extends Resource {
	async post(data) {
		// 1. Verify authenticity (body-level token — no HTTP headers in Resources)
		// 2. Extract text + metadata from payload
		// 3. Classify and embed in parallel:
		const [classification, embedding] = await Promise.all([
			classifyMessage(text),
			generateEmbedding(text),
		]);
		// 4. Store:
		await Memory.put({
			rawText: text,
			source: 'my-platform',
			embedding,
			...classification,
		});
	}
}
```

Export from `resources.js` and it's live at `/MyWebhook/`.

**Important**: Harper Resource `post()` only receives parsed JSON body — no HTTP headers. Use body-level tokens for webhook verification.

## Conventions

- ES module syntax everywhere (import/export)
- No `@export` on tables that are extended in resources.js
- Tabs for indentation (enforced by dprint)
- Single quotes (enforced by dprint)
- Always use braces for control flow (enforced by dprint)
- Shared TypeScript config: `tsconfig.base.json` at root, extended by each TS package
- Shared devDependencies (vitest, typescript, dprint, oxlint) at root
- Package-specific dependencies stay in each package
- Conventional commits for release automation

## Agent Skills

Skills from `harperfast/skills` are tracked in `packages/cortex/skills-lock.json`. Apply `harper-best-practices` when modifying:

- `schema.graphql` — table definitions, indexes, relationships
- `resources.js` or `resources/*.js` — resource classes, table extensions
- `config.yaml` — Harper app configuration

The full skill rules cover: schema design, automatic APIs, vector indexing, custom resources, table extensions, caching, real-time apps, authentication, blob handling, TypeScript type stripping, and Fabric deployment.

## Deployment

```bash
# Set in .env: CLI_TARGET, CLI_TARGET_USERNAME, CLI_TARGET_PASSWORD
npm run deploy -w packages/cortex    # Deploy to Harper Fabric
```

CI/CD runs on push: format check -> lint -> build -> test. Releases via multi-semantic-release on merge to main.
