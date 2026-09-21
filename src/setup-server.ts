import type { Readable, Writable } from 'node:stream';

import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import type { JsonSchemaValidator, jsonSchemaValidator } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

import { CATALOG, promptArgumentsSchema } from './catalog.ts';
import { DEFAULT_MCP_URL, TOKEN_ENV_VAR } from './config.ts';
import { PACKAGE_VERSION } from './version.ts';

export const SETUP_TOOL_NAME = 'mencoro_setup';

const setupText = (url: URL): string =>
  [
    'The Mencoro MCP bridge is running without a credential, so no Mencoro data is reachable yet.',
    '',
    'To finish setup:',
    '  1. Sign in at https://tool.mencoro.com and open the MCP server page (/me/mcp-server).',
    '  2. Create a Personal Access Token. It is shown once and starts with "mcp_pat_".',
    `  3. Restart this MCP server with ${TOKEN_ENV_VAR}=mcp_pat_… in its environment.`,
    '',
    `Upstream endpoint: ${url.href}`,
    '',
    'Clients that speak remote MCP (Claude, ChatGPT, Claude Code, Cursor, VS Code, Codex,',
    'Gemini CLI, OpenCode, Antigravity) do not need this bridge at all: point them straight',
    `at ${DEFAULT_MCP_URL} and sign in with OAuth.`,
  ].join('\n');

const credentialRequired = (name: string, url: URL): string =>
  `"${name}" needs a Mencoro credential, and this bridge has none.\n\n${setupText(url)}`;

/**
 * Accepts whatever it is given, because nothing here is ever executed with it.
 *
 * The default validator would reject a call with missing or malformed arguments before the handler
 * runs, and answer with a schema complaint. That is the right answer on the hosted server and the
 * wrong one here: the only thing this server can tell a caller is that a credential is missing, and
 * making them guess their way to it — argument by argument — buries the one useful message.
 */
const acceptAnyArguments: jsonSchemaValidator = {
  getValidator<T>(): JsonSchemaValidator<T> {
    return (input: unknown) => ({ valid: true, data: input as T, errorMessage: undefined });
  },
};

/**
 * The server this package runs when no credential is configured.
 *
 * It exists so the package is introspectable without a secret: MCP registries, directory scanners
 * and `npx` tyre-kickers can start it, read `tools/list` and `prompts/list`, and see exactly what
 * a credentialed run offers. It advertises the real catalogue rather than only `mencoro_setup`,
 * because a server whose entire surface is one setup tool is indistinguishable from a server with
 * nothing to offer — which is how it gets indexed.
 *
 * Advertising is not pretending: every catalogue tool answers a call with the setup instructions
 * and `isError`, so a model that tries one is told precisely what is missing instead of being
 * handed an empty result. What the catalogue cannot do is invent data, and it does not try to.
 */
export const createSetupServer = (url: URL): McpServer => {
  const server = new McpServer(
    { name: 'mencoro-mcp-setup', title: 'Mencoro (setup required)', version: PACKAGE_VERSION },
    {
      capabilities: { tools: {}, prompts: {} },
      instructions:
        `This Mencoro MCP bridge has no credential configured, so every tool below reports what is ` +
        `missing rather than returning data. Call "${SETUP_TOOL_NAME}" for setup instructions.`,
    }
  );

  server.registerTool(
    SETUP_TOOL_NAME,
    {
      title: 'Mencoro setup instructions',
      description:
        'Explain how to finish connecting this bridge to Mencoro. The bridge has no API token, so no project, ranking, mention or share-of-voice data can be read until one is configured.',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    () => ({ content: [{ type: 'text' as const, text: setupText(url) }] })
  );

  for (const tool of CATALOG.tools) {
    server.registerTool(
      tool.name,
      {
        ...(tool.title === undefined ? {} : { title: tool.title }),
        ...(tool.description === undefined ? {} : { description: tool.description }),
        ...(tool.annotations === undefined ? {} : { annotations: tool.annotations }),
        inputSchema: fromJsonSchema(tool.inputSchema, acceptAnyArguments),
      },
      () => ({ content: [{ type: 'text' as const, text: credentialRequired(tool.name, url) }], isError: true })
    );
  }

  for (const prompt of CATALOG.prompts) {
    server.registerPrompt(
      prompt.name,
      {
        ...(prompt.title === undefined ? {} : { title: prompt.title }),
        ...(prompt.description === undefined ? {} : { description: prompt.description }),
        argsSchema: fromJsonSchema<Record<string, string>>(promptArgumentsSchema(prompt), acceptAnyArguments),
      },
      () => {
        // A prompt has no error channel of its own: rendering one here would hand the model an
        // instruction to call tools that cannot answer. Failing the request says so directly.
        throw new Error(credentialRequired(prompt.name, url));
      }
    );
  }

  return server;
};

export const startSetupServer = async (
  url: URL,
  stdin?: Readable,
  stdout?: Writable
): Promise<{ close: () => Promise<void> }> => {
  const server = createSetupServer(url);

  await server.connect(new StdioServerTransport(stdin, stdout));

  return { close: () => server.close() };
};
