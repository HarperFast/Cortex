# Harper Best Practices

Guidelines for building scalable, secure, and performant applications on Harper. These practices cover everything from initial schema design to advanced deployment strategies.

---

## Table of Contents

1. [Schema & Data Design](#1-schema--data-design) — **HIGH**
   - 1.1 [Adding Tables with Schemas](#11-adding-tables-with-schemas)
   - 1.2 [Defining Relationships](#12-defining-relationships)
   - 1.3 [Vector Indexing](#13-vector-indexing)
   - 1.4 [Using Blobs](#14-using-blobs)
   - 1.5 [Handling Binary Data](#15-handling-binary-data)
2. [API & Communication](#2-api--communication) — **HIGH**
   - 2.1 [Automatic REST APIs](#21-automatic-rest-apis)
   - 2.2 [Querying REST APIs](#22-querying-rest-apis)
   - 2.3 [Real-time Applications](#23-real-time-applications)
   - 2.4 [Checking Authentication](#24-checking-authentication)
3. [Logic & Extension](#3-logic--extension) — **MEDIUM**
   - 3.1 [Custom Resources](#31-custom-resources)
   - 3.2 [Extending Table Resources](#32-extending-table-resources)
   - 3.3 [Programmatic Table Requests](#33-programmatic-table-requests)
   - 3.4 [TypeScript Type Stripping](#34-typescript-type-stripping)
   - 3.5 [Caching](#35-caching)
4. [Infrastructure & Ops](#4-infrastructure--ops) — **MEDIUM**
   - 4.1 [Creating Harper Applications](#41-creating-harper-applications)
   - 4.2 [Deploying to Harper Fabric](#42-deploying-to-harper-fabric)
   - 4.3 [Serving Web Content](#43-serving-web-content)

---

## 1. Schema & Data Design

**Impact: HIGH**

### 1.1 Adding Tables with Schemas

Instructions for the agent to follow when adding tables to a Harper database.

#### When to Use
Use this skill when you need to define new data structures or modify existing ones in a Harper database.

#### Steps
1. **Create Dedicated Schema Files**: Prefer having a dedicated schema `.graphql` file for each table. Check the `config.yaml` file under `graphqlSchema.files` to see how it's configured. It typically accepts wildcards (e.g., `schemas/*.graphql`), but may be configured to point at a single file.
2. **Use Directives**: All available directives for defining your schema are defined in `node_modules/harperdb/schema.graphql`. Common directives include `@table`, `@export`, `@primaryKey`, `@indexed`, and `@relationship`.
3. **Define Relationships**: Link tables together using the `@relationship` directive. 
4. **Enable Automatic APIs**: If you add `@table @export` to a schema type, Harper automatically sets up REST and WebSocket APIs for basic CRUD operations against that table. 
5. **Consider Table Extensions**: If you are going to extend the table in your resources, then do not `@export` the table from the schema.

#### Example
```graphql
type ExamplePerson @table @export {
	id: ID @primaryKey
	name: String
	tag: String @indexed
}
```

### 1.2 Defining Relationships

Using the `@relationship` directive to link tables.

#### When to Use
Use this when you have two or more tables that need to be logically linked (e.g., a "Product" table and a "Category" table).

#### Steps
1. **Identify the Relationship**: Determine which table should "own" the relationship. This is typically the table that will hold the foreign key.
2. **Apply the `@relationship` Directive**: In your GraphQL schema, use the `@relationship` directive on the field that links to another table.
3. **Specify the `name` and `path` Arguments**:
   - `name`: A unique name for the relationship.
   - `path`: The field name in the current table that holds the value to match in the related table.
4. **Define the Inverse Relationship (Optional but Recommended)**: For better queryability, define the relationship in the related table as well.

#### Example
```graphql
type Product @table @export {
    id: ID @primaryKey
    name: String
    category: Category @relationship(name: "product_category", path: "category_id")
    category_id: ID
}

type Category @table @export {
    id: ID @primaryKey
    name: String
    products: [Product] @relationship(name: "product_category", path: "id")
}
```

### 1.3 Vector Indexing

How to define and use vector indexes for efficient similarity search.

#### When to Use
Use this when you need to perform similarity searches on high-dimensional data, such as image embeddings, text embeddings, or any other numeric vectors.

#### Steps
1. **Define the Vector Field**: In your GraphQL schema, define a field with a list of floats (e.g., `[Float]`).
2. **Apply the `@indexed` Directive**: Use the `@indexed` directive on the vector field and specify the index type as `vector`.
3. **Configure the Index (Optional)**: You can provide additional configuration for the vector index, such as the distance metric (e.g., `cosine`, `euclidean`).
4. **Querying**: Use the `vector` operator in your REST or programmatic requests to perform similarity searches.

#### Example
```graphql
type Document @table @export {
    id: ID @primaryKey
    content: String
    embedding: [Float] @indexed(type: "vector", options: { dims: 1536, metric: "cosine" })
}
```

### 1.4 Using Blobs

How to store and retrieve large data in HarperDB.

#### When to Use
Use this when you need to store large, unstructured data such as files, images, or large text documents that exceed the typical size of a standard database field.

#### Steps
1. **Define the Blob Field**: Use the `Blob` scalar type in your GraphQL schema.
2. **Storing Data**: Send the data as a buffer or a stream when creating or updating a record.
3. **Retrieving Data**: Access the blob field, which will return the data as a stream or buffer.

### 1.5 Handling Binary Data

How to store and serve binary data like images or MP3s.

#### When to Use
Use this when your application needs to handle binary files, particularly for storage and retrieval.

#### Steps
1. **Use the `Blob` type**: As with general large data, the `Blob` type is best for binary files.
2. **Streaming**: For large files, use streaming to minimize memory usage during upload and download.
3. **MIME Types**: Store the MIME type alongside the binary data to ensure it is served correctly by your application logic.

---

## 2. API & Communication

**Impact: HIGH**

### 2.1 Automatic REST APIs

Details on the CRUD endpoints automatically generated for exported tables.

#### Endpoints
- `GET /{TableName}`: Describes the schema.
- `GET /{TableName}/`: Lists records (supports filtering/sorting).
- `GET /{TableName}/{id}`: Gets a record by ID.
- `POST /{TableName}/`: Creates a record.
- `PUT /{TableName}/{id}`: Updates a record.
- `PATCH /{TableName}/{id}`: Partial update.
- `DELETE /{TableName}/`: Deletes records.
- `DELETE /{TableName}/{id}`: Deletes by ID.

### 2.2 Querying REST APIs

How to use filters, operators, sorting, and pagination in REST requests.

#### Query Parameters
- `limit`: Number of records to return.
- `offset`: Number of records to skip.
- `sort`: Field to sort by.
- `order`: `asc` or `desc`.
- `filter`: JSON object for filtering.

### 2.3 Real-time Applications

Implementing WebSockets and Pub/Sub for live data updates.

#### When to Use
Use this for applications that require live updates, such as chat apps, live dashboards, or collaborative tools.

#### Steps
1. **WebSocket Connection**: Connect to the Harper WebSocket endpoint.
2. **Subscribing**: Subscribe to table updates or specific records.
3. **Pub/Sub**: Use the internal bus to publish and subscribe to custom events.

### 2.4 Checking Authentication

How to use sessions to verify user identity and roles.

#### When to Use
Use this to secure your application by ensuring that only authorized users can access certain resources or perform specific actions.

#### Steps
1. **Session Handling**: Access the session object from the request context.
2. **Identity Verification**: Check for the presence of a user ID or token.
3. **Role Checks**: Verify if the user has the required roles for the action.

---

## 3. Logic & Extension

**Impact: MEDIUM**

### 3.1 Custom Resources

How to define custom REST endpoints using JavaScript or TypeScript.

#### Steps
1. **Create Resource File**: Define your logic in a JS or TS file.
2. **Export Handlers**: Export functions like `GET`, `POST`, etc.
3. **Registration**: Ensure the resource is correctly registered in your application configuration.

### 3.2 Extending Table Resources

Adding custom logic to automatically generated table resources.

#### Steps
1. **Define Extension**: Create a resource file that targets an existing table.
2. **Intercept Requests**: Use handlers to add custom validation or data transformation.
3. **No `@export`**: If extending, remember not to `@export` the table in the schema.

### 3.3 Programmatic Table Requests

How to use filters, operators, sorting, and pagination in programmatic table requests.

#### Usage
When writing custom resources, use the internal API to query tables with full support for advanced filtering and sorting.

### 3.4 TypeScript Type Stripping

Using TypeScript directly without build tools via Node.js Type Stripping.

#### Configuration
Harper supports native TypeScript type stripping, allowing you to run `.ts` files directly. Ensure your environment is configured to take advantage of this for faster development cycles.

### 3.5 Caching

How caching is defined and implemented in Harper applications.

#### Strategies
- **In-memory**: For fast access to frequently used data.
- **Distributed**: For scaling across multiple nodes in Harper Fabric.

---

## 4. Infrastructure & Ops

**Impact: MEDIUM**

### 4.1 Creating Harper Applications

The fastest way to start a new Harper project is using the `create-harper` CLI tool. This command initializes a project with a standard folder structure, essential configuration files, and basic schema definitions.

#### When to Use
Use this command when starting a new Harper application or adding a new Harper microservice to an existing architecture.

#### Commands
Initialize a project using your preferred package manager:

**NPM**
```bash
npm create harper@latest
```

**PNPM**
```bash
pnpm create harper@latest
```

**Bun**
```bash
bun create harper@latest
```

### 4.2 Deploying to Harper Fabric

Globally scaling your Harper application.

#### Benefits
- **Global Distribution**: Low latency for users everywhere.
- **Automatic Sync**: Data is synced across the fabric automatically.
- **Free Tier**: Start for free and scale as you grow.

### 4.3 Serving Web Content

Two ways to serve web content from a Harper application.

#### Methods
1. **Static Serving**: Serve HTML, CSS, and JS files directly.
2. **Dynamic Rendering**: Use custom resources to render content on the fly.
