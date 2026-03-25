/**
 * Type stubs for OpenClaw plugin SDK
 * Since the official package doesn't exist on npm yet, we define the minimal interface
 */

export interface PluginAPI {
	/** The plugin configuration from the OpenClaw settings */
	pluginConfig: Record<string, any>;

	/**
	 * Register a lifecycle hook
	 * @param hookName - The lifecycle event name
	 * @param handler - The hook handler function
	 */
	registerLifecycleHook(
		hookName: string,
		handler: (context: any) => Promise<any> | any,
	): void;

	/**
	 * Register tool(s) for the agent
	 * @param factory - Function that creates tool definitions
	 * @param options - Options including which tools to register
	 */
	registerTool(
		factory: (context: any) => Record<string, any>,
		options?: { names?: string[] },
	): void;

	/**
	 * Register CLI command handler
	 * @param handler - Function that registers commands with the CLI
	 */
	registerCli(handler: (cli: CliContext) => void): void;
}

export interface CliContext {
	program: any; // Commander.js Program instance
}

export interface PluginEntry {
	/** Unique plugin ID */
	id: string;

	/** Human-readable plugin name */
	name: string;

	/** Plugin description */
	description: string;

	/** Plugin kind/category */
	kind: string;

	/** Plugin registration function */
	register(api: PluginAPI): void | Promise<void>;
}

/**
 * Define a plugin entry point
 * @param entry - The plugin configuration
 * @returns The plugin entry
 */
export function definePluginEntry(entry: PluginEntry): PluginEntry {
	return entry;
}

/**
 * Lifecycle hook names
 */
export const LIFECYCLE_HOOKS = {
	BEFORE_AGENT_START: 'before_agent_start',
	AGENT_END: 'agent_end',
	ON_ERROR: 'on_error',
	BEFORE_TOOL_CALL: 'before_tool_call',
	AFTER_TOOL_CALL: 'after_tool_call',
} as const;
