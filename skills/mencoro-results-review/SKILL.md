---
name: mencoro-results-review
description: Evaluate whether a change - new content, PR coverage, a launch, an optimization - moved a brand's AI visibility in Mencoro, comparing equal windows before and after against a baseline; use for "did it work" questions, not for general reporting.
---

# Mencoro results review

Tell the user whether a change moved AI visibility, how confident that conclusion is, and what to watch next. Use stored Mencoro data only. Respond in the user's language.

## Establish scope

- Use the connected Mencoro MCP tools. If they are unavailable or authentication fails, ask the user to connect Mencoro.
- Resolve the organization and project with `list_projects`; ask when several could match.
- Pin down the change: what it was, the date it went live, and which queries or clusters it was aimed at. Ask for whatever is missing. Find the affected tracked queries with `search_tracked_queries` or `list_clusters`.

## Compare before and after

1. Pick equal windows on both sides of the date, a few weeks each, inside the data available (history goes back 16 months). Use weekly granularity.
2. Read the affected scope with `get_rank_tracking_time_series` (project or cluster filter) and `get_tracked_query_time_series` for single queries: Coverage, share of voice, Favorability (`positivityIndex`) and mention position, per engine.
3. Build the baseline: the same metrics for the untouched queries of the project, and the tracked competitors' share of voice over the same windows (`get_competitor_cooccurrence`, `get_rank_tracking_time_series` with competitor ids). If the untouched queries or the competitors moved the same way, the movement is the market, not the change.
4. Use `get_query_movers` to see whether the affected queries are among the biggest movers.

## Interpret honestly

- AI answers vary from run to run. A change that shows in one or two checks is not a result; look for one that holds across several.
- Read share of voice together with Coverage, and positions only for the checks where the brand appears (lower is better).
- Figures are directional, not audience counts. Correlation in time is not proof of cause: say what else could explain it.
- Use `get_mencoro_guide` when a definition needs to be explained.

## Deliver

Before and after values per metric and engine, the baseline comparison, a plain verdict (moved, did not move, too early to tell) with the confidence and why, and what to watch or change next. State that nothing was changed in the account.
