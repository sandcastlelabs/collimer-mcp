# collimer-mcp

[![npm](https://img.shields.io/npm/v/collimer-mcp)](https://www.npmjs.com/package/collimer-mcp) · MIT · [Model Context Protocol](https://modelcontextprotocol.io)

**Let any AI agent run a free AI-search visibility scan on any website** — how visible a brand is in ChatGPT, Claude, Gemini, Perplexity, and Google AI Overviews.

Trackers tell you you're invisible. Collimer tells you *why*, and what to fix.

It exposes one tool, **`collimer_scan`**, which returns a depth-gated teaser: an AI-visibility score (0–100), a confidence interval, the single biggest gap, and a branded report URL. The full report — share of voice across every engine + every recommendation — unlocks with a free account at [collimer.com](https://collimer.com).

## Install

Add Collimer to any MCP client. It runs on-demand via `npx` — no install step.

**Claude Desktop / Claude Code** — add to your MCP config (`claude_desktop_config.json`, or `.mcp.json` in your project):

```json
{
  "mcpServers": {
    "collimer": {
      "command": "npx",
      "args": ["-y", "collimer-mcp"]
    }
  }
}
```

**Cursor / Windsurf / VS Code** — same block, in the editor's MCP settings (`~/.cursor/mcp.json`, Windsurf MCP settings, or `.vscode/mcp.json`).

Then ask your assistant:

> *"How visible is stripe.com in AI search?"*
> *"Run a Collimer scan on example.com and tell me the biggest AI-visibility gap."*
> *"Does ChatGPT cite acme.com when asked about its category?"*

Your assistant will call `collimer_scan` and return the teaser.

## The tool

**`collimer_scan(domain, email?)`**

| Arg | | |
|---|---|---|
| `domain` | required | The website to scan — `example.com` or `https://example.com`. |
| `email` | optional | Emails the report and speeds claiming the account later. |

Returns the teaser — score, confidence interval, top gap, report URL, and an unlock link. It **never** returns the full report; that's gated behind a free account.

## Configuration (env)

| Var | Default | Purpose |
|---|---|---|
| `COLLIMER_API_BASE` | `https://app.collimer.com` | API base URL |
| `COLLIMER_SCAN_SOURCE` | `mcp` | Funnel-attribution channel (set per distribution) |
| `COLLIMER_MAX_POLLS` | `60` | Max poll attempts |
| `COLLIMER_POLL_INTERVAL_MS` | `5000` | Poll interval |
| `COLLIMER_REQUEST_TIMEOUT_MS` | `30000` | Per-request timeout |

## What is Collimer?

[Collimer](https://collimer.com) measures and improves how often AI answer engines cite your brand — generative engine optimization (GEO), the AI-search successor to SEO. This MCP server is the free front door: scan any site from inside your assistant, see the score and the biggest gap, then open the full report and start tracking at [collimer.com](https://collimer.com). API docs: [app.collimer.com/docs](https://app.collimer.com/docs).

## Privacy

The server calls Collimer's public scan API for the domain you pass and returns the result. It doesn't read your files or your conversation. Scans carry a `source` tag (default `mcp`) so we can see which channels are useful — no personal data beyond the optional email you provide.

## Develop

```bash
npm install
npm run build          # → dist/
npm run smoke          # real scan against prod, prints the teaser
npm run test:protocol  # spawns the server + calls the tool over MCP/stdio
```

## License

MIT © [Sandcastle Labs](https://sandcastlelabs.ai)
