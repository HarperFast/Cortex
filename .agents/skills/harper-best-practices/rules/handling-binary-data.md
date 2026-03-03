---
name: handling-binary-data
description: How to store and serve binary data like images or audio in Harper.
---

# Handling Binary Data

Instructions for the agent to follow when handling binary data in Harper.

## When to Use

Use this skill when you need to store binary files (images, audio, etc.) in the database or serve them back to clients via REST endpoints.

## Steps

1. **Store Base64 as Blobs**: In your resource's `post` or `put` method, convert incoming base64 strings to Buffers and then to Blobs using `createBlob`:
   ```typescript
   import { createBlob } from 'harperdb';

   async post(target, record) {
     if (record.data) {
       record.data = createBlob(Buffer.from(record.data, 'base64'), {
         type: 'image/jpeg',
       });
     }
     return super.post(target, record);
   }
   ```
2. **Serve Binary Data**: In your resource's `get` method, return a response object with the appropriate `Content-Type` and the binary data in the `body`:
   ```typescript
   async get(target) {
     const record = await super.get(target);
     if (record?.data) {
       return {
         status: 200,
         headers: { 'Content-Type': 'image/jpeg' },
         body: record.data,
       };
     }
     return record;
   }
   ```
3. **Use the Blob Type**: Ensure your GraphQL schema uses the `Blob` scalar for binary fields.
