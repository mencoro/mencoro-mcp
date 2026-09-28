---
name: mencoro-project-setup
description: Set up a new Mencoro project from a website in a short, interactive conversation - brand names and suggested competitors shown as one proposal before anything is created, then the first tracked AI prompts; use when someone wants to start monitoring a brand, not for analysing an existing project.
---

# Mencoro project setup

Get a brand monitored with as few questions as possible, and nothing created until the user has seen and approved it. Respond in the user's language.

## Before starting

- Use the connected Mencoro MCP tools. If they are unavailable or authentication fails, ask the user to connect Mencoro. Creating anything needs the `write` permission: if a tool reports it is missing, tell the user to reconnect Mencoro with write access (or create an access token that has it) rather than retrying.
- Call `list_projects`. If the brand is already a project in one of the user's organizations, offer that project instead of a duplicate.

## Gather what is missing, in one question

Ask only for what you do not already know, together: the website (domains without paths), the brand name, the countries that matter (ISO 3166-1 alpha-2 codes), and the organization when the user belongs to several.

## Prepare one proposal, create nothing yet

1. **Brand names.** Call `suggest_brand_names` with `organizationId`, `name`, `websiteDomains`, any `enteredBrandNames` the user gave, and the main `country`. Poll `get_job` every few seconds until `status` is `completed` or `failed`; never start the job again while it is pending or running.
2. **Competitors.** Suggest 3 to 5 direct competitors for this market that you know of, each with its website. Say plainly they are your suggestions: no Mencoro tool finds competitors. For each, call `suggest_brand_names` to find the names it goes by (the organization can start at most 10 of these jobs a minute).
3. **Show everything at once**: the project name, the brand names and domains, each competitor with its website and names, and the countries. Let the user add, drop or rename anything.

## Create after the user confirms

- Call `create_project` with the confirmed `name`, `websiteDomains`, `brandNames` and `competitors`, and a fresh `requestId`. Reuse that `requestId` if the call has to be retried, so a retry never creates a second project.

## Propose what to track

1. Call `discover_prompts` with a short `input` describing what the brand offers and the main `country` (and `discover_keywords` if the user also wants Google search). Poll `get_job` and present a starting set grouped by theme.
2. Agree the engines (for example `chatgpt`, `perplexity`, `google_ai_overview`, `google_ai_mode`), the countries, a weekly check frequency unless the user wants otherwise, and the passes per check. Call `get_usage` so the choice fits the plan.
3. Call `preview_operation` with `tool: "create_tracked_queries"` and exactly the arguments you intend to send. Show the plan: how many tracked queries it creates, the checks spent now and per month, and every warning. Call `create_tracked_queries` with those same arguments plus the returned `confirmationToken` only after the user says yes.

## After the first checks

New queries are checked straight away. Call `list_untracked_competitors` and tell the user which other brands the answers name, so they can add any with `create_competitor`. Offer `discover_brands` to find more names the brand and its competitors go by, applied with `update_project` or `update_competitor`.

## Handle refusals

- `subscription_not_found` or a budget warning: the organization has no active plan, or not enough checks. Say so and stop; do not work around it by creating fewer queries unasked.
- An expired or refused `confirmationToken`: something changed since the preview. Preview again and show the new plan; never reuse a token.
- A discovery job that fails: report it and offer to continue without that step, for example with competitors or prompts the user enters.
- `rate_limit_exceeded`: wait the time it states before starting more jobs.

## Deliver

Summarise what now exists: the project and its brand names, the competitors, and the tracked queries with their engines, countries, frequency and expected monthly checks. Say that results build up as the checks run.
