---
name: real-time-apps
description: How to build real-time features in Harper using WebSockets and Pub/Sub.
---

# Real-time Applications

Instructions for the agent to follow when building real-time applications in Harper.

## When to Use

Use this skill when you need to stream live updates to clients, implement chat features, or provide real-time data synchronization between the database and a frontend.

## Steps

1. **Check Automatic WebSockets**: If you only need to stream table changes, use [Automatic APIs](automatic-apis.md) which provide a WebSocket endpoint for every `@export`ed table.
2. **Implement `connect` in a Resource**: For custom bi-directional logic, implement the `connect` method:
   ```typescript
   import { Resource, tables } from 'harperdb';

   export class MySocket extends Resource {
   	async *connect(target, incomingMessages) {
   		// Subscribe to table changes
   		const subscription = await tables.MyTable.subscribe(target);
   		if (!incomingMessages) { return subscription; // SSE mode
   		 }

   		// Handle incoming client messages
   		for await (let message of incomingMessages) {
   			yield { received: message };
   		}
   	}
   }
   ```
3. **Use Pub/Sub**: Use `tables.TableName.subscribe(query)` to listen for specific data changes and stream them to the client.
4. **Handle SSE**: Ensure your `connect` method gracefully handles cases where `incomingMessages` is null (Server-Sent Events).
5. **Connect from Client**: Use standard WebSockets (`new WebSocket('ws://...')`) to connect to your resource endpoint.
