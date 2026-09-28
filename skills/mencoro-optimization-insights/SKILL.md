---
name: mencoro-optimization-insights
description: Find and prioritise what to improve for a brand's AI visibility from Mencoro data - where competitors win, the sources AI answers cite, sentiment and coverage gaps, untracked competitors - optionally combined with connected Ahrefs, Semrush, Search Console or Google Analytics tools; use for "what should we do next" questions.
---

# Mencoro optimization insights

Turn Mencoro evidence into a short, prioritised action list. Respond in the user's language.

## Establish scope

- Use the connected Mencoro MCP tools. If they are unavailable or authentication fails, ask the user to connect Mencoro.
- Resolve the organization and project with `list_projects`; ask when several could match. Default to the last 30 days and state the dates.

## Collect evidence

1. **Where competitors win**: `get_competitor_cooccurrence` for head-to-head results, and `search_tracked_queries` (sorted by share of voice) for the queries where a tracked competitor is named and the brand is not, or is named after it.
2. **What the answers cite**: `get_cited_sources` for those queries. The domains and pages cited are the places to be present on, through content, PR or outreach.
3. **How the brand is described**: `get_sentiment_breakdown` and `get_mention_samples` for negative or merely neutral mentions (quote a few), and `get_mention_mix` for mentions that are listings or references rather than recommendations.
4. **Who else is in the answers**: `list_untracked_competitors` for brands the answers name that are not tracked; suggest tracking the relevant ones.
5. **Gaps in the data**: `get_tracking_coverage` for engines or countries with weak coverage and for stale or paused queries.

## Add other sources when available

If the conversation also has Ahrefs, Semrush, Google Search Console or Google Analytics tools, use them for: backlinks from the cited domains to competitors but not to the brand (Ahrefs or Semrush); search demand for the topics behind the tracked prompts; topics where the brand ranks organically but is not named in AI Overview or AI Mode answers; high-impression Search Console queries not tracked yet; AI referral sessions (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai) next to share of voice, as correlation only. Those services spend their own quotas. If none are connected, `get_mencoro_guide` topic `companion-servers` explains which would help.

## Deliver

A prioritised list (highest impact first). Each item: the opportunity, the evidence (queries, figures, example answers), the likely action (content, PR or outreach, product pages, tracking changes), and a rough impact and effort. Read share of voice together with Coverage and treat figures as directions. State that nothing was changed in the account; changes such as adding competitors or queries are separate requests.
