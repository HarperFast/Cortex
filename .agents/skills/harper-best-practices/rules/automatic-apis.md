---
name: automatic-apis
description: How to use Harper's automatically generated REST and WebSocket APIs.
---

# Automatic APIs

Instructions for the agent to follow when utilizing Harper's automatic APIs.

## When to Use

Use this skill when you want to interact with Harper tables via REST or WebSockets without writing custom resource logic. This is ideal for basic CRUD operations and real-time updates.

## Steps

1. **Enable Automatic APIs**: Ensure your GraphQL schema includes the `@export` directive for the table:
   ```graphql
   type MyTable @table @export {
   	id: ID @primaryKey
   	# ... other fields
   }
   ```
2. **Access REST Endpoints**: Use the following endpoints for a table named `TableName` (Note: Paths are **case-sensitive**):
   - **Describe Schema**: `GET /{TableName}`
   - **List Records**: `GET /{TableName}/` (Supports filtering, sorting, and pagination. See [Querying REST APIs](querying-rest-apis.md)).
   - **Get Single Record**: `GET /{TableName}/{id}`
   - **Create Record**: `POST /{TableName}/` (Request body should be JSON).
   - **Update Record (Full)**: `PUT /{TableName}/{id}`
   - **Update Record (Partial)**: `PATCH /{TableName}/{id}`
   - **Delete All/Filtered Records**: `DELETE /{TableName}/`
   - **Delete Single Record**: `DELETE /{TableName}/{id}`
3. **Use Automatic WebSockets**: Connect to `ws://your-harper-instance/{TableName}` to receive events whenever updates are made to that table. This is the easiest way to add real-time capabilities. For more complex needs, see [Real-time Applications](real-time-apps.md).
4. **Apply Filtering and Querying**: Use query parameters with `GET /{TableName}/` and `DELETE /{TableName}/`. See the [Querying REST APIs](querying-rest-apis.md) skill for advanced details.
5. **Customize if Needed**: If the automatic APIs don't meet your requirements, [customize the resources](./custom-resources.md).
