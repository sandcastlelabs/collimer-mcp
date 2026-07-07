# Deploy & maintain — collimer-mcp + collimer-skills

How the Collimer agent channel is published and how to ship changes. Written 2026-07-07 after the first launch; keep it current.

## What exists

| Artifact | Home | Distribution |
|---|---|---|
| **MCP server** `collimer-mcp` | this repo (`sandcastlelabs/collimer-mcp`) | npm `collimer-mcp` · Official MCP Registry `io.github.sandcastlelabs/collimer-mcp` · mcp.so · Glama |
| **Claude Code skill** `collimer_scan` | `sandcastlelabs/collimer-skills` (plugin marketplace) | `/plugin marketplace add sandcastlelabs/collimer-skills` |

The tool is **`collimer_scan`** (renamed from `beacon_free_scan` in v0.2.0; the old name stays as a deprecated alias one release). Both wrap the public scan API at `https://app.collimer.com` — nothing proprietary.

## Channels & attribution (source tags)

Every scan carries a `source` so PostHog can show which channel drives usage (feeds Collimer **G6**: ≥25 agent scans/mo). Default source is set in code; per-listing configs can override via the `COLLIMER_SCAN_SOURCE` env.

| Channel | source | Status |
|---|---|---|
| npx / README copy-paste | `mcp` | live |
| Official MCP Registry | `mcp` (default) | live |
| mcp.so · Glama | `mcp` (bare npx, no env) | in review |
| Smithery | `mcp-smithery` (smithery.yaml) | needs remote (#1472) |
| Remote server (Claude Connectors / ChatGPT Apps) | `mcp-remote` | not built (#1472) |
| Desktop Extension `.mcpb` | `mcp-desktop` | backlog (#1473) |
| Claude Code **skill** | `agent` (scripts/free_scan.sh) | live |

Note: mcp.so/Glama deep-link a bare `npx`, so they can't carry a distinct env → they bucket as generic `mcp`. Only channels whose config supports env (Smithery, remote, desktop) can be split finer.

## Release a new MCP version

1. Edit `src/`. Bump the version in **four** places (keep them in sync):
   - `package.json` `version`
   - `server.json` `version` **and** `packages[0].version`
   - `src/index.ts` `new McpServer({ version })`
   - `src/scan.ts` `USER_AGENT`
2. `npm run build && npm run test:protocol` (protocol test runs a real scan — proves the tool over MCP/stdio).
3. **Publish to npm** — `npm publish --access public --otp=<fresh 6-digit code>`.
   - Or CI: push a `vX.Y.Z` git tag → `.github/workflows/publish.yml` publishes (needs repo secret `NPM_TOKEN` = a granular token with **Bypass 2FA**).
4. **Update the registry** — `mcp-publisher publish` (reads `server.json`; you must be `mcp-publisher login github` with public `sandcastlelabs` org membership).
5. Commit + push. Tag the release.

## Release a skill change (collimer-skills repo)

1. Edit `plugins/collimer-scan/skills/collimer_scan/`.
2. Bump `version` in `plugins/collimer-scan/.claude-plugin/plugin.json` and the entry in `.claude-plugin/marketplace.json`.
3. Commit + push. Users pick it up via `/plugin update`.

## Gotchas we actually hit (read before publishing)

- **npm 2FA is mandatory for publish.** `npm publish` needs `--otp=<code>` (codes expire ~30s). A 404 on publish means you're logged out (`npm login`), not that the package is missing.
- **MCP Registry namespace = org membership.** Publishing `io.github.sandcastlelabs/*` requires your GitHub `sandcastlelabs` membership to be **public**, and a **fresh `mcp-publisher login github`** after making it public (the token caches permissions at login).
- **Registry requires `mcpName` in package.json** — `"mcpName": "io.github.sandcastlelabs/collimer-mcp"` — and the npm package must be published *with* it (bump version; npm is immutable).
- **`server.json` `description` ≤ 100 chars** (registry validation).
- **Claude Connectors + ChatGPT Apps + Smithery need a *remote* server** (hosted HTTP + OAuth) — a stdio/npx package can't list there. That's ticket **#1472**; it unlocks all three at once.

## Related tickets (sandcastlelabs/collimer)

`#417` distribution/attribution · `#1459` how-did-you-hear · `#1460` funnel views (source taxonomy) · `#1472` remote server (Smithery/Claude/ChatGPT) · `#1473` Desktop Extension `.mcpb` · `#1475` skill rename + distribution + `/docs` controller fix.
