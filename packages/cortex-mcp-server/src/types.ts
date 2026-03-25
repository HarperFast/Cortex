/**
 * Shared configuration and interfaces for cortex-mcp-server
 */

export interface ServerConfig {
	cortexUrl: string;
	cortexToken?: string;
	cortexSchema?: string;
	port: number;
	host?: string;
	authRequired?: boolean;
	multiTenant?: boolean;
	jwksUrl?: string;
	adminToken?: string;
}

export interface AuthContext {
	token?: string;
	userId?: string;
	isValid: boolean;
}

export interface JWTClaims {
	sub: string; // tenantId
	ns: string; // namespace (maps to agentId)
	aud: string; // "cortex-mcp"
	iss: string; // "harper-auth"
	exp: number;
	iat: number;
	jti?: string; // token ID for revocation
	scopes: string[]; // ["memory:read", "memory:write", "synapse:read", "synapse:write"]
	tier?: string; // "free" | "team" | "enterprise" (defaults to "free")
}

export interface TenantContext {
	tenantId: string;
	namespace: string;
	scopes: string[];
	token: string;
	tier?: string;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetMs: number;
	bucket: string;
}

export interface RateLimitTier {
	readsPerMin: number;
	writesPerMin: number;
	embedsPerMin: number;
	maxMemories: number;
	maxSynapseEntries: number;
}
