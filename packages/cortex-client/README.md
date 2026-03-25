# @harperfast/cortex-client

Lightweight HTTP-only TypeScript client for Harper Cortex. No Harper runtime required, no embeddings—just fetch + auth.

Cortex is a universal memory and context broker that stores team knowledge from Slack, emails, documents, or APIs, and syndicates context across Claude Code, Cursor, Windsurf, and Copilot.

## Install

```bash
npm install @harperfast/cortex-client
```

Requires Node 18+ or a browser environment with native `fetch`.

## Quick Start

```typescript
import { CortexClient } from '@harperfast/cortex-client';

const cortex = new CortexClient({
	instanceUrl: 'https://my-instance.harpercloud.com',
	token: 'optional-bearer-token', // leave empty for public instances
	schema: 'data', // default
});

// Search memories
const results = await cortex.memory.search('caching strategy', {
	limit: 5,
	filters: { source: 'slack' },
});

// Store a memory
const memory = await cortex.memory.store({
	text: 'We chose Redis for caching',
	source: 'slack',
	classification: 'decision',
});

// Ingest Synapse context
const synapse = await cortex.synapse.ingest({
	source: 'claude_code',
	content: '## Decision\nUse Redis\n\n## Constraint\nAlways use transactions',
	projectId: 'my-project',
});

// Emit context for a tool
const emitted = await cortex.synapse.emit({
	target: 'cursor',
	projectId: 'my-project',
	types: ['intent', 'constraint'],
});
```

## Memory API

### search(query, options?)

Semantic search across memories. Query embedding is generated server-side.

```typescript
const results = await cortex.memory.search('caching decision', {
	limit: 5,
	filters: { classification: 'decision', source: 'slack' },
});

// Results include both raw distance and normalized similarity (0-1)
results.results.forEach(r => {
	console.log(r.rawText, 'similarity:', r.similarity);
});
```

**Parameters:**

- `query` (string) — Text to search for
- `options.limit?` (number, 1–100) — Max results, default 10
- `options.filters?` (object) — Attribute filters on indexed fields: `source`, `sourceType`, `channelId`, `authorId`, `classification`, `agentId` (for multi-agent namespace isolation)

**Returns:** `MemorySearchResponse` with `results` and `count`.

---

### store(record)

Store a memory record. Server-side embedding generation is optional.

```typescript
const memory = await cortex.memory.store({
	text: 'We chose Redis for caching',
	source: 'slack',
	sourceType: 'message',
	channelId: 'C123',
	channelName: 'engineering',
	authorId: 'U456',
	authorName: 'alice',
	classification: 'decision',
	entities: {
		technologies: ['Redis'],
		topics: ['caching'],
	},
	summary: 'Redis chosen for caching',
	metadata: { event_id: 'Evt123' },
});
```

**Parameters:**

- `record.text` (string, required) — Memory content
- `record.source` (string) — Source system: `slack`, `email`, `document`, `api`
- `record.sourceType` (string) — Refinement: `message`, `thread_reply`, `email`, `doc_page`
- `record.classification` (string) — Category: `decision`, `action_item`, `knowledge`, `question`, `announcement`, `discussion`, `reference`, `status_update`, `feedback`
- Other fields are optional and free-form

**Returns:** `MemoryRecord` with server-assigned `id` and `embedding` stripped.

---

### get(id)

Retrieve a memory by ID.

```typescript
const memory = await cortex.memory.get('memory-abc123');
```

---

### delete(id)

Delete a memory by ID.

```typescript
await cortex.memory.delete('memory-abc123');
```

---

### count(request?)

Count memories matching optional filters.

```typescript
const { count } = await cortex.memory.count({
	filters: { source: 'slack' },
});
```

---

### vectorSearch(vector, options?)

Search by raw embedding vector. Use this when you have a pre-computed embedding.

**Requires Cortex with VectorSearch resource deployed.**

```typescript
const results = await cortex.memory.vectorSearch(
  [0.1, 0.2, 0.3, ...], // your embedding
  { limit: 5, filter: { source: 'slack' } }
);
```

---

### bulkStore(records) / batchUpsert(records)

Bulk insert or update memory records. The method `batchUpsert()` is retained for backward compatibility, but `bulkStore()` is the current name.

Currently uses sequential PUTs as a polyfill until native BatchUpsert ships.

```typescript
const result = await cortex.memory.bulkStore([
	{ rawText: 'Decision 1', source: 'slack' },
	{ rawText: 'Decision 2', source: 'api' },
]);

console.log(`Upserted: ${result.upserted}, Failed: ${result.failed}`);
```

---

## Synapse API

Synapse is a universal context broker. Ingest context from any IDE/editor format, store it once, emit it for any target.

### search(query, request)

Semantic search across Synapse entries in a project.

```typescript
const results = await cortex.synapse.search('architecture', {
	projectId: 'my-project',
	limit: 5,
	filters: { type: 'intent' },
});
```

**Parameters:**

- `query` (string) — Search text
- `request.projectId` (string, required) — Project identifier
- `request.limit?` (number) — Max results
- `request.filters?` (object) — Optional filters: `type` (`intent`, `constraint`, `artifact`, `history`), `source` (`claude_code`, `cursor`, `windsurf`, `copilot`, `manual`, `slack`), `status`

**Returns:** `SynapseSearchResponse` with `results` and `count`.

---

### ingest(request)

Ingest context from a tool-native format. Parses and classifies server-side.

```typescript
const result = await cortex.synapse.ingest({
	source: 'claude_code',
	content: `
## Decision
Use microservices for scalability

## Constraint
All services must use async queues
  `.trim(),
	projectId: 'my-project',
	references: ['doc-123', 'adr-456'],
});

console.log(`Stored: ${result.count} entries`);
result.stored.forEach(e => console.log(e.type, ':', e.summary));
```

**Parameters:**

- `source` (string, required) — Format: `claude_code`, `cursor`, `windsurf`, `copilot`, `manual`, `slack`
- `content` (string, required) — File or text content
- `projectId` (string, required) — Project identifier
- `parentId?` (string) — Parent entry ID for hierarchies
- `references?` (string[]) — Related document/issue IDs

**Parsing:**

- `claude_code` — Splits on `## Heading` sections; each becomes an entry
- `cursor` — Extracts YAML frontmatter + markdown body
- `windsurf` — Same as Claude Code
- `copilot` — Ingests as single entry
- `slack`, `manual` — Ingests as single entry

**Returns:** `SynapseIngestResponse` with `stored` and `count`.

---

### emit(request)

Emit Synapse entries in a target tool's native format.

```typescript
// Emit for Cursor (returns .mdc rule files)
const result = await cortex.synapse.emit({
	target: 'cursor',
	projectId: 'my-project',
	types: ['intent', 'constraint'],
	limit: 50,
});

if (
	typeof result.output === 'object' && result.output.format === 'cursor_rules'
) {
	result.output.files.forEach(file => {
		console.log(`Write ${file.filename}:\n${file.content}`);
	});
}

// Emit for Claude Code (returns markdown string)
const claude = await cortex.synapse.emit({
	target: 'claude_code',
	projectId: 'my-project',
});

console.log(claude.output); // markdown string
```

**Parameters:**

- `target` (string, required) — Output format: `claude_code` (markdown), `cursor` (.mdc files), `windsurf` (.md files), `copilot` (markdown), `markdown` (generic)
- `projectId` (string, required) — Project identifier
- `types?` (string[]) — Filter by entry types: `intent`, `constraint`, `artifact`, `history`
- `limit?` (number) — Max entries to emit, default 50

**Output formats:**

- `claude_code` → markdown string
- `cursor` → object with `{ format, files: [...] }`
- `windsurf` → object with `{ format, files: [...] }`
- `copilot` → markdown string
- `markdown` → markdown string

**Returns:** `SynapseEmitResponse` with `target`, `projectId`, `entryCount`, and `output`.

---

### get(id)

Retrieve a Synapse entry by ID.

```typescript
const entry = await cortex.synapse.get('entry-abc123');
console.log(entry.type, ':', entry.content);
```

---

### delete(id)

Delete a Synapse entry by ID.

```typescript
await cortex.synapse.delete('entry-abc123');
```

---

## Content Safety

All content stored or retrieved through the client is automatically protected by the Cortex server. Content safety measures include injection detection, pattern-based sanitization, and Unicode normalization, applied at the server level for both store and retrieve operations. No client-side sanitization is needed.

---

## Configuration

```typescript
interface CortexClientConfig {
	instanceUrl: string; // required: https://my-instance.harpercloud.com
	token?: string; // optional: Bearer token for auth
	schema?: string; // default: empty string (no prefix) for Fabric deployments
}
```

### Connection Config

For **Fabric deployments** (recommended), leave `schema` empty or omit it entirely. This tells Cortex to use the default schema without a prefix.

For **non-Fabric Harper instances** that use schema routing, set `schema: "data"` to prepend the schema name to resource paths.

**Port Guidance**

- Use **9926** for data API (default Harper port)
- Do not use 443 (HTTPS default) or 9925 (deprecated)

### Production Deployment

**Always use HTTPS in production.** The `token` credential is sent as a plain HTTP header on every request. Over an unencrypted connection, any network observer can read it and gain full access to the memory store.

**Harper Fabric** — TLS is provided by default. Port 9926 is TLS-enabled; no extra configuration required.

**Self-hosted Harper** — Verify that TLS termination is configured (via a reverse proxy such as nginx or Caddy, or Harper's built-in TLS). Do not expose port 9926 directly over HTTP in production.

```typescript
// ✅ correct
const cortex = new CortexClient({
	instanceUrl: 'https://my-instance.harpercloud.com:9926',
	token: 'Basic dXNlcjpwYXNz',
});

// ❌ never in production — token is transmitted in plaintext
const cortex = new CortexClient({
	instanceUrl: 'http://my-instance.harpercloud.com:9926',
	token: 'Basic dXNlcjpwYXNz',
});
```

---

## Error Handling

All errors are instances of `CortexError`, which extends Error and includes optional `status` and `response` fields.

```typescript
import { CortexError } from '@harperfast/cortex-client';

try {
	const result = await cortex.memory.search('...');
} catch (err) {
	if (err instanceof CortexError) {
		console.error(`HTTP ${err.status}:`, err.message);
		console.error('Response:', err.response);
	}
}
```

---

## Use with LangChain

The Cortex client pairs with **@harperfast/cortex-langchain**, which adds LangChain integrations for retrieval chains, QA, and memory management.

```typescript
import { CortexClient } from '@harperfast/cortex-client';
import { CortexMemoryRetriever } from '@harperfast/cortex-langchain';

const cortex = new CortexClient({ instanceUrl: '...' });
const retriever = new CortexMemoryRetriever(cortex);

// Use in LangChain chains
const chain = someChain.with({ retriever });
```

See `@harperfast/cortex-langchain` for full documentation.

---

## Use with OpenClaw

The Cortex client integrates with **@harperfast/openclaw**, which orchestrates agentic reasoning with Cortex memory and Synapse context.

```typescript
import { CortexClient } from '@harperfast/cortex-client';
import { ClawAgent } from '@harperfast/openclaw';

const cortex = new CortexClient({ instanceUrl: '...' });
const agent = new ClawAgent({ cortex });

// Agents automatically persist reasoning to Synapse
// and retrieve context from Memory during reasoning
const result = await agent.think('Design a caching strategy');
```

See `@harperfast/openclaw` for full documentation.

---

## Types

All TypeScript types are exported:

```typescript
import type {
	MemoryRecord,
	MemorySearchResponse,
	MemorySearchResult,
	SynapseEntryRecord,
	SynapseSearchResponse,
	SynapseSearchResult,
} from '@harperfast/cortex-client';
```

---

## Testing

Run tests with:

```bash
npm test
npm run test:watch
npm run test:coverage
```

Tests use Vitest with mocked `fetch` to avoid network calls.

---

## Version Compatibility

| cortex-client | Node.js | Harper | Cortex Features           |
| ------------- | ------- | ------ | ------------------------- |
| 2.0+          | 18+     | Fabric | VectorSearch, bulkStore   |
| 1.x           | 18+     | Fabric | MemorySearch, MemoryStore |

---

## License

MIT
