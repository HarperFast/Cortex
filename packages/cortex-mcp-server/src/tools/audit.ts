/**
 * Audit logging for content safety events
 */

import { randomUUID } from 'node:crypto';

interface AuditContext {
	cortexUrl: string;
	cortexToken?: string;
	cortexSchema?: string;
}

export async function logAuditEvent(
	context: AuditContext,
	event: {
		tenantId: string;
		action: 'blocked' | 'sanitized' | 'stored' | 'recalled' | 'deleted';
		memoryId?: string;
		detectedPatterns?: string[];
		contentHash?: string;
		source: string;
		reason?: string;
	},
): Promise<void> {
	try {
		const schema = context.cortexSchema || 'data';
		const entry = {
			id: randomUUID(),
			tenantId: event.tenantId,
			timestamp: new Date().toISOString(),
			action: event.action,
			memoryId: event.memoryId || null,
			detectedPatterns: event.detectedPatterns || [],
			contentHash: event.contentHash || null,
			source: event.source,
			reason: event.reason || null,
		};

		await fetch(new URL(`/${schema}/ContentAuditLog`, context.cortexUrl).toString(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(context.cortexToken ? { 'Authorization': `Bearer ${context.cortexToken}` } : {}),
			},
			body: JSON.stringify(entry),
		});
	} catch {
		// Audit log failure should not block the operation
		// In production, emit a metric or log to stderr
		console.error('[audit] Failed to write audit log event');
	}
}
