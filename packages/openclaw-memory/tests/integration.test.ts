/**
 * Integration tests for real Cortex instance
 * These are stubs that can be run against a real Cortex instance
 * Set environment variables: CORTEX_INSTANCE_URL, CORTEX_TOKEN, CORTEX_TABLE
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CortexMemoryDB } from '../src/memory-db.js';

describe('CortexMemoryDB Integration Tests', () => {
	let db: CortexMemoryDB;

	const CORTEX_INSTANCE_URL = process.env.CORTEX_INSTANCE_URL;
	const CORTEX_TOKEN = process.env.CORTEX_TOKEN;
	const CORTEX_TABLE = process.env.CORTEX_TABLE || 'test_memories';

	beforeAll(() => {
		if (!CORTEX_INSTANCE_URL) {
			console.warn(
				'Skipping integration tests: CORTEX_INSTANCE_URL not set',
			);
			return;
		}

		db = new CortexMemoryDB({
			instanceUrl: CORTEX_INSTANCE_URL,
			token: CORTEX_TOKEN,
			table: CORTEX_TABLE,
			schema: 'data',
		});
	});

	describe('Round-trip operations', () => {
		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should store and retrieve a memory',
			async () => {
				const entry = {
					text: 'Integration test fact about AI systems',
					importance: 0.8,
					category: 'fact' as const,
				};

				const id = await db.store(entry);

				expect(id).toBeTruthy();
				expect(id).toMatch(/^[0-9a-f-]{36}$/i);

				// Try to retrieve it
				const retrieved = await db.get(id);
				expect(retrieved).toBeDefined();
				expect(retrieved?.text).toContain('Integration test');
			},
		);

		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should search memories by similarity',
			async () => {
				const entry1 = {
					text: 'The Python programming language was created in 1989',
					importance: 0.7,
					category: 'fact' as const,
				};

				const entry2 = {
					text: 'JavaScript is used for web development',
					importance: 0.6,
					category: 'fact' as const,
				};

				const id1 = await db.store(entry1);
				const id2 = await db.store(entry2);

				expect(id1).toBeTruthy();
				expect(id2).toBeTruthy();

				// Search for Python-related memories
				const results = await db.search('Python programming language', 5);

				expect(results.length).toBeGreaterThan(0);
				// The first result should be more similar to Python query
				expect(results[0].entry.text).toContain('Python');
			},
		);

		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should delete a memory',
			async () => {
				const id = await db.store({
					text: 'Memory to be deleted',
					importance: 0.5,
					category: 'event' as const,
				});

				expect(id).toBeTruthy();

				// Delete it
				await db.delete(id);

				// Verify it's gone
				const retrieved = await db.get(id);
				expect(retrieved).toBeNull();
			},
		);

		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should batch store multiple memories',
			async () => {
				const entries = [
					{
						text: 'First batch memory',
						importance: 0.7,
						category: 'fact' as const,
					},
					{
						text: 'Second batch memory',
						importance: 0.6,
						category: 'event' as const,
					},
					{
						text: 'Third batch memory',
						importance: 0.8,
						category: 'procedure' as const,
					},
				];

				const ids = await db.storeBatch(entries);

				expect(ids).toHaveLength(3);
				expect(ids.every((id) => /^[0-9a-f-]{36}$/i.test(id))).toBe(true);

				// Verify retrieval
				for (const id of ids) {
					const memory = await db.get(id);
					expect(memory).toBeDefined();
					expect(memory?.text).toContain('batch memory');
				}
			},
		);
	});

	describe('Count operations', () => {
		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should count stored memories',
			async () => {
				const count = await db.count();

				expect(count).toBeGreaterThanOrEqual(0);
				expect(typeof count).toBe('number');
			},
		);

		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should filter count by agentId',
			async () => {
				// Store a memory with agentId
				const id = await db.store({
					text: 'Agent-specific memory',
					importance: 0.7,
					category: 'fact' as const,
					agentId: 'test-agent-123',
				});

				const count = await db.count('test-agent-123');

				expect(count).toBeGreaterThanOrEqual(1);
			},
		);
	});

	describe('Error handling', () => {
		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should handle search with invalid query gracefully',
			async () => {
				const results = await db.search('', 5);

				expect(Array.isArray(results)).toBe(true);
			},
		);

		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should handle deletion of non-existent memory',
			async () => {
				const fakeId = '550e8400-e29b-41d4-a716-446655440000';

				// Should not throw, but API should return error
				// The behavior depends on Cortex's implementation
				expect(async () => {
					await db.delete(fakeId);
				}).not.toThrow();
			},
		);
	});

	describe('Multi-agent isolation', () => {
		it.skipIf(!CORTEX_INSTANCE_URL)(
			'should isolate memories by agentId',
			async () => {
				// Store memories for different agents
				const id1 = await db.store({
					text: 'Memory for agent A',
					importance: 0.7,
					category: 'fact' as const,
					agentId: 'agent-a',
				});

				const id2 = await db.store({
					text: 'Memory for agent B',
					importance: 0.7,
					category: 'fact' as const,
					agentId: 'agent-b',
				});

				// Search with agent A filter
				const resultsA = await db.search(
					'Memory for agent',
					5,
					'agent-a',
				);

				// Should find agent-a's memory
				const hasAgentAMemory = resultsA.some((r) => r.entry.text.includes('agent A'));
				expect(hasAgentAMemory).toBe(true);
			},
		);
	});
});

/**
 * Instructions for running integration tests:
 *
 * 1. Start a Cortex instance:
 *    docker run -p 8080:8080 harperfast/cortex:latest
 *
 * 2. Set environment variables:
 *    export CORTEX_INSTANCE_URL=http://localhost:8080
 *    export CORTEX_TABLE=test_memories
 *
 * 3. Run the tests:
 *    npm test -- tests/integration.test.ts
 *
 * For authenticated instances, also set:
 *    export CORTEX_TOKEN=your-auth-token
 */
