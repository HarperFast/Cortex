# Integration Guide

This document describes how to integrate and use the `@harperfast/cortex-client` with other Harper systems.

## Architecture

The cortex-client is a **standalone HTTP-only TypeScript library** designed to be platform-agnostic and dependency-minimal:

```
┌─────────────────────────────────────┐
│  Application (Node.js, Browser)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  @harperfast/cortex-client          │
│  - CortexClient                     │
│  - Memory namespace                 │
│  - Synapse namespace                │
│  - TypeScript types                 │
└──────────────┬──────────────────────┘
               │ (native fetch)
┌──────────────▼──────────────────────┐
│  Cortex REST API                    │
│  - Memory CRUD, Search, etc.        │
│  - Synapse CRUD, Ingest, Emit       │
└─────────────────────────────────────┘
```

### Zero Dependencies

The cortex-client uses only native browser/Node APIs:

- **fetch** for HTTP requests (Node 18+)
- **JSON** for serialization

No external packages needed. This makes it lightweight and vendorable.

### Dual Module Support

The library exports both **ESM** and **CommonJS**:

```typescript
// ESM
import { CortexClient } from '@harperfast/cortex-client';

// CommonJS
const { CortexClient } = require('@harperfast/cortex-client');
```

## Use Cases

### 1. Direct Integration (Node.js / Edge)

Use cortex-client directly in your backend or edge function:

```typescript
import { CortexClient } from '@harperfast/cortex-client';

const cortex = new CortexClient({
	instanceUrl: process.env.CORTEX_URL,
	token: process.env.CORTEX_TOKEN,
});

// Ingest team knowledge on Slack events
app.event('message', async ({ event }) => {
	await cortex.memory.store({
		text: event.text,
		source: 'slack',
		channelId: event.channel,
	});
});

// Retrieve context for AI responses
const context = await cortex.memory.search(userQuery, { limit: 5 });
```

### 2. LangChain Integration

Build on `cortex-client` with **@harperfast/cortex-langchain** for LangChain-native retrieval:

```typescript
import { CortexClient } from '@harperfast/cortex-client';
import {
	CortexMemoryRetriever,
	CortexSynapseRetriever,
} from '@harperfast/cortex-langchain';
import { RetrievalQA } from 'langchain/chains';

const cortex = new CortexClient({ instanceUrl: '...' });
const memoryRetriever = new CortexMemoryRetriever(cortex);

const qa = RetrievalQA.fromLLMAndRetriever(llm, memoryRetriever);
const answer = await qa.call({ query: 'What caching strategy do we use?' });
```

### 3. OpenClaw Integration

Build agentic workflows with **@harperfast/openclaw** that use Cortex:

```typescript
import { CortexClient } from '@harperfast/cortex-client';
import { ClawAgent } from '@harperfast/openclaw';

const cortex = new CortexClient({ instanceUrl: '...' });
const agent = new ClawAgent({ cortex });

// Agents automatically:
// - Retrieve context from Memory
// - Persist reasoning to Synapse
// - Emit context for downstream tools
const result = await agent.think('Design a new API endpoint');
```

### 4. Cross-Tool Context Sync

Use Synapse for seamless context exchange across IDEs:

```typescript
// In Claude Code
const cortex = new CortexClient({ instanceUrl: '...' });
const entries = await cortex.synapse.ingest({
	source: 'claude_code',
	content: fs.readFileSync('CLAUDE.md', 'utf8'),
	projectId: 'my-project',
});

// Emit for Cursor
const emitted = await cortex.synapse.emit({
	target: 'cursor',
	projectId: 'my-project',
	types: ['intent', 'constraint'],
});

// Write .mdc files to Cursor's .cursor directory
emitted.output.files.forEach(file => {
	fs.writeFileSync(`.cursor/${file.filename}`, file.content);
});
```

## Hosting Cortex

Cortex runs on **Harper Cloud** or self-hosted Harper instances:

```bash
# Self-hosted Harper with Cortex resources
docker run -e HARPER_DB=cortex-instance \
           -e ANTHROPIC_API_KEY=your-key \
           harper-server
```

The cortex-client connects via REST—no SDK coupling needed.

## Error Handling

All errors inherit from `CortexError`:

```typescript
import { CortexError } from '@harperfast/cortex-client';

try {
	const results = await cortex.memory.search('...');
} catch (err) {
	if (err instanceof CortexError) {
		console.error(`HTTP ${err.status}: ${err.message}`);
		if (err.status === 401) {
			// Re-authenticate
		}
	}
}
```

## TypeScript

Full TypeScript support with strict types:

```typescript
import type {
	CortexClientConfig,
	MemoryRecord,
	MemorySearchResponse,
	SynapseEmitResponse,
	SynapseEntryRecord,
} from '@harperfast/cortex-client';

const config: CortexClientConfig = {
	instanceUrl: 'https://cortex.example.com',
	token: 'xyz',
};

const results: MemorySearchResponse = await cortex.memory.search('...');
```

## Testing

Mock cortex-client by stubbing global `fetch`:

```typescript
import { vi } from 'vitest';
import { CortexClient } from '@harperfast/cortex-client';

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => ({ results: [...], count: 1 }),
}));

const cortex = new CortexClient({ instanceUrl: 'http://localhost' });
const result = await cortex.memory.search('test');
```

## Performance

- **No runtime overhead**: Pure HTTP client, no SDK initialization
- **Minimal bundle**: ~5KB minified + gzipped (ESM)
- **Streaming support**: Use Server-Sent Events for long-running searches (Cortex API v2+)
- **Caching**: Integrate with your HTTP client's cache layer (e.g., axios, undici)

## Security

- **Bearer tokens**: Optional per-instance auth
- **HTTPS only**: Use `https://` URLs in production
- **No embedding storage**: Embeddings generated server-side, stripped from responses
- **No session cookies**: Stateless HTTP auth

## Roadmap

- [ ] Streaming responses for large search results
- [ ] Batch query optimization
- [ ] Built-in request deduplication
- [ ] Response caching strategies
- [ ] WebSocket support for real-time Synapse updates

## Contributing

To extend cortex-client:

1. Add new methods to `Memory` or `Synapse` classes
2. Update types in `types.ts`
3. Add tests in `.test.ts` files
4. Run `npm run typecheck` and `npm test`
5. Update `README.md` with API examples

## License

MIT
