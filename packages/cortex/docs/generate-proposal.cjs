const fs = require('fs');
const {
	Document,
	Packer,
	Paragraph,
	TextRun,
	Table,
	TableRow,
	TableCell,
	HeadingLevel,
	AlignmentType,
	BorderStyle,
	WidthType,
	ShadingType,
	LevelFormat,
	Header,
	Footer,
	PageNumber,
	PageBreak,
	ExternalHyperlink,
} = require('docx');

// Colors
const BRAND_BLUE = '1A5276';
const LIGHT_BLUE = 'D6EAF8';
const HEADER_BG = '2E86C1';
const DARK_TEXT = '2C3E50';
const MEDIUM_GRAY = '7F8C8D';
const LIGHT_GRAY = 'F2F3F4';
const WHITE = 'FFFFFF';

const border = { style: BorderStyle.SINGLE, size: 1, color: 'BDC3C7' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
	top: { style: BorderStyle.NONE, size: 0, color: WHITE },
	bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
	left: { style: BorderStyle.NONE, size: 0, color: WHITE },
	right: { style: BorderStyle.NONE, size: 0, color: WHITE },
};
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// Page constants
const PAGE_WIDTH = 12240;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9360

function headerCell(text, width) {
	return new TableCell({
		borders,
		width: { size: width, type: WidthType.DXA },
		shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
		margins: cellMargins,
		verticalAlign: 'center',
		children: [
			new Paragraph({
				children: [
					new TextRun({ text, bold: true, color: WHITE, font: 'Arial', size: 20 }),
				],
			}),
		],
	});
}

function dataCell(text, width, opts = {}) {
	const runs = [];
	if (opts.bold) {
		runs.push(new TextRun({ text, bold: true, font: 'Arial', size: 20, color: DARK_TEXT }));
	} else if (opts.code) {
		runs.push(new TextRun({ text, font: 'Courier New', size: 18, color: DARK_TEXT }));
	} else {
		runs.push(new TextRun({ text, font: 'Arial', size: 20, color: DARK_TEXT }));
	}
	return new TableCell({
		borders,
		width: { size: width, type: WidthType.DXA },
		shading: opts.shaded
			? { fill: LIGHT_GRAY, type: ShadingType.CLEAR }
			: { fill: WHITE, type: ShadingType.CLEAR },
		margins: cellMargins,
		children: [new Paragraph({ children: runs })],
	});
}

function heading(text, level) {
	return new Paragraph({
		heading: level,
		spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120 },
		children: [new TextRun({ text, font: 'Arial', color: BRAND_BLUE })],
	});
}

function bodyText(text, opts = {}) {
	return new Paragraph({
		spacing: { after: 160 },
		children: [
			new TextRun({
				text,
				font: 'Arial',
				size: 22,
				color: DARK_TEXT,
				bold: opts.bold || false,
				italics: opts.italic || false,
			}),
		],
	});
}

function mixedParagraph(runs) {
	return new Paragraph({
		spacing: { after: 160 },
		children: runs.map(
			(r) =>
				new TextRun({
					text: r.text,
					font: r.code ? 'Courier New' : 'Arial',
					size: r.code ? 18 : 22,
					color: DARK_TEXT,
					bold: r.bold || false,
					italics: r.italic || false,
				}),
		),
	});
}

function codeBlock(lines) {
	return new Table({
		width: { size: CONTENT_WIDTH, type: WidthType.DXA },
		columnWidths: [CONTENT_WIDTH],
		rows: [
			new TableRow({
				children: [
					new TableCell({
						borders: {
							top: { style: BorderStyle.SINGLE, size: 1, color: 'BDC3C7' },
							bottom: { style: BorderStyle.SINGLE, size: 1, color: 'BDC3C7' },
							left: { style: BorderStyle.SINGLE, size: 4, color: HEADER_BG },
							right: { style: BorderStyle.SINGLE, size: 1, color: 'BDC3C7' },
						},
						width: { size: CONTENT_WIDTH, type: WidthType.DXA },
						shading: { fill: 'F8F9FA', type: ShadingType.CLEAR },
						margins: { top: 100, bottom: 100, left: 200, right: 200 },
						children: lines.map(
							(line) =>
								new Paragraph({
									spacing: { after: 40 },
									children: [
										new TextRun({
											text: line,
											font: 'Courier New',
											size: 17,
											color: DARK_TEXT,
										}),
									],
								}),
						),
					}),
				],
			}),
		],
	});
}

function spacer(size = 200) {
	return new Paragraph({ spacing: { after: size }, children: [] });
}

// Build the document
const doc = new Document({
	styles: {
		default: {
			document: {
				run: { font: 'Arial', size: 22, color: DARK_TEXT },
			},
		},
		paragraphStyles: [
			{
				id: 'Heading1',
				name: 'Heading 1',
				basedOn: 'Normal',
				next: 'Normal',
				quickFormat: true,
				run: { size: 36, bold: true, font: 'Arial', color: BRAND_BLUE },
				paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
			},
			{
				id: 'Heading2',
				name: 'Heading 2',
				basedOn: 'Normal',
				next: 'Normal',
				quickFormat: true,
				run: { size: 28, bold: true, font: 'Arial', color: BRAND_BLUE },
				paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
			},
			{
				id: 'Heading3',
				name: 'Heading 3',
				basedOn: 'Normal',
				next: 'Normal',
				quickFormat: true,
				run: { size: 24, bold: true, font: 'Arial', color: BRAND_BLUE },
				paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
			},
		],
	},
	numbering: {
		config: [
			{
				reference: 'bullets',
				levels: [
					{
						level: 0,
						format: LevelFormat.BULLET,
						text: '\u2022',
						alignment: AlignmentType.LEFT,
						style: { paragraph: { indent: { left: 720, hanging: 360 } } },
					},
				],
			},
			{
				reference: 'numbered',
				levels: [
					{
						level: 0,
						format: LevelFormat.DECIMAL,
						text: '%1.',
						alignment: AlignmentType.LEFT,
						style: { paragraph: { indent: { left: 720, hanging: 360 } } },
					},
				],
			},
			{
				reference: 'checks',
				levels: [
					{
						level: 0,
						format: LevelFormat.BULLET,
						text: '\u2610',
						alignment: AlignmentType.LEFT,
						style: { paragraph: { indent: { left: 720, hanging: 360 } } },
					},
				],
			},
		],
	},
	sections: [
		// --- COVER PAGE ---
		{
			properties: {
				page: {
					size: { width: PAGE_WIDTH, height: 15840 },
					margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
				},
			},
			children: [
				spacer(2400),
				new Paragraph({
					alignment: AlignmentType.CENTER,
					spacing: { after: 200 },
					children: [
						new TextRun({
							text: 'Cortex x OpenClaw',
							font: 'Arial',
							size: 52,
							bold: true,
							color: BRAND_BLUE,
						}),
					],
				}),
				new Paragraph({
					alignment: AlignmentType.CENTER,
					spacing: { after: 600 },
					children: [
						new TextRun({
							text: 'Memory Plugin Integration Proposal',
							font: 'Arial',
							size: 36,
							color: MEDIUM_GRAY,
						}),
					],
				}),
				new Paragraph({
					alignment: AlignmentType.CENTER,
					border: {
						top: { style: BorderStyle.SINGLE, size: 2, color: HEADER_BG, space: 12 },
					},
					spacing: { before: 400, after: 200 },
					children: [
						new TextRun({
							text: 'Prepared by the Cortex Team',
							font: 'Arial',
							size: 24,
							color: MEDIUM_GRAY,
						}),
					],
				}),
				new Paragraph({
					alignment: AlignmentType.CENTER,
					children: [
						new TextRun({
							text: 'March 2026',
							font: 'Arial',
							size: 24,
							color: MEDIUM_GRAY,
						}),
					],
				}),
				spacer(1200),
				new Paragraph({
					alignment: AlignmentType.CENTER,
					children: [
						new TextRun({
							text: 'CONFIDENTIAL',
							font: 'Arial',
							size: 20,
							bold: true,
							color: MEDIUM_GRAY,
						}),
					],
				}),
			],
		},
		// --- MAIN CONTENT ---
		{
			properties: {
				page: {
					size: { width: PAGE_WIDTH, height: 15840 },
					margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
				},
			},
			headers: {
				default: new Header({
					children: [
						new Paragraph({
							border: {
								bottom: {
									style: BorderStyle.SINGLE,
									size: 4,
									color: HEADER_BG,
									space: 8,
								},
							},
							spacing: { after: 200 },
							children: [
								new TextRun({
									text: 'Cortex x OpenClaw  |  Integration Proposal',
									font: 'Arial',
									size: 16,
									color: MEDIUM_GRAY,
								}),
							],
						}),
					],
				}),
			},
			footers: {
				default: new Footer({
					children: [
						new Paragraph({
							alignment: AlignmentType.CENTER,
							children: [
								new TextRun({
									text: 'Page ',
									font: 'Arial',
									size: 16,
									color: MEDIUM_GRAY,
								}),
								new TextRun({
									children: [PageNumber.CURRENT],
									font: 'Arial',
									size: 16,
									color: MEDIUM_GRAY,
								}),
							],
						}),
					],
				}),
			},
			children: [
				// --- EXECUTIVE SUMMARY ---
				heading('Executive Summary', HeadingLevel.HEADING_1),
				bodyText(
					'This proposal outlines a two-phase plan to integrate Cortex as a memory backend for OpenClaw, the fastest-growing open-source AI agent framework (200k+ GitHub stars). Cortex provides a production-ready vector database with semantic search, classification, and MCP connectivity. OpenClaw has a fully pluggable memory architecture with existing backends including Mem0, Cognee, and LanceDB.',
				),
				bodyText(
					'The integration delivers immediate value through MCP compatibility (zero code changes) and long-term depth through a native memory plugin with automatic recall and capture on every agent turn.',
				),
				spacer(100),

				// --- BACKGROUND ---
				heading('Background', HeadingLevel.HEADING_1),
				heading('What is OpenClaw?', HeadingLevel.HEADING_2),
				bodyText(
					'OpenClaw (formerly Clawdbot/Moltbot) is a free, open-source, autonomous AI agent framework created by Peter Steinberger. It runs as a persistent Node.js daemon and connects large language models (Claude, GPT, Gemini, etc.) to messaging apps, APIs, and developer tools. It is reportedly the fastest-growing project in GitHub history, reaching 200,000+ stars within weeks of going viral in January 2026.',
				),
				heading('Why Cortex?', HeadingLevel.HEADING_2),
				bodyText(
					'Cortex is an agent-agnostic AI memory system powered by Harper Fabric with HNSW vector indexing. It already provides semantic search (MemorySearch), development context brokering (Synapse), and MCP server connectivity. The tech stack aligns perfectly: both projects are TypeScript/Node.js (22+), use ES modules, and follow similar architectural patterns.',
				),
				heading('OpenClaw Memory Ecosystem', HeadingLevel.HEADING_2),
				bodyText(
					'OpenClaw supports pluggable memory backends via its plugin system. Existing integrations include:',
				),
				new Table({
					width: { size: CONTENT_WIDTH, type: WidthType.DXA },
					columnWidths: [2800, 2000, 4560],
					rows: [
						new TableRow({
							children: [
								headerCell('Plugin', 2800),
								headerCell('Backend', 2000),
								headerCell('Approach', 4560),
							],
						}),
						new TableRow({
							children: [
								dataCell('Mem0', 2800, { bold: true }),
								dataCell('Qdrant', 2000),
								dataCell(
									'Auto-recall + auto-capture with LLM-powered fact extraction',
									4560,
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('Cognee', 2800, { bold: true, shaded: true }),
								dataCell('Knowledge Graph', 2000, { shaded: true }),
								dataCell(
									'Graph-based memory with entity/relationship context',
									4560,
									{ shaded: true },
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('LanceDB Pro', 2800, { bold: true }),
								dataCell('LanceDB', 2000),
								dataCell('Hybrid Vector+BM25 with reranking and decay', 4560),
							],
						}),
						new TableRow({
							children: [
								dataCell('Supermemory', 2800, { bold: true, shaded: true }),
								dataCell('Supermemory API', 2000, { shaded: true }),
								dataCell('Long-term memory with custom container routing', 4560, {
									shaded: true,
								}),
							],
						}),
					],
				}),
				spacer(100),

				// --- PROPOSED INTEGRATION ---
				heading('Proposed Integration', HeadingLevel.HEADING_1),
				bodyText(
					'We propose a two-phase approach that delivers immediate value with zero code changes, then builds deeper integration through a native plugin.',
				),
				new Table({
					width: { size: CONTENT_WIDTH, type: WidthType.DXA },
					columnWidths: [2000, 1500, 1500, 4360],
					rows: [
						new TableRow({
							children: [
								headerCell('Phase', 2000),
								headerCell('Effort', 1500),
								headerCell('Depth', 1500),
								headerCell('Description', 4360),
							],
						}),
						new TableRow({
							children: [
								dataCell('Phase 1: MCP', 2000, { bold: true }),
								dataCell('Near-zero', 1500),
								dataCell('Agent-initiated', 1500),
								dataCell(
									'Harper MCP server works with OpenClaw out of the box. Deliver docs and config examples.',
									4360,
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('Phase 2: Plugin', 2000, { bold: true, shaded: true }),
								dataCell('Medium', 1500, { shaded: true }),
								dataCell('Auto recall/capture', 1500, { shaded: true }),
								dataCell(
									'Native memory plugin with lifecycle hooks for automatic context injection and fact storage.',
									4360,
									{ shaded: true },
								),
							],
						}),
					],
				}),
				spacer(200),

				// --- PHASE 1 ---
				heading('Phase 1: MCP Documentation', HeadingLevel.HEADING_1),
				bodyText(
					'Cortex already exposes an MCP server that is fully compatible with OpenClaw. This phase delivers documentation and configuration examples with zero code changes to either project.',
				),
				heading('Deliverables', HeadingLevel.HEADING_2),
				new Paragraph({
					numbering: { reference: 'bullets', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'docs/openclaw-setup.md',
							font: 'Courier New',
							size: 20,
							color: DARK_TEXT,
						}),
						new TextRun({
							text: ' \u2014 Step-by-step connection guide',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				new Paragraph({
					numbering: { reference: 'bullets', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'README.md update \u2014 Add OpenClaw to MCP Clients table',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				spacer(80),
				heading('OpenClaw Configuration', HeadingLevel.HEADING_2),
				mixedParagraph([
					{ text: 'Users add this to their ' },
					{ text: 'openclaw.json', code: true },
					{ text: ':' },
				]),
				codeBlock([
					'{',
					'  "mcpServers": {',
					'    "harper-cortex": {',
					'      "command": "npx",',
					'      "args": ["-y", "mcp-remote",',
					'        "http://localhost:9926/mcp",',
					'        "--header",',
					'        "Authorization: Basic ${HARPER_AUTH}"],',
					'      "env": {',
					'        "HARPER_AUTH": "your-base64-credentials"',
					'      }',
					'    }',
					'  }',
					'}',
				]),
				spacer(80),
				heading('Exposed MCP Tools', HeadingLevel.HEADING_2),
				new Table({
					width: { size: CONTENT_WIDTH, type: WidthType.DXA },
					columnWidths: [2200, 4560, 2600],
					rows: [
						new TableRow({
							children: [
								headerCell('Endpoint', 2200),
								headerCell('Description', 4560),
								headerCell('Key Params', 2600),
							],
						}),
						new TableRow({
							children: [
								dataCell('MemorySearch', 2200, { code: true }),
								dataCell(
									'Semantic search across conversational memory',
									4560,
								),
								dataCell('query, limit, filters', 2600, { code: true }),
							],
						}),
						new TableRow({
							children: [
								dataCell('SynapseSearch', 2200, { code: true, shaded: true }),
								dataCell(
									'Semantic search across development context',
									4560,
									{ shaded: true },
								),
								dataCell('query, projectId, types', 2600, {
									code: true,
									shaded: true,
								}),
							],
						}),
						new TableRow({
							children: [
								dataCell('SynapseIngest', 2200, { code: true }),
								dataCell(
									'Ingest context from any tool format',
									4560,
								),
								dataCell('source, content, projectId', 2600, { code: true }),
							],
						}),
						new TableRow({
							children: [
								dataCell('SynapseEmit', 2200, { code: true, shaded: true }),
								dataCell(
									'Emit context in target tool native format',
									4560,
									{ shaded: true },
								),
								dataCell('target, projectId, types', 2600, {
									code: true,
									shaded: true,
								}),
							],
						}),
					],
				}),
				spacer(200),

				// --- PHASE 2 ---
				new Paragraph({ children: [new PageBreak()] }),
				heading('Phase 2: Native Memory Plugin', HeadingLevel.HEADING_1),
				mixedParagraph([
					{ text: 'A dedicated OpenClaw memory plugin (' },
					{ text: '@cortex/openclaw-memory', code: true },
					{
						text:
							') that hooks into the agent lifecycle for automatic recall and capture on every turn \u2014 matching the pattern used by Mem0 and Supermemory.',
					},
				]),

				heading('Package Structure', HeadingLevel.HEADING_2),
				codeBlock([
					'packages/openclaw-memory/',
					'\u251C\u2500\u2500 index.ts                  # Plugin entry point',
					'\u251C\u2500\u2500 openclaw.plugin.json      # Plugin manifest',
					'\u251C\u2500\u2500 package.json              # npm package config',
					'\u2514\u2500\u2500 README.md                 # Setup documentation',
				]),

				heading('Plugin Manifest', HeadingLevel.HEADING_2),
				mixedParagraph([
					{ text: 'The ' },
					{ text: 'openclaw.plugin.json', code: true },
					{
						text: ' declares the plugin as a memory backend with configurable auto-recall/capture:',
					},
				]),
				codeBlock([
					'{',
					'  "id": "memory-cortex",',
					'  "name": "Memory (Cortex)",',
					'  "kind": "memory",',
					'  "configSchema": {',
					'    "properties": {',
					'      "harperUrl": { "type": "string" },',
					'      "authHeader": { "type": "string" },',
					'      "projectId": { "type": "string" },',
					'      "autoRecall": { "type": "boolean", "default": true },',
					'      "autoCapture": { "type": "boolean", "default": true },',
					'      "topK": { "type": "number", "default": 5 }',
					'    },',
					'    "required": ["harperUrl"]',
					'  }',
					'}',
				]),
				spacer(80),

				heading('Plugin Architecture', HeadingLevel.HEADING_2),
				bodyText(
					'The plugin registers two lifecycle hooks and four agent-callable tools:',
				),
				heading('Lifecycle Hooks', HeadingLevel.HEADING_3),
				new Table({
					width: { size: CONTENT_WIDTH, type: WidthType.DXA },
					columnWidths: [2800, 6560],
					rows: [
						new TableRow({
							children: [
								headerCell('Hook', 2800),
								headerCell('Behavior', 6560),
							],
						}),
						new TableRow({
							children: [
								dataCell('before_prompt_build', 2800, { code: true }),
								dataCell(
									'Auto-recall: queries MemorySearch and SynapseSearch with the last user message, injects top-K results into agent context via prependContext',
									6560,
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('agent_end', 2800, { code: true, shaded: true }),
								dataCell(
									'Auto-capture: extracts the conversation exchange and POSTs to SynapseIngest (source: openclaw). Cortex handles classification and embedding server-side.',
									6560,
									{ shaded: true },
								),
							],
						}),
					],
				}),
				spacer(100),

				heading('Registered Tools', HeadingLevel.HEADING_3),
				new Table({
					width: { size: CONTENT_WIDTH, type: WidthType.DXA },
					columnWidths: [2200, 4160, 3000],
					rows: [
						new TableRow({
							children: [
								headerCell('Tool', 2200),
								headerCell('Description', 4160),
								headerCell('Harper Endpoint', 3000),
							],
						}),
						new TableRow({
							children: [
								dataCell('memory_search', 2200, { code: true }),
								dataCell(
									'Search memories by semantic similarity',
									4160,
								),
								dataCell('POST /MemorySearch', 3000, { code: true }),
							],
						}),
						new TableRow({
							children: [
								dataCell('memory_store', 2200, { code: true, shaded: true }),
								dataCell('Store a new memory/fact', 4160, { shaded: true }),
								dataCell('POST /SynapseIngest', 3000, {
									code: true,
									shaded: true,
								}),
							],
						}),
						new TableRow({
							children: [
								dataCell('memory_forget', 2200, { code: true }),
								dataCell('Archive a memory by ID', 4160),
								dataCell('PATCH /SynapseEntry/{id}', 3000, { code: true }),
							],
						}),
						new TableRow({
							children: [
								dataCell('context_search', 2200, { code: true, shaded: true }),
								dataCell(
									'Search development context (intents, constraints, artifacts, history)',
									4160,
									{ shaded: true },
								),
								dataCell('POST /SynapseSearch', 3000, {
									code: true,
									shaded: true,
								}),
							],
						}),
					],
				}),
				spacer(100),

				heading('User Configuration', HeadingLevel.HEADING_2),
				mixedParagraph([
					{ text: 'End users enable the plugin in their ' },
					{ text: 'openclaw.json', code: true },
					{ text: ':' },
				]),
				codeBlock([
					'{',
					'  "plugins": {',
					'    "entries": {',
					'      "@cortex/openclaw-memory": {',
					'        "enabled": true,',
					'        "config": {',
					'          "harperUrl": "http://localhost:9926",',
					'          "authHeader": "Basic dXNlcjpwYXNz",',
					'          "projectId": "my-project",',
					'          "autoRecall": true,',
					'          "autoCapture": true',
					'        }',
					'      }',
					'    },',
					'    "slots": {',
					'      "memory": "memory-cortex"',
					'    }',
					'  }',
					'}',
				]),
				spacer(200),

				// --- DESIGN DECISIONS ---
				heading('Key Design Decisions', HeadingLevel.HEADING_1),
				new Table({
					width: { size: CONTENT_WIDTH, type: WidthType.DXA },
					columnWidths: [2000, 2200, 5160],
					rows: [
						new TableRow({
							children: [
								headerCell('Decision', 2000),
								headerCell('Choice', 2200),
								headerCell('Rationale', 5160),
							],
						}),
						new TableRow({
							children: [
								dataCell('Classification', 2000, { bold: true }),
								dataCell('Server-side', 2200),
								dataCell(
									'Cortex already has Claude Haiku classification and Voyage AI embedding built into /SynapseIngest. No need to duplicate in the plugin.',
									5160,
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('Memory source', 2000, { bold: true, shaded: true }),
								dataCell('Both tables', 2200, { shaded: true }),
								dataCell(
									'Auto-recall queries both Memory (conversational context from Slack) and SynapseEntry (development context from CLAUDE.md, rules). Gives OpenClaw the richest context.',
									5160,
									{ shaded: true },
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('Capture target', 2000, { bold: true }),
								dataCell('SynapseEntry', 2200),
								dataCell(
									'Leverages existing deduplication (content hash), classification, and embedding pipeline. Source tagged as openclaw.',
									5160,
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('Lifecycle hook', 2000, { bold: true, shaded: true }),
								dataCell('before_prompt_build', 2200, { shaded: true }),
								dataCell(
									'Fires after session load so messages are available for context-aware recall. More reliable than before_agent_start.',
									5160,
									{ shaded: true },
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('Transport', 2000, { bold: true }),
								dataCell('Direct HTTP', 2200),
								dataCell(
									'Simpler than spawning an MCP subprocess. The plugin runs in-process with the Gateway and can make fetch calls directly to Harper endpoints.',
									5160,
								),
							],
						}),
					],
				}),
				spacer(200),

				// --- CHANGES TO HARPER-CORTEX ---
				heading('Required Changes to Cortex', HeadingLevel.HEADING_1),
				bodyText(
					'Minimal changes are needed in the core Cortex codebase to support OpenClaw as a source:',
				),
				new Table({
					width: { size: CONTENT_WIDTH, type: WidthType.DXA },
					columnWidths: [2600, 6760],
					rows: [
						new TableRow({
							children: [
								headerCell('File', 2600),
								headerCell('Change', 6760),
							],
						}),
						new TableRow({
							children: [
								dataCell('resources.js', 2600, { code: true }),
								dataCell(
									'Add "openclaw" to VALID_SYNAPSE_SOURCES set',
									6760,
								),
							],
						}),
						new TableRow({
							children: [
								dataCell('resources.js', 2600, { code: true, shaded: true }),
								dataCell(
									'Add parseOpenClaw() parser to SynapseIngest (wraps raw content as a single entry, since capture content is already classified conversation text)',
									6760,
									{ shaded: true },
								),
							],
						}),
					],
				}),
				spacer(200),

				// --- VERIFICATION ---
				heading('Verification Checklist', HeadingLevel.HEADING_1),
				heading('Phase 1 (MCP)', HeadingLevel.HEADING_2),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'docs/openclaw-setup.md has correct config snippets',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'README MCP clients table includes OpenClaw',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'Manual test: configure OpenClaw with Harper MCP, run a memory query',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				spacer(80),
				heading('Phase 2 (Plugin)', HeadingLevel.HEADING_2),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'openclaw plugins install ./packages/openclaw-memory succeeds',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'Auto-recall injects memories into agent context',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'Auto-capture stores conversation facts via SynapseIngest',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'All 4 registered tools work (memory_search, memory_store, memory_forget, context_search)',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'Existing Cortex tests still pass (82/82)',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
				new Paragraph({
					numbering: { reference: 'checks', level: 0 },
					spacing: { after: 80 },
					children: [
						new TextRun({
							text: 'Plugin tests pass (new test file in packages/openclaw-memory/)',
							font: 'Arial',
							size: 22,
							color: DARK_TEXT,
						}),
					],
				}),
			],
		},
	],
});

Packer.toBuffer(doc).then((buffer) => {
	fs.writeFileSync('/Users/danielpabbott/Cortex/docs/openclaw-proposal.docx', buffer);
	console.log('Document created: docs/openclaw-proposal.docx');
});
