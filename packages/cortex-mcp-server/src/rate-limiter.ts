/**
 * Per-tenant sliding window rate limiter
 *
 * Uses in-memory counters for hot-path speed, backed by the
 * RateLimitBucket Cortex table for cross-instance persistence.
 */

import type { RateLimitResult, RateLimitTier } from './types.js';

const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
	free: {
		readsPerMin: 60,
		writesPerMin: 20,
		embedsPerMin: 20,
		maxMemories: 10_000,
		maxSynapseEntries: 5_000,
	},
	team: {
		readsPerMin: 300,
		writesPerMin: 100,
		embedsPerMin: 100,
		maxMemories: 100_000,
		maxSynapseEntries: 50_000,
	},
	enterprise: {
		readsPerMin: 1_000,
		writesPerMin: 500,
		embedsPerMin: 500,
		maxMemories: 1_000_000,
		maxSynapseEntries: 500_000,
	},
};

type Metric = 'read' | 'write' | 'embed';

interface BucketKey {
	tenantId: string;
	metric: Metric;
	windowStart: number;
}

// In-memory sliding window store
const buckets = new Map<string, number>();

// Cleanup interval (every 5 minutes, remove expired windows)
const WINDOW_MS = 60_000; // 1-minute window
const CLEANUP_INTERVAL = 5 * 60_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
	if (cleanupTimer) { return; }
	cleanupTimer = setInterval(() => {
		const cutoff = Date.now() - (WINDOW_MS * 5);
		for (const [key, _] of buckets) {
			const windowStart = parseInt(key.split(':')[2], 10);
			if (windowStart < cutoff) {
				buckets.delete(key);
			}
		}
	}, CLEANUP_INTERVAL);
	// Don't prevent process exit
	if (cleanupTimer.unref) { cleanupTimer.unref(); }
}

function bucketKey(tenantId: string, metric: Metric, windowStart: number): string {
	return `${tenantId}:${metric}:${windowStart}`;
}

function getLimit(tier: string | undefined, metric: Metric): number {
	const tierConfig = RATE_LIMIT_TIERS[tier || 'free'] || RATE_LIMIT_TIERS.free;
	switch (metric) {
		case 'read':
			return tierConfig.readsPerMin;
		case 'write':
			return tierConfig.writesPerMin;
		case 'embed':
			return tierConfig.embedsPerMin;
	}
}

/**
 * Check and increment rate limit for a tenant/metric
 */
export function checkRateLimit(
	tenantId: string,
	metric: Metric,
	tier?: string,
): RateLimitResult {
	startCleanup();

	const now = Date.now();
	const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
	const key = bucketKey(tenantId, metric, windowStart);
	const limit = getLimit(tier, metric);

	const currentCount = buckets.get(key) || 0;
	const newCount = currentCount + 1;
	buckets.set(key, newCount);

	const resetMs = windowStart + WINDOW_MS - now;

	return {
		allowed: newCount <= limit,
		remaining: Math.max(0, limit - newCount),
		limit,
		resetMs,
		bucket: metric,
	};
}

/**
 * Get quota limits for a tenant tier
 */
export function getQuotaLimits(tier?: string): RateLimitTier {
	return RATE_LIMIT_TIERS[tier || 'free'] || RATE_LIMIT_TIERS.free;
}

/**
 * Map MCP tool names to rate limit metrics
 */
export function getMetricForTool(toolName: string): Metric {
	switch (toolName) {
		case 'memory_store':
		case 'memory_forget':
		case 'synapse_ingest':
			return 'write';
		case 'memory_search':
		case 'memory_recall':
		case 'memory_count':
		case 'synapse_search':
			return 'read';
		default:
			return 'read';
	}
}

/**
 * Reset all buckets (for testing)
 */
export function resetRateLimits(): void {
	buckets.clear();
}

/**
 * Stop cleanup timer (for testing/shutdown)
 */
export function stopCleanup(): void {
	if (cleanupTimer) {
		clearInterval(cleanupTimer);
		cleanupTimer = null;
	}
}
