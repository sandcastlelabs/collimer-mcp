#!/usr/bin/env node
// Collimer MCP server — exposes `collimer_scan`, which runs a free AI-search
// visibility scan via the public REST API and returns the depth-gated teaser.
// Never returns the full report (gated behind a free account).
// (The deprecated `beacon_free_scan` alias was removed in 0.3.0 after its one-release window.)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { runScan, formatTeaser, ScanError } from "./scan.js";

const OVERALL_TIMEOUT_MS = 5 * 60 * 1000;

const server = new McpServer({ name: "collimer", version: "0.3.0" });

const scanToolConfig = {
  title: "Collimer AI-visibility scan",
  description:
    "Run a free Collimer scan on a website to measure how visible its brand is in AI " +
    "search — ChatGPT, Claude, Gemini, Perplexity, and Google AI Overviews. Returns an " +
    "AI-visibility score (0–100), a confidence interval, the single biggest gap, and a " +
    "branded report URL. The full ranked fix plan + verification re-scan unlock with a " +
    "free account on the web. Tip: after the site makes " +
    "changes, re-run the scan to measure the delta.",
  inputSchema: {
    domain: z
      .string()
      .min(1)
      .describe("The website to scan, e.g. 'example.com' or 'https://example.com'."),
    email: z
      .string()
      .email()
      .optional()
      .describe("Optional — emails the report and speeds claiming the account later."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
};

async function handleScan({ domain, email }: { domain: string; email?: string }) {
  try {
    // Bound the whole call — composed into every fetch inside runScan — so a
    // hung scan can't block the MCP client indefinitely.
    const teaser = await runScan(domain, email, AbortSignal.timeout(OVERALL_TIMEOUT_MS));
    return { content: [{ type: "text" as const, text: formatTeaser(teaser) }] };
  } catch (err) {
    const message =
      err instanceof ScanError ? err.message : `Unexpected error running the scan: ${String(err)}`;
    return { content: [{ type: "text" as const, text: message }], isError: true };
  }
}

server.registerTool("collimer_scan", scanToolConfig, handleScan);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is the MCP transport.
  console.error("collimer-mcp ready (stdio).");
}

main().catch((err) => {
  console.error("collimer-mcp failed to start:", err);
  process.exit(1);
});
