import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

class MockMemory {
	static put = mock.fn();
	static search = mock.fn(function* () {});
	static get = mock.fn();
}

const mockSynapseSearch = mock.fn(function* () {});

class MockSynapseEntry {
	static put = mock.fn();
	static search = mockSynapseSearch;
	static get = mock.fn();
}

mock.module('harperdb', {
	namedExports: {
		Resource: class Resource {},
		tables: { Memory: MockMemory, SynapseEntry: MockSynapseEntry },
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

const { SynapseSearch } = await import('../resources.js');

describe('SynapseSearch', () => {
	it('returns error for missing query', async () => {
		const search = new SynapseSearch();
		const result = await search.post({ projectId: 'proj-1' });

		assert.ok(result.error);
		assert.ok(result.error.includes('query is required'));
	});

	it('returns error for empty string query', async () => {
		const search = new SynapseSearch();
		const result = await search.post({ query: '', projectId: 'proj-1' });

		assert.ok(result.error);
	});

	it('returns error for missing projectId', async () => {
		const search = new SynapseSearch();
		const result = await search.post({ query: 'architecture decision' });

		assert.ok(result.error);
		assert.ok(result.error.includes('projectId is required'));
	});

	it('returns error for null data', async () => {
		const search = new SynapseSearch();
		const result = await search.post(null);

		assert.ok(result.error);
	});

	it('performs vector search with valid query and projectId', async () => {
		const fakeEmbedding = new Array(1024).fill(0.5);
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: fakeEmbedding }],
		}));

		const fakeResult = {
			id: 'synapse-123',
			type: 'intent',
			content: 'We chose HarperDB for HNSW indexing',
			summary: 'HarperDB chosen for vector search',
			$distance: 0.12,
		};

		mockSynapseSearch.mock.mockImplementation(function* () {
			yield fakeResult;
		});

		const search = new SynapseSearch();
		const result = await search.post({ query: 'architecture decision', projectId: 'my-project' });

		assert.ok(result.results);
		assert.equal(result.count, 1);
		assert.equal(result.results[0].id, 'synapse-123');
		assert.equal(result.results[0].type, 'intent');
	});

	it('always filters by projectId and status: active', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSynapseSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new SynapseSearch();
		await search.post({ query: 'test', projectId: 'my-project' });

		assert.ok(Array.isArray(capturedParams.conditions));
		const projectCondition = capturedParams.conditions.find(c => c.attribute === 'projectId');
		const statusCondition = capturedParams.conditions.find(c => c.attribute === 'status');
		assert.ok(projectCondition);
		assert.equal(projectCondition.value, 'my-project');
		assert.ok(statusCondition);
		assert.equal(statusCondition.value, 'active');
	});

	it('respects the limit parameter', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSynapseSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new SynapseSearch();
		await search.post({ query: 'test', projectId: 'proj-1', limit: 5 });

		assert.equal(capturedParams.limit, 5);
	});

	it('caps limit at 100', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSynapseSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new SynapseSearch();
		await search.post({ query: 'test', projectId: 'proj-1', limit: 500 });

		assert.equal(capturedParams.limit, 100);
	});

	it('applies type filter when valid', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSynapseSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new SynapseSearch();
		await search.post({ query: 'test', projectId: 'proj-1', filters: { type: 'constraint' } });

		const typeCondition = capturedParams.conditions.find(c => c.attribute === 'type');
		assert.ok(typeCondition);
		assert.equal(typeCondition.value, 'constraint');
	});

	it('ignores invalid type filter', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSynapseSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new SynapseSearch();
		await search.post({ query: 'test', projectId: 'proj-1', filters: { type: 'invalid_type' } });

		const typeCondition = capturedParams.conditions.find(c => c.attribute === 'type');
		assert.ok(!typeCondition);
	});

	it('applies source filter when valid', async () => {
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: new Array(1024).fill(0) }],
		}));

		let capturedParams;
		mockSynapseSearch.mock.mockImplementation(function* (params) {
			capturedParams = params;
		});

		const search = new SynapseSearch();
		await search.post({ query: 'test', projectId: 'proj-1', filters: { source: 'cursor' } });

		const sourceCondition = capturedParams.conditions.find(c => c.attribute === 'source');
		assert.ok(sourceCondition);
		assert.equal(sourceCondition.value, 'cursor');
	});
});
