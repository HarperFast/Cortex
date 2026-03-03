---
name: custom-resources
description: How to define custom REST endpoints with JavaScript or TypeScript in Harper.
---

# Custom Resources

Instructions for the agent to follow when creating custom resources in Harper.

## When to Use

Use this skill when the automatic CRUD operations provided by `@table @export` are insufficient, and you need custom logic, third-party API integration, or specialized data handling for your REST endpoints.

## Steps

1. **Check if a Custom Resource is Necessary**: Verify if [Automatic APIs](./automatic-apis.md) or [Extending Tables](./extending-tables.md) can satisfy the requirement first.
2. **Create the Resource File**: Create a `.ts` or `.js` file in the directory specified by `jsResource` in `config.yaml` (typically `resources/`).
3. **Define the Resource Class**: Export a class extending `Resource` from `harperdb`:
   ```typescript
   import { type RequestTargetOrId, Resource } from 'harperdb';

   export class MyResource extends Resource {
   	async get(target?: RequestTargetOrId) {
   		return { message: 'Hello from custom GET!' };
   	}
   }
   ```
4. **Implement HTTP Methods**: Add methods like `get`, `post`, `put`, `patch`, or `delete` to handle corresponding requests. Note that paths are **case-sensitive** and match the class name.
5. **Access Tables (Optional)**: Import and use the `tables` object to interact with your data:
   ```typescript
   import { tables } from 'harperdb';
   // ... inside a method
   const results = await tables.MyTable.list();
   ```
6. **Configure Loading**: Ensure `config.yaml` points to your resource files (e.g., `jsResource: { files: 'resources/*.ts' }`).
