---
name: programmatic-table-requests
description: How to interact with Harper tables programmatically using the `tables` object.
---

# Programmatic Table Requests

Instructions for the agent to follow when interacting with Harper tables via code.

## When to Use

Use this skill when you need to perform database operations (CRUD, search, subscribe) from within Harper Resources or scripts.

## Steps

1. **Access the Table**: Use the global `tables` object followed by your table name (e.g., `tables.MyTable`).
2. **Perform CRUD Operations**:
   - **Get**: `await tables.MyTable.get(id)` for a single record or `await tables.MyTable.get({ conditions: [...] })` for multiple.
   - **Create**: `await tables.MyTable.post(record)` (auto-generates ID) or `await tables.MyTable.put(id, record)`.
   - **Update**: `await tables.MyTable.patch(id, partialRecord)` for partial updates.
   - **Delete**: `await tables.MyTable.delete(id)`.
3. **Use Updatable Records for Atomic Ops**: Call `update(id)` to get a reference, then use `addTo` or `subtractFrom` for atomic increments/decrements:
   ```typescript
   const stats = await tables.Stats.update('daily');
   stats.addTo('viewCount', 1);
   ```
4. **Search and Stream**: Use `search(query)` for efficient streaming of large result sets:
   ```typescript
   for await (const record of tables.MyTable.search({ conditions: [...] })) {
     // process record
   }
   ```
5. **Real-time Subscriptions**: Use `subscribe(query)` to listen for changes:
   ```typescript
   for await (const event of tables.MyTable.subscribe(query)) {
   	// handle event
   }
   ```
6. **Publish Events**: Use `publish(id, message)` to trigger subscriptions without necessarily persisting data.
