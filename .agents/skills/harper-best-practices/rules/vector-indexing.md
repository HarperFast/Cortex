---
name: vector-indexing
description: How to enable and query vector indexes for similarity search in Harper.
---

# Vector Indexing

Instructions for the agent to follow when implementing vector search in Harper.

## When to Use

Use this skill when you need to perform similarity searches on high-dimensional data, such as AI embeddings for semantic search, recommendations, or image retrieval.

## Steps

1. **Enable Vector Indexing**: In your GraphQL schema, add `@indexed(type: "HNSW")` to a numeric array field:
   ```graphql
   type Product @table {
   	id: ID @primaryKey
   	textEmbeddings: [Float] @indexed(type: "HNSW")
   }
   ```
2. **Configure Index Options (Optional)**: Fine-tune the index with parameters like `distance` (`cosine` or `euclidean`), `M`, and `efConstruction`.
3. **Query with Vector Search**: Use `tables.Table.search()` with a `sort` object containing the `target` vector:
   ```javascript
   const results = await tables.Product.search({
     select: ['name', '$distance'],
     sort: {
       attribute: 'textEmbeddings',
       target: [0.1, 0.2, ...], // query vector
     },
     limit: 5,
   });
   ```
4. **Filter by Distance**: Use `conditions` with a `target` vector and a `comparator` (e.g., `lt`) to return results within a similarity threshold:
   ```javascript
   const results = await tables.Product.search({
   	conditions: {
   		attribute: 'textEmbeddings',
   		comparator: 'lt',
   		value: 0.1,
   		target: searchVector,
   	},
   });
   ```
5. **Generate Embeddings**: Use external services (OpenAI, Ollama) to generate the numeric vectors before storing or searching them in Harper.

const { Product } = tables;

import OpenAI from 'openai';
const openai = new OpenAI();
// the name of the OpenAI embedding model
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

const SIMILARITY_THRESHOLD = 0.5;

export class ProductSearch extends Resource {
// based on env variable we choose the appropriate embedding generator
generateEmbedding = process.env.EMBEDDING_GENERATOR === 'ollama'
? this._generateOllamaEmbedding
: this._generateOpenAIEmbedding;

    /**
     * Executes a search query using a generated text embedding and returns the matching products.
     *
     * @param {Object} data - The input data for the request.
     * @param {string} data.prompt - The prompt to generate the text embedding from.
     * @return {Promise<Array>} Returns a promise that resolves to an array of products matching the conditions,
     * including fields: name, description, price, and $distance.
     */
    async post(data) {
    	const embedding = await this.generateEmbedding(data.prompt);

    	return await Product.search({
    		select: ['name', 'description', 'price', '$distance'],
    		conditions: {
    			attribute: 'textEmbeddings',
    			comparator: 'lt',
    			value: SIMILARITY_THRESHOLD,
    			target: embedding[0],
    		},
    		limit: 5,
    	});
    }

    /**
     * Generates an embedding using the Ollama API.
     *
     * @param {string} promptData - The input data for which the embedding is to be generated.
     * @return {Promise<number[][]>} A promise that resolves to the generated embedding as an array of numbers.
     */
    async _generateOllamaEmbedding(promptData) {
    	const embedding = await ollama.embed({
    		model: OLLAMA_EMBEDDING_MODEL,
    		input: promptData,
    	});
    	return embedding?.embeddings;
    }

    /**
     * Generates OpenAI embeddings based on the given prompt data.
     *
     * @param {string} promptData - The input data used for generating the embedding.
     * @return {Promise<number[][]>} A promise that resolves to an array of embeddings, where each embedding is an array of floats.
     */
    async _generateOpenAIEmbedding(promptData) {
    	const embedding = await openai.embeddings.create({
    		model: OPENAI_EMBEDDING_MODEL,
    		input: promptData,
    		encoding_format: 'float',
    	});

    	let embeddings = [];
    	embedding.data.forEach((embeddingData) => {
    		embeddings.push(embeddingData.embedding);
    	});

    	return embeddings;
    }

}

````
Sample request to the `ProductSearch` resource which prompts to find "shorts for the gym":

```bash
curl -X POST "http://localhost:9926/ProductSearch/" \
-H "accept: \
-H "Content-Type: application/json" \
-H "Authorization: Basic <YOUR_AUTH>" \
-d '{"prompt": "shorts for the gym"}'
````

---

## When to Use Vector Indexing

Vector indexing is ideal when:

- Storing embedding vectors from ML models
- Performing semantic or similarity-based search
- Working with high-dimensional numeric data
- Exact-match indexes are insufficient

---

## Summary

- Vector indexing enables fast similarity search on numeric arrays
- Defined using `@indexed(type: "HNSW")`
- Queried using a target vector in search sorting
- Tunable for performance and accuracy
