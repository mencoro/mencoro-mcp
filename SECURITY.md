# Security

## Reporting a vulnerability

Email **support@mencoro.com** with a description, the steps to reproduce, and
the impact you believe it has. Please do not open a public issue for anything
exploitable.

## Scope

This repository holds the public stdio bridge and the published metadata for the
hosted Mencoro MCP server. Reports about the hosted service are welcome at the
same address.

Mencoro does not run a public bug-bounty or penetration-testing programme, and
nothing here authorises testing against the production service. If you find
something while using your own account in the normal course of things, please
tell us. Please do not run automated scanners against `api.mencoro.com`, and
never access, modify or exfiltrate data belonging to another organization —
use your own account and your own data.

## What this package does with your token

* The token is read from the `MENCORO_API_KEY` environment variable (or an
  `--header` argument) and sent to the configured endpoint as
  `Authorization: Bearer <token>`. It is never written to disk, never logged,
  and never sent anywhere else.
* `mencoro-mcp doctor` prints only the first 20 characters of the token — the
  public prefix Mencoro uses for lookup, not the secret.
* The default endpoint is `https://api.mencoro.com/mcp`. `--url` /
  `MENCORO_MCP_URL` override it; anything you point at receives the token, so
  only point it at a Mencoro environment you trust. Overriding it to a host
  other than the default prints a warning on stderr, and a plaintext `http://`
  endpoint is refused outright unless it is loopback.

Prefer the environment variable over `--header`: process arguments are visible
to other users on the machine through `ps`, environment variables of a running
process are not.

## Token properties

Mencoro personal access tokens are read-only (`mcp_pat_…`), can be scoped to a
single organization, can be given an expiry, and can be revoked at any time
from the **MCP server** page of your Mencoro account (`https://tool.mencoro.com/me/mcp-server`). Revoking a token takes effect
immediately. Nothing this package exposes can modify Mencoro data.
