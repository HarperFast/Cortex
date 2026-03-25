/**
 * Safety utilities: injection detection, content filtering, sanitization for MCP
 * Ported from OpenClaw with MCP-specific pattern additions
 */

/**
 * Detects common injection patterns in memory content.
 * Prevents prompt injection, SQL injection-like attacks, and other malicious content.
 * Includes MCP-specific delimiter and instruction tag patterns.
 */
export function detectInjection(text: string): {
	detected: boolean;
	patterns: string[];
	cleaned: string;
} {
	const patterns: string[] = [];
	let cleaned = text;

	// List of injection patterns to detect
	const injectionPatterns = [
		// Prompt injection markers
		{
			pattern: /\{system.*?\}/gi,
			description: '{system...} markers',
		},
		{
			pattern: /ignore.*?previous.*?instructions/gi,
			description: 'Ignore instructions',
		},
		{
			pattern: /forget.*?(?:all|previous|prior)/gi,
			description: 'Forget instructions',
		},
		{
			pattern: /as an? ai/gi,
			description: 'AI role claim',
		},
		{
			pattern: /user jailbreak/gi,
			description: 'Jailbreak attempt',
		},
		// SQL-like injection (though we're not using SQL)
		{
			pattern: /['"];?.*?(?:drop|delete|insert|update|union|select)/gi,
			description: 'SQL-like injection',
		},
		// Suspicious script markers
		{
			pattern: /<script[^>]*>.*?<\/script>/gi,
			description: 'Script tags',
		},
		{
			pattern: /javascript:/gi,
			description: 'JavaScript protocol',
		},
		// MCP-specific patterns
		{
			pattern: /<\|.*?\|>/g,
			description: 'Delimiter injection (MCP markers)',
		},
		{
			pattern: /\[INST\].*?\[\/INST\]/gi,
			description: 'Instruction tags',
		},
		{
			pattern: /\bsystem:\s/gi,
			description: 'Role prefix injection',
		},
	];

	// Check for each pattern
	for (const { pattern, description } of injectionPatterns) {
		if (pattern.test(text)) {
			patterns.push(description);
			// Remove the matching content
			cleaned = cleaned.replace(pattern, '');
		}
	}

	return {
		detected: patterns.length > 0,
		patterns,
		cleaned: cleaned.trim(),
	};
}

/**
 * Filter content for safety and quality.
 * Removes or normalizes problematic characters and content.
 */
export function filterContent(text: string): string {
	// Remove null bytes
	let filtered = text.replace(/\0/g, '');

	// Remove excessive whitespace
	filtered = filtered.replace(/\s+/g, ' ').trim();

	// Remove control characters except newlines and tabs
	filtered = filtered.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

	// Normalize Unicode (NFKC normalization)
	filtered = filtered.normalize('NFKC');

	// Truncate if too long (16KB soft limit)
	if (filtered.length > 16000) {
		filtered = filtered.substring(0, 16000).trim();
	}

	return filtered;
}

/**
 * Sanitize memory text for storage.
 * Combines injection detection and content filtering.
 * Returns an object with sanitized content, blocked flag, and warnings.
 * The caller decides whether to reject or store the sanitized version.
 */
export function sanitizeForStorage(text: string): {
	sanitized: string;
	blocked: boolean;
	warnings: string[];
} {
	const warnings: string[] = [];

	// Run injection detection
	const injection = detectInjection(text);
	if (injection.detected) {
		warnings.push(
			`Injection detected and removed: ${injection.patterns.join(', ')}`,
		);
	}

	// Run content filtering
	const filtered = filterContent(injection.cleaned);

	// Validate output
	if (filtered.length === 0) {
		warnings.push('Memory content was empty or entirely filtered');
	}

	if (filtered.length < 10) {
		warnings.push('Memory content is very short (< 10 chars)');
	}

	// Determine if we should block (injection detected)
	const blocked = injection.detected;

	return {
		sanitized: filtered,
		blocked,
		warnings,
	};
}

/**
 * Sanitize memory text for retrieval.
 * Lighter pass for content being returned to the AI client.
 * Strips HTML tags, script markers, and normalizes whitespace.
 * Prevents stored injection payloads from reaching the LLM even if they got past store-time checks.
 */
export function sanitizeForRetrieval(text: string): string {
	let sanitized = text;

	// Remove HTML tags
	sanitized = sanitized.replace(/<[^>]*>/g, '');

	// Remove script markers
	sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
	sanitized = sanitized.replace(/javascript:/gi, '');

	// Normalize whitespace
	sanitized = sanitized.replace(/\s+/g, ' ').trim();

	// Remove null bytes
	sanitized = sanitized.replace(/\0/g, '');

	// Remove control characters except newlines and tabs
	sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

	// Normalize Unicode
	sanitized = sanitized.normalize('NFKC');

	return sanitized;
}
