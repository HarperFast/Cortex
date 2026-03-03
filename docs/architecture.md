# Architecture

## Data Flow

```
┌───────────┐     Event POST     ┌──────────────────────┐
│  Slack    │ ─────────────────▶ │  SlackWebhook        │
│  Events   │                    │  (resources.js)       │
│  API      │                    │                       │
└───────────┘                    │  1. Verify signature  │
                                 │  2. Filter bots/dupes │
                                 │  3. Return 200        │
                                 │  4. Async process:    │
                                 │     ┌─────────────┐   │
                                 │     │ classifyMsg  │   │
                                 │     │ (Claude API) │   │
                                 │     └──────┬──────┘   │
                                 │     ┌──────▼──────┐   │
                                 │     │ genEmbedding │   │
                                 │     │ (Voyage AI)  │   │
                                 │     └──────┬──────┘   │
                                 │     ┌──────▼──────┐   │
                                 │     │ Memory.put() │   │
                                 │     └─────────────┘   │
                                 └──────────────────────┘

┌──────────────┐    MCP JSON-RPC    ┌──────────────────┐
│ Claude       │ ◀────────────────▶ │ Harper MCP       │
│ Desktop      │                    │ Server (/mcp)    │
│ (or Cursor)  │                    │                  │
└──────────────┘                    │ resources/list   │
                                    │ resources/read   │
                                    └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │ Memory Table     │
                                    │ (HNSW index)     │
                                    └──────────────────┘
```

## Memory Table Schema

| Field | Type | Indexed | Purpose |
|-------|------|---------|---------|
| `id` | ID | Primary Key | Unique identifier |
| `rawText` | String | No | Original message text |
| `source` | String | Yes | Platform (e.g., "slack") |
| `sourceType` | String | Yes | Content type (message, thread_reply) |
| `channelId` | String | Yes | Slack channel ID |
| `channelName` | String | No | Human-readable channel name |
| `authorId` | String | Yes | Slack user ID |
| `authorName` | String | No | Human-readable author name |
| `classification` | String | Yes | LLM category (decision, action_item, etc.) |
| `entities` | Any (JSON) | No | Extracted entities (people, projects, tech) |
| `embedding` | [Float] | HNSW/cosine | 1024-dim vector from Voyage AI |
| `summary` | String | No | LLM-generated one-line summary |
| `timestamp` | Date | Yes | When the original message was sent |
| `threadTs` | String | No | Slack thread timestamp for grouping |
| `metadata` | Any (JSON) | No | Extra data (team_id, event_id, model version) |

## Classification Categories

| Category | Description |
|----------|-------------|
| `decision` | Team made a choice or reached consensus |
| `action_item` | Task assigned or committed to |
| `knowledge` | Technical explanation or insight shared |
| `question` | Someone asked for help or information |
| `announcement` | News, update, or broadcast |
| `discussion` | General conversation or debate |
| `reference` | Link, doc, or resource shared |
| `status_update` | Progress report or standup update |
| `feedback` | Review, suggestion, or critique |

## Search: Hybrid Approach

The `MemorySearch` endpoint combines two search strategies:

1. **Vector similarity**: Compares the query embedding against stored embeddings using cosine distance (HNSW index)
2. **Attribute filtering**: Narrows results by classification, source, channel, or author

This hybrid approach gives better results than pure vector search alone.
