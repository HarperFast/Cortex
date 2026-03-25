/**
 * Unit tests for cortex-mcp-server tools
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractToken, validateAuth } from '../src/auth.js';
import {
	handleMemoryCount,
	handleMemoryForget,
	handleMemoryRecall,
	handleMemorySearch,
	handleMemoryStore,
	memoryCountSchema,
	memoryForgetSchema,
	memoryRecallSchema,
	memorySearchSchema,
	memoryStoreSchema,
} from '../src/tools/memory.js';
import {
	handleSynapseIngest,
	handleSynapseSearch,
	synapseIngestSchema,
	synapseSearchSchema,
} from '../src/tools/synapse.js';

// Mock fetch
global.fetch = vi.fn();

const mockContext = {
	cortexUrl: 'https://test.harpercloud.com',
	cortexToken: 'test-token',
	cortexSchema: 'data',
};

describe('Authentication', () => {
	it('should extract Bearer token from authorization header', () => {
		const token = extractToken('Bearer test-token-123');
		expect(token).toBe('test-token-123');
	});

	it('should handle missing authorization header', () => {
		const token = extractToken(undefined);
		expect(token).toBeUndefined();
	});

	it('should extract userId from token format "userId:token"', () => {
		const auth = validateAuth('user-123:secret-token');
		expect(auth.isValid).toBe(true);
		expect(auth.userId).toBe('user-123');
		expect(auth.token).toBe('user-123:secret-token');
	});

	it('should mark empty token as invalid', () => {
		const auth = validateAuth('');
		expect(auth.isValid).toBe(false);
	});
});

describe('Memory Tools', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('memory_search', () => {
		it('should validate schema correctly', () => {
			const input = {
				query: 'caching strategy',
				limit: 5,
				filters: { source: 'slack' },
			};

			const result = memorySearchSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(input);
			}
		});

		it('should call Cortex API with correct parameters', async () => {
			const mockResponse = {
				results: [
					{
						id: 'mem-1',
						rawText: 'We use Redis for caching',
						source: 'slack',
						similarity: 0.95,
						timestamp: '2026-03-19T00:00:00Z',
					},
				],
				count: 1,
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const input = {
				query: 'caching',
				limit: 5,
			};

			const result = await handleMemorySearch(mockContext, input);
			const parsed = JSON.parse(result);

			expect(parsed.count).toBe(1);
			expect(parsed.results[0].id).toBe('mem-1');
			expect(parsed.results[0].similarity).toBe(0.95);
		});

		it('should handle API errors gracefully', async () => {
			(global.fetch as any).mockRejectedValueOnce(
				new Error('Network error'),
			);

			const input = { query: 'test' };

			try {
				await handleMemorySearch(mockContext, input);
				expect.fail('Should have thrown');
			} catch (error) {
				expect((error as Error).message).toContain('Network error');
			}
		});
	});

	describe('memory_store', () => {
		it('should validate schema correctly', () => {
			const input = {
				text: 'We chose Redis for caching',
				source: 'slack',
				classification: 'decision',
				metadata: { channel: 'engineering' },
			};

			const result = memoryStoreSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it('should call Cortex API to store memory', async () => {
			const mockResponse = {
				id: 'mem-new-1',
				created: true,
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const input = {
				text: 'We chose Redis for caching',
				source: 'slack',
				classification: 'decision',
			};

			const result = await handleMemoryStore(mockContext, input);
			const parsed = JSON.parse(result);

			expect(parsed.id).toBe('mem-new-1');
			expect(parsed.status).toBe('stored');
			expect(parsed.timestamp).toBeDefined();
		});
	});

	describe('memory_recall', () => {
		it('should validate schema correctly', () => {
			const input = { id: 'mem-123' };
			const result = memoryRecallSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it('should retrieve memory by ID', async () => {
			const mockResponse = {
				id: 'mem-123',
				rawText: 'We use Redis for caching',
				source: 'slack',
				classification: 'decision',
				timestamp: '2026-03-19T00:00:00Z',
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const input = { id: 'mem-123' };
			const result = await handleMemoryRecall(mockContext, input);
			const parsed = JSON.parse(result);

			expect(parsed.id).toBe('mem-123');
			expect(parsed.text).toBe('We use Redis for caching');
		});
	});

	describe('memory_forget', () => {
		it('should validate schema correctly', () => {
			const input = { id: 'mem-123' };
			const result = memoryForgetSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it('should delete memory by ID', async () => {
			// First fetch: GET to verify record ownership
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 'mem-123', agentId: 'test' }),
			});
			// Second fetch: DELETE to remove the record
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
			});

			const input = { id: 'mem-123' };
			const result = await handleMemoryForget(mockContext, input);
			const parsed = JSON.parse(result);

			expect(parsed.id).toBe('mem-123');
			expect(parsed.status).toBe('deleted');
		});
	});

	describe('memory_count', () => {
		it('should validate schema correctly', () => {
			const input = {
				filters: { source: 'slack' },
			};

			const result = memoryCountSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it('should return memory count', async () => {
			const mockResponse = { count: 42 };

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const input = { filters: { source: 'slack' } };
			const result = await handleMemoryCount(mockContext, input);
			const parsed = JSON.parse(result);

			expect(parsed.count).toBe(42);
		});
	});
});

describe('Synapse Tools', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('synapse_search', () => {
		it('should validate schema correctly', () => {
			const input = {
				query: 'architecture decisions',
				projectId: 'my-project',
				limit: 5,
				filters: { type: 'intent' },
			};

			const result = synapseSearchSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it('should search synapse entries', async () => {
			const mockResponse = {
				results: [
					{
						id: 'syn-1',
						type: 'intent',
						content: 'Use React for frontend',
						source: 'claude_code',
						summary: 'Frontend framework decision',
						similarity: 0.92,
						createdAt: '2026-03-19T00:00:00Z',
					},
				],
				count: 1,
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const input = {
				query: 'frontend framework',
				projectId: 'my-project',
			};

			const result = await handleSynapseSearch(mockContext, input);
			const parsed = JSON.parse(result);

			expect(parsed.count).toBe(1);
			expect(parsed.projectId).toBe('my-project');
			expect(parsed.results[0].type).toBe('intent');
		});
	});

	describe('synapse_ingest', () => {
		it('should validate schema correctly', () => {
			const input = {
				source: 'claude_code' as const,
				content: '## Architecture\nUse React',
				projectId: 'my-project',
				references: ['syn-1'],
			};

			const result = synapseIngestSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it('should ingest synapse context', async () => {
			const mockResponse = {
				stored: [
					{
						summary: 'Frontend framework decision',
						type: 'intent',
					},
				],
				count: 1,
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const input = {
				source: 'claude_code' as const,
				content: 'Use React for the frontend',
				projectId: 'my-project',
			};

			const result = await handleSynapseIngest(mockContext, input);
			const parsed = JSON.parse(result);

			expect(parsed.count).toBe(1);
			expect(parsed.projectId).toBe('my-project');
			expect(parsed.stored[0].type).toBe('intent');
		});
	});
});
