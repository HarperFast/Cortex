# Harper Vector Memory System

A persistent, agent-agnostic AI memory system powered by [Harper Fabric](https://harper.fast). Clone, configure your API keys, deploy, and give all your AI tools a shared brain.

## The Problem

When you use Claude, ChatGPT, or Cursor, your conversation history and learned context are siloed inside each platform. Switch tools, and your AI gets amnesia. This is **context rot**.

## The Solution

Deploy a centralized vector database on Harper Fabric and connect it to your AI agents via [MCP (Model Context Protocol)](https://modelcontextprotocol.io). All your tools read and write to the same unified memory pool.

```
Slack Messages ──webhook──▶ Harper Fabric ◀──MCP──▶ Claude Desktop
                           (vector DB)              (or Cursor, etc.)
```

## Architecture

```
┌─────────────┐     POST     ┌──────────────────────────────────────┐
│   Slack      │ ──────────▶ │  Harper Fabric Cluster               │
│   Events API │             │                                      │
└─────────────┘             │  ┌─────────────┐  ┌───────────────┐  │
                             │  │ SlackWebhook │  │ MemorySearch  │  │
                             │  │ (classify +  │  │ (hybrid       │  │
                             │  │  embed +     │  │  vector +     │  │
                             │  │  store)      │  │  tag search)  │  │
                             │  └──────┬───────┘  └───────────────┘  │
                             │         │                              │
                             │  ┌──────▼───────────────────────────┐ │
                             │  │ Memory Table (HNSW vector index) │ │
                             │  └──────────────────────────────────┘ │
                             │                                      │
                             │  ┌──────────────────────────────────┐ │
                             │  │ MCP Server (/mcp endpoint)       │ │
                             │  └──────────────┬───────────────────┘ │
                             └─────────────────┼────────────────────┘
                                               │
                              ┌─────────────────▼──────────────────┐
                              │  Claude Desktop / Cursor / Any     │
                              │  MCP-compliant AI client           │
                              └────────────────────────────────────┘
```

## Prerequisites

- **Node.js** 20+ (recommended: 24 LTS)
- **Harper CLI**: `npm install -g harperdb`
- **API Keys**:
  - [Anthropic Claude](https://console.anthropic.com/) (message classification)
  - [Voyage AI](https://dash.voyageai.com/) (vector embeddings)
  - [Slack App](https://api.slack.com/apps) (webhook ingestion)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/HarperVectorMemorySystem.git
cd HarperVectorMemorySystem
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your API keys and cluster credentials
```

See [Environment Variables](#environment-variables) for details on each variable.

### 3. Create a Harper Fabric cluster

1. Sign up at [harper.fast/start](https://harper.fast/start) (free tier available)
2. Create an organization
3. Create a cluster
4. Copy your cluster URL, username, and password to `.env`

### 4. Run locally

```bash
npm run dev
```

This starts Harper locally on port 9926. For Slack webhook testing during local development, use a tunneling tool like ngrok:

```bash
ngrok http 9926
```

### 5. Set up Slack

See [docs/slack-app-setup.md](docs/slack-app-setup.md) for the full guide.

### 6. Deploy to Harper Fabric

```bash
npm run deploy
```

### 7. Connect Claude Desktop via MCP

See [docs/mcp-setup.md](docs/mcp-setup.md) for configuration instructions.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLI_TARGET` | Yes | Harper Fabric cluster URL (e.g., `https://cluster.org.harperfabric.com`) |
| `CLI_TARGET_USERNAME` | Yes | Harper cluster admin username |
| `CLI_TARGET_PASSWORD` | Yes | Harper cluster admin password |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude (message classification) |
| `VOYAGE_API_KEY` | Yes | Voyage AI API key (vector embedding generation) |
| `SLACK_SIGNING_SECRET` | Yes | Slack app signing secret (webhook verification) |
| `SLACK_BOT_TOKEN` | Yes | Slack bot user OAuth token (`xoxb-...`) |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/SlackWebhook` | POST | Receives Slack Events API payloads. Classifies, embeds, and stores messages. |
| `/MemorySearch` | POST | Semantic search. Send `{ "query": "...", "limit": 10, "filters": {} }` |
| `/Memory/` | GET | List all memories (with pagination) |
| `/Memory/{id}` | GET | Get a single memory by ID |

### MemorySearch Request

```json
{
  "query": "Why did we change the caching strategy?",
  "limit": 10,
  "filters": {
    "classification": "decision",
    "source": "slack",
    "channelId": "C0123456",
    "authorId": "U0123456"
  }
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Harper locally for development |
| `npm run deploy` | Deploy to Harper Fabric |
| `npm test` | Run all tests |
| `npm start` | Start Harper in production mode |

## Testing

```bash
npm test
```

Tests use Node.js built-in test runner with module mocking. No extra test dependencies required.

## Project Structure

```
├── config.yaml         # Harper application configuration
├── schema.graphql      # Database schema (Memory table with HNSW vector index)
├── resources.js        # Core application logic (webhook, search, table extension)
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variable template
├── .nvmrc              # Node.js version
├── test/               # Test suite
│   ├── classify.test.js
│   ├── embedding.test.js
│   ├── webhook.test.js
│   └── search.test.js
└── docs/               # Guides
    ├── architecture.md
    ├── slack-app-setup.md
    └── mcp-setup.md
```

## How It Works

1. **Slack sends a message** via webhook to `/SlackWebhook`
2. **Classification**: Claude Haiku categorizes the message (decision, action_item, knowledge, etc.) and extracts entities (people, projects, technologies)
3. **Embedding**: Voyage AI generates a 1024-dimensional vector embedding
4. **Storage**: Raw text, classification, entities, and embedding are stored in the Memory table with HNSW vector indexing
5. **Retrieval**: Any MCP-connected AI client queries the Memory table using hybrid search (vector similarity + attribute filters)

## License

MIT
