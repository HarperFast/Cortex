import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from './client.js';
import { Synapse } from './synapse.js';

describe('Synapse', () => {
	let synapse: Synapse;
	let httpClient: HttpClient;

	beforeEach(() => {
		httpClient = new HttpClient({
			instanceUrl: 'https://test.harpercloud.com',
			token: 'test-token',
			schema: 'data',
		});
		synapse = new Synapse(httpClient);
	});

	describe('search', () => {
		it('should perform a semantic search', async () => {
			const mockResponse = {
				results: [
					{
						id: 'entry-1',
						projectId: 'my-project',
						type: 'intent',
						content: 'Use microservices for scalability',
						summary: 'Microservices decision',
						$distance: 0.15,
					},
				],
				count: 1,
			};

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => mockResponse,
				}),
			);

			const result = await synapse.search('architecture', {
				projectId: 'my-project',
				limit: 5,
			});

			expect(result.count).toBe(1);
			expect(result.results).toHaveLength(1);
			expect(result.results[0].id).toBe('entry-1');
			expect(result.results[0].similarity).toBeCloseTo(0.85);
		});

		it('should include type filters', async () => {
			const mockResponse = { results: [], count: 0 };
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: async () => mockResponse,
			});
			vi.stubGlobal('fetch', fetchMock);

			await synapse.search('test', {
				projectId: 'my-project',
				limit: 10,
				filters: { type: 'constraint' },
			});

			expect(fetchMock).toHaveBeenCalled();
			const call = fetchMock.mock.calls[0];
			const body = JSON.parse(call[1].body);
			expect(body.filters.type).toBe('constraint');
		});
	});

	describe('ingest', () => {
		it('should ingest context from Claude Code format', async () => {
			const mockResponse = {
				stored: [
					{ summary: 'Use Redis', type: 'intent' },
					{ summary: 'Always use transactions', type: 'constraint' },
				],
				count: 2,
			};

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => mockResponse,
				}),
			);

			const result = await synapse.ingest({
				source: 'claude_code',
				content: '## Decision\nUse Redis\n\n## Constraint\nAlways use transactions',
				projectId: 'my-project',
			});

			expect(result.count).toBe(2);
			expect(result.stored).toHaveLength(2);
		});

		it('should include references in ingest request', async () => {
			const mockResponse = { stored: [], count: 0 };
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: async () => mockResponse,
			});
			vi.stubGlobal('fetch', fetchMock);

			await synapse.ingest({
				source: 'slack',
				content: 'Some context',
				projectId: 'my-project',
				references: ['doc-123', 'issue-456'],
			});

			expect(fetchMock).toHaveBeenCalled();
			const call = fetchMock.mock.calls[0];
			const body = JSON.parse(call[1].body);
			expect(body.references).toEqual(['doc-123', 'issue-456']);
		});
	});

	describe('emit', () => {
		it('should emit context in Claude Code format', async () => {
			const mockResponse = {
				target: 'claude_code',
				projectId: 'my-project',
				entryCount: 3,
				output: '# Synapse Context\n## Intents\n...',
			};

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => mockResponse,
				}),
			);

			const result = await synapse.emit({
				target: 'claude_code',
				projectId: 'my-project',
			});

			expect(result.target).toBe('claude_code');
			expect(result.entryCount).toBe(3);
			expect(typeof result.output).toBe('string');
		});

		it('should emit context in Cursor format with files', async () => {
			const mockResponse = {
				target: 'cursor',
				projectId: 'my-project',
				entryCount: 2,
				output: {
					format: 'cursor_rules',
					files: [
						{ filename: 'rule1.mdc', content: '---\ndescription: ...' },
						{ filename: 'rule2.mdc', content: '---\ndescription: ...' },
					],
				},
			};

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => mockResponse,
				}),
			);

			const result = await synapse.emit({
				target: 'cursor',
				projectId: 'my-project',
				types: ['intent'],
			});

			expect(result.target).toBe('cursor');
			expect(typeof result.output).toBe('object');
		});
	});

	describe('get', () => {
		it('should retrieve a Synapse entry by ID', async () => {
			const mockResponse = {
				id: 'entry-123',
				projectId: 'my-project',
				type: 'intent',
				content: 'Use Redis for caching',
			};

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => mockResponse,
				}),
			);

			const result = await synapse.get('entry-123');

			expect(result.id).toBe('entry-123');
			expect(result.type).toBe('intent');
		});
	});

	describe('delete', () => {
		it('should delete a Synapse entry by ID', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ success: true }),
				}),
			);

			const result = await synapse.delete('entry-123');

			expect(result.success).toBe(true);
		});
	});
});
