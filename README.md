<p align="center">
  <img src="assets/mencoro-icon-256.png" alt="Mencoro" width="96" height="96">
</p>

<h1 align="center">Mencoro MCP server</h1>

<p align="center">
  Ask an AI assistant how your brand is doing in AI answers — rank, mentions, sentiment and Share of Voice — in plain language.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mencoro/mcp"><img src="https://img.shields.io/npm/v/%40mencoro%2Fmcp?label=npm" alt="npm version"></a>
  <a href="https://github.com/mencoro/mencoro-mcp/actions/workflows/ci.yml"><img src="https://github.com/mencoro/mencoro-mcp/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT licence"></a>
</p>

---

Mencoro tracks how brands surface in AI answer engines — ChatGPT, Perplexity, Google AI Overview
and AI Mode — and in Google Search and Shopping. The MCP server exposes that data to any MCP client
as **17 read-only tools** and **12 prompts**.

The server is **hosted**. Most clients should connect to it directly:

```
https://api.mencoro.com/mcp
```

This repository holds the public metadata for that server plus a small stdio bridge
(`@mencoro/mcp`) for hosts that can only launch a local process. It does **not** contain the
Mencoro application source.

## Connect

### Clients that speak remote MCP (recommended)

No install, no local process. Sign in with OAuth, or paste a personal access token as a header.

| Client | How |
|---|---|
| **Claude** (web, Desktop, mobile) | Settings → Connectors → *Add custom connector* → paste the URL → **Sign in**. Or use the [one-click link](https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Mencoro&connectorUrl=https%3A%2F%2Fapi.mencoro.com%2Fmcp). |
| **ChatGPT** | Settings → *Apps & Connectors* → developer mode → add the URL → sign in. |
| **Claude Code** | `claude mcp add --transport http mencoro https://api.mencoro.com/mcp` then `/mcp` to sign in |
| **Cursor** | [config below](#client-configuration) |
| **VS Code** | [config below](#client-configuration) |
| **OpenAI Codex** | [config below](#client-configuration) |
| **Gemini CLI** | [config below](#client-configuration) |
| **OpenCode** | [config below](#client-configuration) |
| **Google Antigravity** | [config below](#client-configuration) |

### Clients that can only spawn a local process

Claude Desktop's manual configuration, and older stdio-only hosts, need a bridge. That is what
this package is:

```bash
npx -y @mencoro/mcp
```

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "mencoro": {
      "command": "npx",
      "args": ["-y", "@mencoro/mcp"],
      "env": { "MENCORO_API_KEY": "mcp_pat_your_token" }
    }
  }
}
```

The token goes through the environment rather than an argument, so it does not appear in `ps`
output and does not have to survive the host's argument splitting.

## Authentication

Two ways in. Both give the same read-only access.

**OAuth 2.1** — the one-click path. Supported by Claude, ChatGPT, Claude Code and any client that
implements the MCP authorization spec. Nothing to copy or paste; revoke it from the app.
The server advertises PKCE (`S256`), Client ID Metadata Documents, Dynamic Client Registration and
RFC 9728 resource metadata, so clients discover everything they need from
`https://api.mencoro.com/.well-known/oauth-protected-resource/mcp`.

**Personal access token** — for CLI clients, config files, and this bridge. Create one at
[tool.mencoro.com/me/mcp-server](https://tool.mencoro.com/me/mcp-server); it is shown once, starts
with `mcp_pat_`, is read-only, and can be scoped to a single organization and given an expiry.
Send it as `Authorization: Bearer mcp_pat_…`.

> ChatGPT cannot send a custom `Authorization` header to a remote connector — use OAuth there.

## Client configuration

<details>
<summary><b>Cursor</b> — <code>~/.cursor/mcp.json</code></summary>

```json
{
  "mcpServers": {
    "mencoro": {
      "url": "https://api.mencoro.com/mcp",
      "headers": { "Authorization": "Bearer mcp_pat_your_token" }
    }
  }
}
```
</details>

<details>
<summary><b>VS Code</b> — <code>.vscode/mcp.json</code></summary>

```json
{
  "servers": {
    "mencoro": {
      "type": "http",
      "url": "https://api.mencoro.com/mcp",
      "headers": { "Authorization": "Bearer mcp_pat_your_token" }
    }
  }
}
```
</details>

<details>
<summary><b>OpenAI Codex</b> — <code>~/.codex/config.toml</code></summary>

```toml
[mcp_servers.mencoro]
url = "https://api.mencoro.com/mcp"
http_headers = { "Authorization" = "Bearer mcp_pat_your_token" }
```
</details>

<details>
<summary><b>Gemini CLI</b> — <code>~/.gemini/settings.json</code></summary>

```json
{
  "mcpServers": {
    "mencoro": {
      "httpUrl": "https://api.mencoro.com/mcp",
      "headers": { "Authorization": "Bearer mcp_pat_your_token" }
    }
  }
}
```
</details>

<details>
<summary><b>OpenCode</b> — <code>opencode.json</code></summary>

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mencoro": {
      "type": "remote",
      "url": "https://api.mencoro.com/mcp",
      "enabled": true,
      "headers": { "Authorization": "Bearer mcp_pat_your_token" },
      "oauth": false
    }
  }
}
```

`oauth: false` stops OpenCode negotiating OAuth against an endpoint that also advertises it, which
would otherwise override the token you just configured.
</details>

<details>
<summary><b>Google Antigravity</b></summary>

```json
{
  "mcpServers": {
    "mencoro": {
      "serverUrl": "https://api.mencoro.com/mcp",
      "headers": { "Authorization": "Bearer mcp_pat_your_token" }
    }
  }
}
```
</details>

<details>
<summary><b>Claude Code</b> — project scope, committed to a repository</summary>

```json
{
  "mcpServers": {
    "mencoro": {
      "type": "http",
      "url": "https://api.mencoro.com/mcp",
      "headers": { "Authorization": "Bearer ${MENCORO_API_KEY}" }
    }
  }
}
```
</details>

## Tools

All 17 are read-only. Nothing in this server can change a project, a tracked query or a setting.

| Tool | What it answers |
|---|---|
| `list_projects` | The organizations and active projects you can see. **Call this first** — every other tool needs the ids it returns. |
| `get_available_filters` | Which engines, countries, keyword clusters and competitors a project actually has. |
| `get_metric_glossary` | Maps everyday wording ("visibility", "tone", "ranking") onto the right metric and tool. |
| `get_organization_overview` | Current-state board across every active project in an organization, ranked by Share of Voice. |
| `get_project_rank_tracking_stats` | The project summary: positions, trends, Share of Voice per competitor, sentiment split, mention/SERP/shopping rates. |
| `get_rank_tracking_time_series` | Those metrics over time, bucketed daily, weekly or monthly, optionally per competitor. |
| `get_tracked_query_time_series` | The same history for one tracked query. |
| `get_query_movers` | The tracked queries that gained or lost the most versus the previous period. |
| `get_cluster_breakdown` | The same metrics broken down per keyword cluster. |
| `search_tracked_queries` | Search and paginate a project's tracked queries with their latest positions. |
| `get_sentiment_breakdown` | Positive / neutral / negative split of your AI mentions, per engine and per competitor. |
| `get_mention_mix` | Mention counts by type, tone and qualifier — the inputs behind the Share of Voice weighting. |
| `get_mention_samples` | The raw AI mention texts, paginated and filterable, for qualitative review. |
| `get_competitor_cooccurrence` | Head-to-head: when you and a competitor appear in the same answer, who is named higher. |
| `get_cited_sources` | The domains and pages the answer engines cited, with counts and average citation rank. |
| `get_tracking_coverage` | What is stale: paused, never-checked and overdue tracked queries. |
| `get_share_of_voice_formula` | The weights and multipliers the Share of Voice score is built from. |

Dates are ISO `YYYY-MM-DD` and must fall inside the retention window. Positions are
1-based and **lower is better**; every other metric improves as it rises.

## Prompts

Twelve ready-made questions, surfaced by clients that support MCP prompts:

`brand_ai_overview` · `whats_changed` · `organization_overview` · `top_queries` ·
`biggest_movers` · `query_history` · `competitor_standing` · `head_to_head` ·
`negative_mentions` · `cited_sources` · `coverage_health` · `sov_explainer`

## The bridge

### Run it

```bash
export MENCORO_API_KEY=mcp_pat_your_token
npx -y @mencoro/mcp            # serve on stdio
npx -y @mencoro/mcp doctor     # check the endpoint, the token, and list the tools
```

### Docker

```bash
docker run --rm -i -e MENCORO_API_KEY=mcp_pat_your_token ghcr.io/mencoro/mencoro-mcp
```

`-i` is required and `-t` must be omitted: the MCP transport is this process's stdin and stdout.

### Options

| | |
|---|---|
| `MENCORO_API_KEY` | Personal access token. Without it the bridge starts anyway and serves a single `mencoro_setup` tool explaining how to get one. |
| `MENCORO_MCP_URL` | Upstream endpoint. Defaults to `https://api.mencoro.com/mcp`. |
| `--url <url>` | Same, as an argument. |
| `--header "Name: value"` | Extra HTTP header, repeatable. An `Authorization` header here overrides `MENCORO_API_KEY`. |
| `doctor` | Connect once, print the server version, negotiated protocol, tool and prompt catalogue, then exit. |
| `--help`, `--version` | |

### What it actually does

It splices your client's stdio transport onto a Streamable HTTP transport and forwards every
JSON-RPC frame verbatim, in both directions. The only frame it looks inside is the handshake —
enough to echo the negotiated protocol version back upstream and to rebuild the session if the
server evicts it, which a deploy or a scale-down will do. It knows no other method, so it cannot
drift from the server: tools, prompts, resources, completions, progress notifications and
anything added later all pass straight through.

## Limits

| | |
|---|---|
| Access | Read-only. 17 tools, no mutations. |
| Retention | Up to 16 months of history; dates outside the window are rejected. |
| Transport | Streamable HTTP. |
| Rate limiting | Repeatedly presenting an invalid credential is rate limited per IP. |
| Result size | Large result sets are paginated; ask for a narrower window or a coarser granularity if a client truncates. |

## Repository contents

| | |
|---|---|
| `src/`, `test/` | The stdio bridge published as `@mencoro/mcp`. |
| `server.json` | The [MCP registry](https://registry.modelcontextprotocol.io) manifest. |
| `glama.json` | Glama directory ownership metadata. |
| `Dockerfile` | The image published to `ghcr.io/mencoro/mencoro-mcp`. |
| `assets/`, `logo.png` | Brand assets used by directory listings. |

## Development

```bash
npm ci
npm run typecheck
npm test            # builds first, then runs the suite
npm run check:manifests
```

Tests run the TypeScript sources directly through Node's type stripping, so development needs
Node 22.18 or newer. The published package targets Node 20.19+, which CI verifies separately
against the built artifact.

Releases are cut by tagging. `npm version <patch|minor|major>`, mirror the new version into
`server.json` (`.version`, the npm package entry, and the image tag), run
`npm run check:manifests`, then push the tag — CI publishes to npm, GHCR and the MCP registry,
in that order.

## Support

* Product and account questions — [support@mencoro.com](mailto:support@mencoro.com)
* Bugs in this package — [open an issue](https://github.com/mencoro/mencoro-mcp/issues)
* Security — see [SECURITY.md](SECURITY.md)
* About the server — [mencoro.com/features/mcp-server](https://mencoro.com/features/mcp-server/)

## Licence

MIT. See [LICENSE](LICENSE).

The Mencoro name, logo and brand assets in `assets/` are trademarks of Mencoro and are not
covered by that licence.
