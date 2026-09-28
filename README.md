<p align="center">
  <img src="assets/mencoro-icon-256.png" alt="Mencoro" width="96" height="96">
</p>

<h1 align="center">Mencoro MCP server</h1>

<p align="center">
  Ask an AI assistant how your brand is doing in AI answers — rank, mentions, sentiment and Share of Voice — and have it set up and tune your monitoring, in plain language.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mencoro/mcp"><img src="https://img.shields.io/npm/v/%40mencoro%2Fmcp?logo=npm&logoColor=white&label=npm&color=cb3837" alt="npm version"></a>
  <a href="https://registry.modelcontextprotocol.io/?search=com.mencoro%2Fmencoro"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.modelcontextprotocol.io%2Fv0%2Fservers%2Fcom.mencoro%252Fmencoro%2Fversions%2Flatest&query=%24.server.version&prefix=v&logo=modelcontextprotocol&logoColor=white&label=MCP%20registry&color=0b7285" alt="MCP registry"></a>
  <a href="https://github.com/mencoro/mencoro-mcp/pkgs/container/mencoro-mcp"><img src="https://img.shields.io/badge/ghcr.io-mencoro%2Fmencoro--mcp-2496ed?logo=docker&logoColor=white" alt="GitHub Container Registry"></a>
  <a href="https://glama.ai/mcp/connectors/com.mencoro/mencoro"><img src="https://glama.ai/mcp/connectors/com.mencoro/mencoro/badges/score.svg" alt="Glama connector score"></a>
  <a href="https://github.com/mencoro/mencoro-mcp/actions/workflows/ci.yml"><img src="https://github.com/mencoro/mencoro-mcp/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT licence"></a>
</p>

---

Mencoro tracks how brands surface in AI answer engines — ChatGPT, Perplexity, Google AI Overview
and AI Mode — and in Google Search and Shopping. The MCP server exposes that data to any MCP client,
and lets it manage projects, tracked queries, clusters and organizations, as **58 tools** (29 that
read, 29 that change something) and **16 prompts**.

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

Two ways in. Both carry the same three permissions, and neither can ever do more than your own
role in an organization allows:

| Scope | Allows |
|---|---|
| `read` | Every read tool. Always granted. |
| `write` | Creating, changing and deleting projects, competitors, clusters and tracked queries; running checks; starting discovery jobs. |
| `organization:manage` | Creating, renaming, archiving and restoring organizations; invitations; members' roles and suspension. |

**OAuth 2.1** — the one-click path. Supported by Claude, ChatGPT, Claude Code and any client that
implements the MCP authorization spec. Nothing to copy or paste; revoke it from the app.
The consent screen pre-selects the scopes the client asked for (all three when it asked for none),
and you can untick any but `read`.
The server advertises PKCE (`S256`), Client ID Metadata Documents, Dynamic Client Registration and
RFC 9728 resource metadata, so clients discover everything they need from
`https://api.mencoro.com/.well-known/oauth-protected-resource/mcp`. Calling a tool the connection
lacks the scope for answers `403 insufficient_scope` naming the scopes to request, so a client
that supports step-up authorization asks you to reconnect with the extra permission.

**Personal access token** — for CLI clients, config files, and this bridge. Create one at
[tool.mencoro.com/me/mcp-server](https://tool.mencoro.com/me/mcp-server); it is shown once, starts
with `mcp_pat_`, carries the permissions you tick (all three by default), and can be pinned to a
single organization and given an expiry. Send it as `Authorization: Bearer mcp_pat_…`. A call the
token lacks the permission for fails with a tool error naming it; a token cannot be upgraded, so
create a new one to add a permission.

Connections and tokens created before write access existed have `read` and `write` but not
`organization:manage`.

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

29 tools read and 29 change something. Every tool declares all four MCP annotations
(`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) explicitly, so a client can
decide what to ask you before calling it.

### Reading

Every read tool needs only the `read` scope.

| Tool | What it answers |
|---|---|
| `list_projects` | The organizations and active projects you can see. **Call this first** — every other tool needs the ids it returns. |
| `get_project` | One project's status, website domains, brand names and competitors with their ids. |
| `list_clusters` | A project's keyword clusters, by name, with their ids. |
| `get_available_filters` | Which engines, countries, keyword clusters and competitors a project actually has. |
| `get_metric_glossary` | Maps everyday wording ("visibility", "tone", "ranking") onto the right metric and tool. |
| `get_organization_overview` | Current-state board across every active project in an organization, ranked by Share of Voice. |
| `get_organization` | An organization's profile, status, your role in it, and its member, project and invitation counts. |
| `list_members` | An organization's members with their role and state, optionally with pending invitations. Owners only. |
| `get_usage` | The subscription, tracked-query count and projected monthly checks, against the plan's limits. |
| `get_project_rank_tracking_stats` | The project summary: positions, trends, Share of Voice per competitor, sentiment split, mention/SERP/shopping rates. |
| `get_rank_tracking_time_series` | Those metrics over time, bucketed daily, weekly or monthly, optionally per competitor. |
| `get_tracked_query_time_series` | The same history for one tracked query. |
| `get_query_movers` | The tracked queries that gained or lost the most versus the previous period. |
| `get_cluster_breakdown` | The same metrics broken down per keyword cluster. |
| `search_tracked_queries` | Search and paginate a project's tracked queries with their latest positions. |
| `get_tracked_query` | One tracked query's settings: text, engine, country, status, frequency, passes, clusters and last check. |
| `list_keyword_listings` | One row per query text across its engine and country variants, with every metric, sortable. |
| `get_tracking_coverage` | What is stale: paused, never-checked and overdue tracked queries. |
| `get_sentiment_breakdown` | Positive / neutral / negative split of your AI mentions, per engine and per competitor. |
| `get_mention_mix` | Mention counts by type, tone and qualifier — the inputs behind the Share of Voice weighting. |
| `get_mention_samples` | The raw AI mention texts, paginated and filterable, for qualitative review. |
| `get_share_of_voice_formula` | The weights and multipliers the Share of Voice score is built from. |
| `get_competitor_cooccurrence` | Head-to-head: when you and a competitor appear in the same answer, who is named higher. |
| `get_cited_sources` | The domains and pages the answer engines cited, with counts and average citation rank. |
| `list_ai_responses` | The captured AI answers themselves: full text, engine, capture time and cited sources. |
| `list_search_snapshots` | The captured Google Search and Shopping result pages. |
| `get_tracked_query_matches` | Every mention or ranking behind one tracked query's metrics. |
| `get_job` | Progress and result of a background job started by a discovery or clustering tool. |
| `preview_operation` | What a confirmable change would affect and cost, plus the one-time token to run it. |

### Changing things

A tool marked **C** needs a confirmation: call `preview_operation` with the tool's name and
arguments, show the plan to the user, and call the tool with the returned `confirmationToken` only
after they agree. The token is single-use, expires after a few minutes, and is refused if anything
the plan described has changed. Creating tools, job starters and confirmable tools also accept a
`requestId`: a retry with the same one returns the first result instead of doing the work twice.

| Tool | Scope | | What it does |
|---|---|---|---|
| `create_project` | `write` | | Create a project from brand names and domains. |
| `update_project` | `write` | | Rename a project, or replace its website domains and brand names. |
| `archive_project` | `write` | C | Archive a project; its tracked queries stop being checked. |
| `restore_project` | `write` | | Bring an archived project back. |
| `create_competitor` | `write` | | Add a competitor to a project. |
| `update_competitor` | `write` | | Replace a competitor's name, website domains and brand names. |
| `delete_competitor` | `write` | C | Remove a competitor with every mention and search or shopping result recorded for it. |
| `create_tracked_queries` | `write` | C | Add tracked queries in bulk across engines and countries; the preview shows the checks they will spend. |
| `update_tracked_queries` | `write` | | Pause, resume, or change the frequency or passes of up to 100 tracked queries. |
| `delete_tracked_queries` | `write` | C | Delete up to 100 tracked queries with their captured answers, matches and history. |
| `run_checks` | `write` | C | Check tracked queries now, spending budget. |
| `report_ai_response` | `write` | | Flag a captured AI answer that was analysed wrong. |
| `create_clusters` | `write` | | Create keyword clusters. |
| `rename_cluster` | `write` | | Rename a cluster. |
| `delete_cluster` | `write` | C | Delete a cluster; its tracked queries stay. |
| `set_tracked_query_clusters` | `write` | | Add tracked queries to clusters, or remove them. |
| `start_auto_clustering` | `write` | | Start a job that proposes a clustering. |
| `apply_auto_clustering` | `write` | | Apply a proposal the user approved. |
| `suggest_brand_names` | `write` | | Start a job that suggests brand names for a website. |
| `discover_brands` | `write` | | Start a job that finds a project's competitors. |
| `discover_keywords` | `write` | | Start a job that proposes search keywords worth tracking. |
| `discover_prompts` | `write` | | Start a job that proposes AI prompts worth tracking. |
| `create_organization` | `organization:manage` | C | Create an organization. |
| `update_organization` | `organization:manage` | C | Change an organization's name, description or contact email. |
| `archive_organization` | `organization:manage` | C | Archive an organization. |
| `restore_organization` | `organization:manage` | C | Restore an archived organization. |
| `invite_member` | `organization:manage` | C | Invite someone by email with a role. |
| `cancel_invitation` | `organization:manage` | C | Cancel a pending invitation. |
| `update_member` | `organization:manage` | C | Change a member's role, or suspend or reactivate them. |

A change is refused exactly where the Mencoro app refuses it: your role in the organization, an
archived project, or a missing subscription where the app requires one.

Dates are ISO `YYYY-MM-DD` and must fall inside the retention window. Positions are
1-based and **lower is better**; every other metric improves as it rises.

The live definitions — names, descriptions, input and output schemas, annotations — are readable
without a credential at `https://api.mencoro.com/public/v1/mcp`, a discovery-only mount of the same
server that answers `initialize`, `ping`, `tools/list` and `prompts/list` and refuses everything
else. Calling a tool still requires signing in at `https://api.mencoro.com/mcp`.

## Prompts

Sixteen ready-made starting points, surfaced by clients that support MCP prompts. Twelve ask about
your data:

`brand_ai_overview` · `whats_changed` · `organization_overview` · `top_queries` ·
`biggest_movers` · `query_history` · `competitor_standing` · `head_to_head` ·
`negative_mentions` · `cited_sources` · `coverage_health` · `sov_explainer`

Four script a change step by step, stopping for your approval where it matters:

| Prompt | Workflow |
|---|---|
| `set_up_project` | Create a project from a website: brand names, competitors and the first tracked prompts. |
| `expand_query_set` | Find new prompts or keywords worth tracking and add the ones you pick. |
| `reorganise_clusters` | Let Mencoro propose a clustering, review it, and apply it. |
| `tune_tracking_costs` | Review what each tracked query costs in checks and change frequency, passes or status to fit the plan. |

## ChatGPT submission and skills

[chatgpt-app-submission.json](chatgpt-app-submission.json) contains the app submission metadata,
tool annotation justifications, and review test cases. Keep its tool descriptions and justifications
aligned with the hosted server when capabilities change.

Eight optional skills turn the tools into reusable workflows. ChatGPT does not surface MCP prompts,
so these are how its users get the same guided flows.

Four analyse, and change nothing:

- [Visibility report](skills/mencoro-visibility-report/SKILL.md): performance summaries, trends, and query gains or losses.
- [Competitor analysis](skills/mencoro-competitor-analysis/SKILL.md): share of voice and head-to-head comparisons.
- [Sentiment review](skills/mencoro-sentiment-review/SKILL.md): sentiment breakdowns with attributed mention excerpts.
- [Coverage audit](skills/mencoro-coverage-audit/SKILL.md): current monitoring coverage and stale queries.

Four make changes, each only after the user approves it, and need the `write` scope:

- [Project setup](skills/mencoro-project-setup/SKILL.md): a monitored project from a website, with brand names, competitors and the first tracked prompts.
- [Query expansion](skills/mencoro-query-expansion/SKILL.md): new prompts or keywords worth tracking, added as the user picks them.
- [Cluster reorganisation](skills/mencoro-cluster-reorganisation/SKILL.md): a proposed clustering, reviewed and applied.
- [Cost tuning](skills/mencoro-cost-tuning/SKILL.md): frequency, pass and pause changes that bring check spend within the plan.

In the submission portal's **Skills** step, upload each skill folder under `skills/`, or a ZIP
containing that folder. Include both `SKILL.md` and `agents/openai.yaml`; the latter declares the
existing Mencoro MCP connection. Users need to connect their Mencoro account through OAuth.
These skills require no additional backend endpoint or local executable.

The portal stores an uploaded snapshot. Upload revised bundles when instructions change, and test
each workflow with a connected account before submitting the app. See the
[OpenAI skills guide](https://learn.chatgpt.com/docs/build-skills).

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
| `MENCORO_API_KEY` | Personal access token. Without it the bridge still starts and still advertises the full catalogue, but every tool answers with setup instructions instead of data. |
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

### Without a credential

The bridge starts anyway, serving [`catalog.json`](catalog.json) — a committed copy of what the
hosted server advertises — plus a `mencoro_setup` tool. So `npx -y @mencoro/mcp` introspects to the
same tools and prompts a credentialed run does, and anything that scans the package sees a
real catalogue rather than a server that looks empty. Calling one of those tools returns the setup
instructions as an error; it never returns invented data.

`npm run sync:catalog` refreshes the file from the anonymous catalogue endpoint, and
`npm run check:catalog` fails if the committed copy has fallen behind. A scheduled workflow runs
the check weekly, because the catalogue it mirrors lives in another repository and nothing in a
pull request here would notice it drifting.

## Limits

| | |
|---|---|
| Access | `read` always; `write` and `organization:manage` only when granted, and never beyond your own role. Confirmable changes run only with a token from `preview_operation`. |
| Batches | Tools that act on tracked queries or clusters by id take at most 100 per call (500 for `start_auto_clustering`); each tool's input schema states its limits. |
| Retention | Up to 16 months of history; dates outside the window are rejected. |
| Transport | Streamable HTTP. |
| Rate limiting | Repeatedly presenting an invalid credential is rate limited per IP. |
| Result size | Large result sets are paginated; ask for a narrower window or a coarser granularity if a client truncates. |

## Repository contents

| | |
|---|---|
| `src/`, `test/` | The stdio bridge published as `@mencoro/mcp`. |
| `catalog.json` | What the hosted server advertises, served by the bridge when it has no credential. |
| `scripts/` | Manifest and catalogue checks run by CI. |
| `server.json` | The [MCP registry](https://registry.modelcontextprotocol.io) manifest. |
| `glama.json` | Glama directory ownership metadata. |
| `chatgpt-app-submission.json` | ChatGPT app submission metadata and tool justifications. |
| `skills/` | Eight reusable Mencoro workflows for ChatGPT: four analyses and four guided changes. |
| `Dockerfile` | The image published to `ghcr.io/mencoro/mencoro-mcp`. |
| `assets/`, `logo.png` | Brand assets used by directory listings. |

## Development

```bash
npm ci
npm run typecheck
npm test            # builds first, then runs the suite
npm run check:manifests
npm run check:catalog   # asks the hosted server whether catalog.json is still current
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
* Privacy policy — [mencoro.com/legal/#privacy](https://mencoro.com/legal/#privacy)
* Terms of service — [mencoro.com/legal/#terms](https://mencoro.com/legal/#terms)

## Licence

MIT. See [LICENSE](LICENSE).

The Mencoro name, logo and brand assets in `assets/` are trademarks of Mencoro and are not
covered by that licence.
