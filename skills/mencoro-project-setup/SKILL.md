---
name: mencoro-project-setup
description: Set up a new Mencoro project from a website - brand names, competitors and the first tracked AI prompts - with the user approving each step; use when someone wants to start monitoring a brand, not for analysing an existing project.
---

# Mencoro project setup

Create a monitored project step by step. Every step that creates something waits for the user's explicit approval. Respond in the user's language.

## Before starting

- Use the connected Mencoro MCP tools. If they are unavailable or authentication fails, ask the user to connect Mencoro. Creating anything needs the `write` permission: if a tool reports it is missing, tell the user to reconnect Mencoro with write access (or create an access token that has it) rather than retrying.
- Call `list_projects` and settle the organization. Ask when the user belongs to several; never pick one silently. Check the brand is not already a project there, and offer the existing project instead of a duplicate.
- Collect the website (one or more domains without paths), the brand's name, and the market the user cares about most as an ISO 3166-1 alpha-2 country code. Ask for anything missing.

## Build the project

1. **Brand names.** Call `suggest_brand_names` with `organizationId`, `name`, `websiteDomains`, any `enteredBrandNames` the user gave, and `country`. Poll `get_job` every few seconds until `status` is `completed` or `failed`; never start the job again while it is pending or running. Show the proposed names and let the user confirm, remove or add some.
2. **Project.** Call `create_project` with the confirmed `name`, `websiteDomains` and `brandNames`, and a fresh `requestId`. Reuse that `requestId` if the call has to be retried, so a retry never creates a second project.
3. **Competitors.** Call `discover_brands` for the new project (`country` narrows it to the chosen market), poll `get_job`, and show the brands it found with their domains. Add only the ones the user picks, each with `create_competitor` and its own fresh `requestId`.
4. **Prompts.** Call `discover_prompts` with a short `input` describing what the brand sells and the chosen `country`. Poll `get_job` and present the proposals grouped by theme. Let the user choose; propose at most what they can review, not the whole list.
5. **Tracking.** Agree the engines (for example `chatgpt`, `perplexity`, `google_ai_overview`, `google_ai_mode`), the countries, the check frequency and the passes per check. Call `get_usage` so the choice fits the plan. Then call `preview_operation` with `tool: "create_tracked_queries"` and exactly the arguments you intend to send. Show the returned plan: how many tracked queries it creates, the checks spent now and per month, and every warning. Call `create_tracked_queries` with those same arguments plus the returned `confirmationToken` only after the user says yes.

## Handle refusals

- `subscription_not_found` or a budget warning: the organization has no active plan, or not enough checks. Say so and stop; do not work around it by creating fewer queries unasked.
- An expired or refused `confirmationToken`: something changed since the preview. Preview again and show the new plan; never reuse a token.
- A discovery job that fails: report it and offer to continue without that step, for example by entering competitors or prompts by hand.

## Deliver

Summarise what now exists: the project and its brand names, the competitors added, and the tracked queries created with their engines, countries, frequency and expected monthly checks. Say that the first results arrive after the first checks complete, and that nothing else was changed.
