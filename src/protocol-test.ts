// MCP protocol test: spawn the server over stdio, list tools, and call
// collimer_scan via a real MCP client. Proves the transport + tool
// registration work (not just the core). Run: node dist/protocol-test.js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "node:assert";

const transport = new StdioClientTransport({ command: "node", args: ["dist/index.js"] });
const client = new Client({ name: "collimer-mcp-protocol-test", version: "0.0.0" });

let failure: unknown;
try {
  await client.connect(transport);

  // 1. The tool is registered with a schema.
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === "collimer_scan");
  assert(tool, "collimer_scan tool is not registered");
  assert(tool.inputSchema, "tool has no input schema");
  console.log(`✓ tool registered: ${tool.name} — ${(tool.description ?? "").slice(0, 60)}...`);
  assert(tools.some((t) => t.name === "beacon_free_scan"), "beacon_free_scan deprecated alias missing");

  // 2. Calling it returns the teaser. notion.so was just scanned → cache hit → fast.
  const result = await client.callTool({
    name: "collimer_scan",
    arguments: { domain: "notion.so" },
  });
  const text = (result.content as Array<{ type: string; text?: string }>)?.[0]?.text ?? "";
  console.log("✓ tool result:\n" + text);
  assert(!result.isError, "tool returned isError");
  assert(text.includes("AI-search visibility"), "result missing the teaser summary");
  assert(text.includes("app.collimer.com/scan/"), "result missing the report URL");
} catch (err) {
  failure = err;
} finally {
  // Always tear down the spawned server child, even on assertion failure (#4).
  await client.close().catch(() => {});
}

if (failure) {
  console.error("\n✗ MCP protocol test FAILED:", failure);
  process.exit(1);
}
console.log("\n✓ MCP protocol test PASSED");
process.exit(0);
