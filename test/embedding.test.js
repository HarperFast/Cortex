import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

class MockMemory {
	static put = mock.fn();
	static search = mock.fn(function*() {});
	static get = mock.fn();
}

class MockSynapseEntry {
	static put = mock.fn();
	static search = mock.fn(function*() {});
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
			embed(...args) {
				return mockEmbed(...args);
			}
		},
	},
});

process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.VOYAGE_API_KEY = 'test-key';

const { generateEmbedding } = await import('../resources.js');

describe('generateEmbedding', () => {
	it('returns a vector array for valid text', async () => {
		const fakeEmbedding = new Array(1024).fill(0.1);
		mockEmbed.mock.mockImplementation(async () => ({
			data: [{ embedding: fakeEmbedding }],
		}));

		const result = await generateEmbedding('Hello world');

		assert.ok(Array.isArray(result));
		assert.equal(result.length, 1024);
		assert.equal(result[0], 0.1);
	});

	it('throws for empty string', async () => {
		await assert.rejects(
			() => generateEmbedding(''),
			{ message: 'Cannot generate embedding for empty text' },
		);
	});

	it('throws for null input', async () => {
		await assert.rejects(
			() => generateEmbedding(null),
			{ message: 'Cannot generate embedding for empty text' },
		);
	});

	it('throws for undefined input', async () => {
		await assert.rejects(
			() => generateEmbedding(undefined),
			{ message: 'Cannot generate embedding for empty text' },
		);
	});

	it('throws for whitespace-only input', async () => {
		await assert.rejects(
			() => generateEmbedding('   '),
			{ message: 'Cannot generate embedding for empty text' },
		);
	});

	it('propagates API errors', async () => {
		mockEmbed.mock.mockImplementation(async () => {
			throw new Error('Voyage API error');
		});

		await assert.rejects(
			() => generateEmbedding('valid text'),
			{ message: 'Voyage API error' },
		);
	});

	it('calls Voyage AI with correct model and input format', async () => {
		mockEmbed.mock.resetCalls();
		mockEmbed.mock.mockImplementation(async (params) => {
			assert.deepEqual(params.input, ['test message']);
			assert.equal(params.model, 'voyage-3');
			return { data: [{ embedding: new Array(1024).fill(0) }] };
		});

		await generateEmbedding('test message');
		assert.equal(mockEmbed.mock.callCount(), 1);
	});
});
