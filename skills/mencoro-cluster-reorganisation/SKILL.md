---
name: mencoro-cluster-reorganisation
description: Have Mencoro propose how to group a project's tracked queries into keyword clusters, review the proposal with the user, and apply it; use to organise or regroup queries, not to analyse cluster performance.
---

# Mencoro cluster reorganisation

Regroup a project's tracked queries into clusters. Nothing changes until the user has seen and approved the proposal. Respond in the user's language.

## Establish scope

- Use the connected Mencoro MCP tools. If they are unavailable or authentication fails, ask the user to connect Mencoro. Changing clusters needs the `write` permission; if a tool reports it is missing, tell the user to reconnect with write access rather than retrying.
- Resolve the organization and project with `list_projects`; ask when several could match.
- Agree the mode before starting, and explain the difference:
  - `fill_gaps` places only queries that belong to no cluster yet. The safest choice, and the default.
  - `add_on_top` adds clusters without removing any existing membership.
  - `full_regroup` proposes a fresh grouping of every query and can move queries out of the clusters they are in today. Use it only when the user asks for a regroup.
- Ask whether new clusters may be created, or only the existing ones used (`restrictToExistingClusters`).

## Propose

1. Call `list_clusters` for the current clusters, and `search_tracked_queries` (paging with `limit` and `offset`, at most 100 per call) for the tracked query ids to include. Up to 500 ids go in one job.
2. Call `start_auto_clustering` with `trackedQueryIds`, `mode`, `restrictToExistingClusters` and a fresh `requestId`. Poll `get_job` every few seconds until `status` is `completed` or `failed`; never start another job while one is pending or running.
3. Present the proposal from the job result: each cluster, whether it exists already or would be created, and which queries go into it. For `full_regroup`, point out queries that would leave a cluster they are in today.

## Apply

- Call `apply_auto_clustering` with the `jobId` and a fresh `requestId` only after the user approves the whole proposal. Reuse that `requestId` if the call has to be retried, so it never applies twice.
- If the user wants only part of it, do not apply the job. Make the agreed changes directly: `create_clusters` for new names, then `set_tracked_query_clusters` with `operation: "add"` (or `"remove"`) for the agreed memberships.
- Renaming (`rename_cluster`) and deleting (`delete_cluster`) are separate requests. Deleting needs `preview_operation` with `tool: "delete_cluster"` first and the user's yes on the returned plan; a deleted cluster's queries are kept, they only leave it.

## Handle refusals

- `subscription_not_found`: starting a clustering job needs an active plan. Say so; the user can still create clusters and assign queries by hand.
- A failed job: report it and offer to retry once or to cluster by hand.

## Deliver

List the clusters created and the queries moved, and any the proposal left unplaced. State that no tracked query was created, deleted or re-scheduled.
