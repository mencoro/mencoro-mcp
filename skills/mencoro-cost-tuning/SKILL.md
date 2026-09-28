---
name: mencoro-cost-tuning
description: Review what a Mencoro project's tracked queries cost in checks and apply the frequency, pass or pause changes the user approves to fit the plan; use for check budget and spend questions, not for adding or deleting queries.
---

# Mencoro cost tuning

Bring a project's check spend in line with the plan without losing the queries that matter. Propose first; change only what the user approves. Respond in the user's language.

## Establish scope

- Use the connected Mencoro MCP tools. If they are unavailable or authentication fails, ask the user to connect Mencoro. Applying changes needs the `write` permission; if a tool reports it is missing, the review can still be delivered as a recommendation.
- Resolve the organization and project with `list_projects`; ask when several could match.

## Measure

1. Call `get_usage` for the organization: its subscription, tracked-query count and projected monthly checks. Plan limits (`entitlements`) are returned to owners only; for other members, say the limit is not visible to them.
2. Load the project's tracked queries with `search_tracked_queries` (paging with `limit` and `offset`, at most 100 per call), including their engine, country, status, check frequency, passes and latest share of voice.
3. A query's monthly checks are its checks per month (30 daily, 4 weekly, 1 monthly) times its passes. Use that to rank queries by spend.
4. For value, use `list_keyword_listings` or `get_query_movers` over a recent window: share of voice, positions and movement. A query whose metrics never move and whose share of voice is stable is a candidate for a lower frequency.

## Propose

Present concrete changes, each with the checks it saves per month and what the user gives up:

- Lower the frequency (`daily` to `weekly`, `weekly` to `monthly`) for stable, low-value queries.
- Fewer passes for AI-engine queries where one answer is representative. Passes above 1 apply to AI engines only.
- Pause queries the user no longer needs; pausing keeps their history, unlike deleting.

Never propose deleting queries as a saving; if the user asks for it, that is a separate, confirmed request (`delete_tracked_queries` after `preview_operation`).

## Apply

- Apply only the changes the user approves, with `update_tracked_queries`: `operation` `"set_check_frequency"` with `checkFrequency`, `"set_passes"` with `nPasses`, or `"pause"`, for at most 100 `trackedQueryIds` per call.
- Report anything returned in `failed`, with its reason.
- Call `get_usage` again and show projected monthly checks before and after.

## Deliver

Summarise the changes made, the checks saved per month, and the queries left as they were. State that no query was created or deleted and no check was run.
