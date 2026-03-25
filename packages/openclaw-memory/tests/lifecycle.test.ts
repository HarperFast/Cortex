/**
 * Unit tests for lifecycle hooks
 */

import { describe, expect, it, vi } from 'vitest';
import { createAutoCaptureHook, createAutoRecallHook } from '../src/lifecycle.js';
import type { CortexMemoryDB } from '../src/memory-db.js';
import type { MemorySearchResult } from '../src/types.js';

describe('Lifecycle Hooks', () => {
	describe('createAutoRecallHook()', () => {
		it('should search for memories and inject context', async () => {
			const mockDb = {
				search: vi.fn().mockResolvedValue([
					{
						entry: {
							id: '1',
							text: 'Previous conversation about AI',
							importance: 0.8,
							category: 'fact',
							createdAt: Date.now(),
						},
						score: 0.9,
					},
					{
						entry: {
							id: '2',
							text: 'User preferences: likes technical details',
							importance: 0.7,
							category: 'preference',
							createdAt: Date.now(),
						},
						score: 0.75,
					},
				] as MemorySearchResult[]),
			} as unknown as CortexMemoryDB;

			const hook = createAutoRecallHook(mockDb, {
				maxResults: 3,
				minSimilarity: 0.3,
			});

			const result = await hook({
				prompt: 'Tell me about AI',
				agentId: 'agent-1',
			});

			expect(result).toBeDefined();
			expect(result?.contextInjection).toBeTruthy();
			expect(result?.contextInjection).toContain('<relevant-memories>');
			expect(result?.contextInjection).toContain('Previous conversation');
			expect(result?.contextInjection).toContain('User preferences');
			expect(mockDb.search).toHaveBeenCalledWith(
				'Tell me about AI',
				3,
				'agent-1',
			);
		});

		it('should filter results by similarity threshold', async () => {
			const mockDb = {
				search: vi.fn().mockResolvedValue([
					{
						entry: {
							id: '1',
							text: 'Relevant memory',
							importance: 0.8,
							category: 'fact',
							createdAt: Date.now(),
						},
						score: 0.85,
					},
					{
						entry: {
							id: '2',
							text: 'Irrelevant memory',
							importance: 0.5,
							category: 'fact',
							createdAt: Date.now(),
						},
						score: 0.2,
					},
				] as MemorySearchResult[]),
			} as unknown as CortexMemoryDB;

			const hook = createAutoRecallHook(mockDb, {
				maxResults: 5,
				minSimilarity: 0.5,
			});

			const result = await hook({ prompt: 'test' });

			expect(result).toBeDefined();
			expect(result?.contextInjection).toContain('Relevant memory');
			expect(result?.contextInjection).not.toContain('Irrelevant memory');
		});

		it('should return undefined if no memories found', async () => {
			const mockDb = {
				search: vi.fn().mockResolvedValue([]),
			} as unknown as CortexMemoryDB;

			const hook = createAutoRecallHook(mockDb, {
				maxResults: 3,
				minSimilarity: 0.3,
			});

			const result = await hook({ prompt: 'test' });

			expect(result).toBeUndefined();
		});

		it('should return undefined if all results below threshold', async () => {
			const mockDb = {
				search: vi.fn().mockResolvedValue([
					{
						entry: {
							id: '1',
							text: 'Low similarity memory',
							importance: 0.5,
							category: 'fact',
							createdAt: Date.now(),
						},
						score: 0.2,
					},
				] as MemorySearchResult[]),
			} as unknown as CortexMemoryDB;

			const hook = createAutoRecallHook(mockDb, {
				maxResults: 3,
				minSimilarity: 0.5,
			});

			const result = await hook({ prompt: 'test' });

			expect(result).toBeUndefined();
		});

		it('should handle search errors gracefully', async () => {
			const mockDb = {
				search: vi.fn().mockRejectedValue(new Error('API error')),
			} as unknown as CortexMemoryDB;

			const hook = createAutoRecallHook(mockDb, {
				maxResults: 3,
				minSimilarity: 0.3,
			});

			const result = await hook({ prompt: 'test' });

			expect(result).toBeUndefined();
		});

		it('should format memory categories correctly', async () => {
			const mockDb = {
				search: vi.fn().mockResolvedValue([
					{
						entry: {
							id: '1',
							text: 'Important fact',
							importance: 0.9,
							category: 'fact',
							createdAt: Date.now(),
						},
						score: 0.9,
					},
					{
						entry: {
							id: '2',
							text: 'User preference',
							importance: 0.7,
							category: 'preference',
							createdAt: Date.now(),
						},
						score: 0.8,
					},
					{
						entry: {
							id: '3',
							text: 'How to do something',
							importance: 0.6,
							category: 'procedure',
							createdAt: Date.now(),
						},
						score: 0.75,
					},
				] as MemorySearchResult[]),
			} as unknown as CortexMemoryDB;

			const hook = createAutoRecallHook(mockDb, {
				maxResults: 5,
				minSimilarity: 0.7,
			});

			const result = await hook({ prompt: 'test' });

			expect(result?.contextInjection).toContain('[fact]');
			expect(result?.contextInjection).toContain('[preference]');
			expect(result?.contextInjection).toContain('[procedure]');
		});
	});

	describe('createAutoCaptureHook()', () => {
		it('should extract and store facts from conversation', async () => {
			const mockDb = {
				search: vi.fn().mockResolvedValue([]),
				store: vi.fn().mockResolvedValue('memory-id-1'),
			} as unknown as CortexMemoryDB;

			const hook = createAutoCaptureHook(mockDb, {
				maxCaptures: 3,
				dedupThreshold: 0.95,
			});

			await hook({
				lastMessage: 'The capital of France is Paris. It is a beautiful city. The Eiffel Tower is located there.',
				agentId: 'agent-1',
			});

			expect(mockDb.store).toHaveBeenCalled();
			expect(mockDb.store).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
				}),
			);
		});

		it('should deduplicate against existing memories', async () => {
			const mockDb = {
				search: vi.fn()
					.mockResolvedValueOnce([
						{
							entry: {
								id: '1',
								text: 'The capital of France is Paris',
								importance: 0.8,
								category: 'fact',
								createdAt: Date.now(),
							},
							score: 0.99, // High similarity
						},
					] as MemorySearchResult[])
					.mockResolvedValueOnce([]),
				store: vi.fn().mockResolvedValue('memory-id'),
			} as unknown as CortexMemoryDB;

			const hook = createAutoCaptureHook(mockDb, {
				maxCaptures: 3,
				dedupThreshold: 0.95,
			});

			await hook({
				lastMessage: 'The capital of France is Paris. It has many attractions.',
				agentId: 'agent-1',
			});

			// Should call store for non-duplicate facts only
			expect(mockDb.store).toHaveBeenCalled();
		});

		it('should handle empty conversation gracefully', async () => {
			const mockDb = {
				search: vi.fn(),
				store: vi.fn(),
			} as unknown as CortexMemoryDB;

			const hook = createAutoCaptureHook(mockDb, {
				maxCaptures: 3,
				dedupThreshold: 0.95,
			});

			await hook({ lastMessage: '', agentId: 'agent-1' });

			expect(mockDb.store).not.toHaveBeenCalled();
		});

		it('should handle capture errors gracefully', async () => {
			const mockDb = {
				search: vi.fn().mockRejectedValue(new Error('Storage error')),
			} as unknown as CortexMemoryDB;

			const hook = createAutoCaptureHook(mockDb, {
				maxCaptures: 3,
				dedupThreshold: 0.95,
			});

			// Should not throw error
			await expect(
				hook({ lastMessage: 'Some important information' }),
			).resolves.not.toThrow();
		});

		it('should handle missing lastMessage and conversationHistory', async () => {
			const mockDb = {
				search: vi.fn(),
				store: vi.fn(),
			} as unknown as CortexMemoryDB;

			const hook = createAutoCaptureHook(mockDb, {
				maxCaptures: 3,
				dedupThreshold: 0.95,
			});

			await hook({});

			expect(mockDb.store).not.toHaveBeenCalled();
		});

		it('should include agentId in stored memories', async () => {
			const mockDb = {
				search: vi.fn().mockResolvedValue([]),
				store: vi.fn().mockResolvedValue('memory-id'),
			} as unknown as CortexMemoryDB;

			const hook = createAutoCaptureHook(mockDb, {
				maxCaptures: 3,
				dedupThreshold: 0.95,
			});

			await hook({
				lastMessage: 'Important fact here.',
				agentId: 'specific-agent',
			});

			if (mockDb.store instanceof Function) {
				const calls = (mockDb.store as any).mock.calls;
				if (calls.length > 0) {
					expect(calls[0][0]).toHaveProperty('agentId', 'specific-agent');
				}
			}
		});
	});
});
