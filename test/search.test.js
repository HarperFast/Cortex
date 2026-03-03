import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

const mockSearch = mock.fn(function* () {});

class MockMemory {
	static put = mock.fn();
	static search = mockSearch;
	static get = mock.fn();
}

mock.module('harperdb', {
	namedExports: {
		Resource: class Resource {},
		tables: { Memory: MockMemory },
	},
});

mock.module('@anthropic-ai/sdk', {
	defaultExport: class Anthropic {
		constructor() {
			this.messages = { create: mock.fn() };
		}
	},
});

const mockEmbed = mock.fn();
mock.module('voyageai', {
	namedExports: {
		VoyageAIClient: class VoyageAIClient {
			constructor() {}
			embed(...args) { return mockEmbed(...args); }
		},
	},
});

process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.VOYAGE_API_KEY = 'test-key';

const { MemorySearch } = await import('../resources.js');

describe('MemorySearch', () => {
	it('returns error for missing query', async () => {
		const search = new MemorySearch();
		const result = await search.post({});

		assert.ok(result.error);
		assert.ok(result.error.includes('query is required'));
	});

	it('returns error for empty string query', async () => {
		const search = new MemorySearch();
		const result = await search.post({ query: '' });

		assert.ok(result.error);
	});

	it('returns error for null data', async () => {
		const search = new MemorySearch();
		const result = await search.post(null);

		assert.ok(result.error);
	});

	it('performs vector search with valid query', async () => {
		const fakeEmbedding = new Array(1024).fill(0.5);
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: fakeEmbedding }],
		}));

		const fakeResult = {
			id: 'test-id',
			rawText: 'We decided to use Redis',
			classification: 'decision',
			summary: 'Team chose Redis',
			$distance: 0.15,
		};

		mockSearch.mock.mockImplementation(function* () {
			yield fakeResult;
		});

		const search = new MemorySearch();
		const result = await search.post({ query: 'caching decision' });

		assert.ok(result.results);
		assert.equal(result.count, 1);
		assert.equal(result.results[0].id, 'test-id');
		assert.equal(result.results[0].$distance, 0.15);
	});

	it('respects the limit parameter', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new MemorySearch();
		await search.post({ query: 'test', limit: 5 });

		assert.equal(capturedParams.limit, 5);
	});

	it('caps limit at 100', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new MemorySearch();
		await search.post({ query: 'test', limit: 500 });

		assert.equal(capturedParams.limit, 100);
	});

	it('applies classification filter for hybrid search', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new MemorySearch();
		await search.post({
			query: 'test',
			filters: { classification: 'decision' },
		});

		assert.ok(capturedParams.conditions);
		assert.equal(capturedParams.conditions.attribute, 'classification');
		assert.equal(capturedParams.conditions.value, 'decision');
	});

	it('applies multiple filters as array', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new MemorySearch();
		await search.post({
			query: 'test',
			filters: { classification: 'decision', source: 'slack' },
		});

		assert.ok(Array.isArray(capturedParams.conditions));
		assert.equal(capturedParams.conditions.length, 2);
	});

	it('defaults limit to 10 for invalid values', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new MemorySearch();
		await search.post({ query: 'test', limit: 'invalid' });

		assert.equal(capturedParams.limit, 10);
	});
});
