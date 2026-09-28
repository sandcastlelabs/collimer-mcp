# collimer-mcp

[![npm](https://img.shields.io/npm/v/collimer-mcp)](https://www.npmjs.com/package/collimer-mcp) · MIT · [Model Context Protocol](https://modelcontextprotocol.io)

> ## ⚠️ Retired — switch to the remote server
>
> Collimer is a **remote MCP server** at `https://app.collimer.com/mcp`.

## Use the remote server instead

**Claude Code**

```bash
claude mcp add --transport http collimer https://app.collimer.com/mcp
```

**Claude Desktop** — Settings → Connectors → Add custom connector, with the URL
`https://app.collimer.com/mcp`.

**Cursor / VS Code / Windsurf / any client that supports remote MCP** — in the
client's MCP config (`~/.cursor/mcp.json`, `.vscode/mcp.json`, `.mcp.json`):

```json
{
  "mcpServers": {
    "collimer": {
      "type": "http",
      "url": "https://app.collimer.com/mcp"
    }
  }
}
```

There are no keys to paste. The server speaks OAuth 2.1 with dynamic client
registration and PKCE, so your client discovers the endpoints and prompts you to
sign in the first time you connect. A free account is enough to connect.

## What the remote server does

The remote server exposes the work loop:

- **Scan and audit** a brand's AI-search visibility across ChatGPT, Claude,
  Gemini, Perplexity and Google AI Overviews, and read the finished report.
- **Find the work** — open recommendations for a brand in plan-priority order.
- **Do the work** — turn a recommendation into a draft for a human to review. It
  never publishes on its own.
- **Verify the work** — check whether what shipped actually landed and moved the
  score.
- **Onboard a brand** end to end, with proposed brand context a person confirms.

## If you already have this package installed

Every call fails with a message naming the remote endpoint. Nothing is wrong on
your side and there is no version to upgrade to — remove the `collimer` stdio
entry from your MCP config and add the remote server above.

```jsonc
// remove this
{ "collimer": { "command": "npx", "args": ["-y", "collimer-mcp"] } }
```

## What is Collimer?

[Collimer](https://collimer.com) measures and improves how often AI answer
engines cite your brand — generative engine optimization (GEO), the AI-search
successor to SEO. Trackers tell you you're invisible. Collimer gets you cited.

## Privacy

The remote server acts on the Collimer account you sign in with. This retired
package sent only the domain you passed and an optional email, and read neither
your files nor your conversation.

## License

MIT © [Sandcastle Labs](https://sandcastlelabs.ai)
