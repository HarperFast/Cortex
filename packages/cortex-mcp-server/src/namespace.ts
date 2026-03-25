/**
 * Namespace enforcement for multi-tenant mode
 *
 * Wraps tool contexts to inject the tenant's namespace into all queries.
 * Client-provided agentId/namespace values are OVERWRITTEN.
 */

import type { TenantContext } from './types.js';

interface ToolContext {
	cortexUrl: string;
	cortexToken?: string;
	cortexSchema?: string;
	userId?: string;
}

/**
 * Create a tool context bound to a tenant's namespace
 * In multi-tenant mode, userId is always the tenant namespace
 */
export function bindNamespace(
	baseContext: ToolContext,
	tenant: TenantContext,
): ToolContext {
	return {
		...baseContext,
		userId: tenant.namespace, // Force namespace from JWT
	};
}

/**
 * Enforce namespace on filters — overwrite any client-provided agentId
 */
export function enforceNamespaceOnFilters(
	filters: Record<string, any> | undefined,
	namespace: string,
): Record<string, any> {
	return {
		...(filters || {}),
		agentId: namespace, // ALWAYS override
	};
}

/**
 * Verify a record belongs to the tenant's namespace
 * Used for recall/forget by ID — prevents cross-tenant access
 * Returns false (not 403) to avoid leaking record existence
 */
export function verifyRecordOwnership(
	record: { agentId?: string } | null | undefined,
	namespace: string,
): boolean {
	if (!record) { return false; }
	return record.agentId === namespace;
}
