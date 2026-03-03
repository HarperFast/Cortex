---
name: caching
description: How to implement integrated data caching in Harper from external sources.
---

# Caching

Instructions for the agent to follow when implementing caching in Harper.

## When to Use

Use this skill when you need high-performance, low-latency storage for data from external sources. It's ideal for reducing API calls to third-party services, preventing cache stampedes, and making external data queryable as if it were native Harper tables.

## Steps

1. **Configure a Cache Table**: Define a table in your `schema.graphql` with an `expiration` (in seconds):
   ```graphql
   type MyCache @table(expiration: 3600) @export {
   	id: ID @primaryKey
   }
   ```
2. **Define an External Source**: Create a Resource class that fetches the data:
   ```js
   import { Resource } from 'harperdb';

   export class ThirdPartyAPI extends Resource {
   	async get() {
   		const id = this.getId();
   		const response = await fetch(`https://api.example.com/items/${id}`);
   		if (!response.ok) {
   			throw new Error('Source fetch failed');
   		}
   		return await response.json();
   	}
   }
   ```
3. **Attach Source to Table**: Use `sourcedFrom` to link your resource to the table:
   ```js
   import { tables } from 'harperdb';
   import { ThirdPartyAPI } from './ThirdPartyAPI.js';

   const { MyCache } = tables;
   MyCache.sourcedFrom(ThirdPartyAPI);
   ```
4. **Implement Active Caching (Optional)**: Use `subscribe()` for proactive updates. See [Real Time Apps](real-time-apps.md).
5. **Implement Write-Through Caching (Optional)**: Define `put` or `post` in your resource to propagate updates upstream.
