import {
  Client,
  SdkHttpError,
  StreamableHTTPClientTransport,
  UnauthorizedError,
} from '@modelcontextprotocol/client';

import { TOKEN_ENV_VAR, type Config } from './config.ts';
import { PACKAGE_VERSION, USER_AGENT } from './version.ts';

const line = (label: string, value: string): string => `${label.padEnd(18)}${value}`;

/**
 * A one-shot connectivity and credential check.
 *
 * `doctor` writes to stdout on purpose: it is a CLI command, not an MCP
 * session, so nothing is listening for framed messages on that stream.
 */
export const runDoctor = async (config: Config, write: (text: string) => void): Promise<number> => {
  write(`mencoro-mcp ${PACKAGE_VERSION}`);
  write(line('Endpoint', config.url.href));
  write(line('Credential', config.token === undefined ? `missing (set ${TOKEN_ENV_VAR})` : `${config.token.slice(0, 20)}…`));

  if (config.token === undefined) {
    write('');
    write('No credential configured, so nothing was contacted.');
    write('Create a token at https://tool.mencoro.com/me/mcp-server, then re-run "mencoro-mcp doctor".');

    return 1;
  }

  const transport = new StreamableHTTPClientTransport(config.url, {
    requestInit: { headers: { ...config.headers, 'User-Agent': USER_AGENT } },
  });

  const client = new Client({ name: 'mencoro-mcp-doctor', version: PACKAGE_VERSION });

  try {
    await client.connect(transport);

    const server = client.getServerVersion();
    const capabilities = client.getServerCapabilities() ?? {};

    write(line('Server', server === undefined ? 'unknown' : `${server.name} ${server.version}`));
    write(line('Protocol', transport.protocolVersion ?? 'not reported'));
    write(line('Capabilities', Object.keys(capabilities).sort().join(', ') || 'none'));

    if (capabilities.tools !== undefined) {
      const { tools } = await client.listTools();
      write(line('Tools', String(tools.length)));

      for (const tool of tools) {
        write(`  - ${tool.name}${tool.title === undefined ? '' : ` — ${tool.title}`}`);
      }
    }

    if (capabilities.prompts !== undefined) {
      const { prompts } = await client.listPrompts();
      write(line('Prompts', String(prompts.length)));

      for (const prompt of prompts) {
        write(`  - ${prompt.name}${prompt.title === undefined ? '' : ` — ${prompt.title}`}`);
      }
    }

    write('');
    write('OK — the credential works and the server answered.');

    return 0;
  } catch (error: unknown) {
    write('');

    if (error instanceof UnauthorizedError || (error instanceof SdkHttpError && error.status === 401)) {
      write('FAILED — the Mencoro API rejected the credential (HTTP 401).');
      write('The token may be revoked, expired, or from a different environment.');
      write('Create a new one at https://tool.mencoro.com/me/mcp-server.');

      return 1;
    }

    if (error instanceof SdkHttpError) {
      write(`FAILED — the Mencoro API answered HTTP ${error.status} ${error.statusText ?? ''}`.trimEnd());

      return 1;
    }

    write(`FAILED — ${error instanceof Error ? error.message : String(error)}`);

    return 1;
  } finally {
    await client.close().catch(() => undefined);
  }
};
