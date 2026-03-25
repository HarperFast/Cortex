# Cortex MCP Server — Harper Deployment

Deploy the Cortex MCP server directly on Harper, running alongside Cortex on the same instance. This gives you the best performance (no HTTP round-trips for tool calls — direct table access) and zero additional infrastructure.

## How It Works

Instead of the standalone MCP server making HTTP requests to Cortex, the Harper deployment imports Cortex's tables directly via `harperdb`'s `tables` object. Tool calls go straight to the database — no network hop.

```
┌──────────────────────┐     Streamable HTTP     ┌──────────────────────────────┐
│  Claude / Cursor /   │ ◄──────────────────────► │  Harper Instance             │
│  Windsurf / Copilot  │    MCP over REST         │  ┌────────────────────────┐  │
└──────────────────────┘                          │  │ McpEndpoint (Resource)  │  │
                                                  │  │   ↓ direct table access │  │
                                                  │  │ Memory + SynapseEntry   │  │
                                                  │  └────────────────────────┘  │
                                                  └──────────────────────────────┘
```

## Setup

1. Copy this `harper/` directory into your Cortex project (or merge with existing):

```bash
cp -r harper/* /path/to/your/cortex/
```

2. Copy the `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

3. Start locally:

```bash
npm run dev
```

4. The MCP endpoint is now available at: `http://localhost:9926/McpEndpoint/`

## Connect Your AI Tool

### Claude Desktop / Claude.ai

Settings → Connectors → Add custom connector → paste:

```
https://your-instance.harpercloud.com/McpEndpoint/
```

### Claude Code

```bash
claude mcp add cortex --url https://your-instance.harpercloud.com/McpEndpoint/
```

### Cursor / Windsurf

```json
{
	"mcpServers": {
		"cortex": {
			"url": "https://your-instance.harpercloud.com/McpEndpoint/"
		}
	}
}
```

## Deploy to Harper Fabric

```bash
npm run deploy
```

This deploys the MCP server alongside Cortex to your Harper Fabric cluster. The MCP endpoint is immediately available at your cluster's application URL.

## Content Safety

All memory storage operations pass through Cortex's content safety layer, which includes:

- Injection detection and pattern-based sanitization (11 security patterns)
- Unicode normalization
- Length limits enforcement

Retrieval operations also apply a lighter sanitization pass to ensure consistency. These protections are transparent to the MCP client — all content is automatically protected at the server level.

## Multi-Tenant Support

When the parent MCP server runs in multi-tenant mode, the Harper deployment inherits namespace enforcement through the `agentId` field. Each memory record is scoped to its agent, and queries automatically filter by the calling agent's ID. JWT authentication is handled at the Harper HTTP layer, ensuring secure isolation between tenants.

## Why Deploy on Harper?

|                | Standalone                | On Harper                          |
| -------------- | ------------------------- | ---------------------------------- |
| Latency        | HTTP round-trip to Cortex | Direct table access (zero network) |
| Infrastructure | Separate Node process     | Same Harper instance               |
| Scaling        | Manual                    | Harper Fabric auto-scaling         |
| Auth           | Custom middleware         | Harper session management          |
| Deployment     | Docker / npx              | `npm run deploy`                   |
