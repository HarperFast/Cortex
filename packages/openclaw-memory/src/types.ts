/**
 * Shared types and interfaces for the Harper OpenClaw memory plugin
 */

export interface HarperMemoryConfig {
	/** Cortex instance URL (required) */
	instanceUrl: string;

	/** Optional authentication token for Cortex */
	token?: string;

	/** Cortex table name for memory storage (default: "agent_memory") */
	table?: string;

	/** Cortex schema/database name (default: "data") */
	schema?: string;

	/** Optional agent ID for multi-agent isolation */
	agentId?: string;

	/** Max results returned by auto-recall (default: 3) */
	recallLimit?: number;

	/** Similarity threshold for auto-recall (0-1, default: 0.3) */
	recallThreshold?: number;

	/** Max facts extracted by auto-capture (default: 3) */
	captureLimit?: number;

	/** Deduplication similarity threshold (0-1, default: 0.95) */
	dedupThreshold?: number;
}

export interface MemoryEntry {
	/** Unique identifier for the memory (UUID) */
	id: string;

	/** The actual memory text content */
	text: string;

	/** Importance score (0-1) */
	importance: number;

	/** Category: "fact", "preference", "procedure", "event", or custom */
	category: string;

	/** Optional agent ID for multi-agent isolation */
	agentId?: string;

	/** Creation timestamp (milliseconds since epoch) */
	createdAt: number;

	/** Additional metadata */
	[key: string]: any;
}

export interface MemorySearchResult {
	/** The memory entry */
	entry: MemoryEntry;

	/** Similarity score (0-1) */
	score: number;
}

export interface AutoRecallOptions {
	/** Maximum number of memories to retrieve */
	maxResults: number;

	/** Minimum similarity threshold for inclusion */
	minSimilarity: number;
}

export interface AutoCaptureOptions {
	/** Maximum number of facts to extract per turn */
	maxCaptures: number;

	/** Deduplication threshold (0-1) */
	dedupThreshold: number;
}

export interface ContextInjection {
	/** Context block to inject into the agent's system prompt */
	contextInjection: string;
}

export interface ToolContext {
	/** The OpenClaw agent context */
	agentId?: string;
	[key: string]: any;
}

export interface InjectionDetectionResult {
	/** Whether potential injection was detected */
	detected: boolean;

	/** List of injection patterns found (if any) */
	patterns: string[];

	/** Cleaned text (with injection patterns removed) */
	cleaned: string;
}

export interface DeduplicationOptions {
	/** Similarity threshold above which to consider duplicates */
	threshold: number;

	/** Existing memories to check against */
	existingMemories: MemoryEntry[];
}
