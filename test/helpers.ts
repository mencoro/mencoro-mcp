import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PassThrough } from 'node:stream';
import { once } from 'node:events';

export interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** A pair of streams standing in for the host's stdin/stdout. */
export class StdioPair {
  public readonly toServer = new PassThrough();

  public readonly fromServer = new PassThrough();

  private buffer = '';

  private readonly queue: JsonRpcMessage[] = [];

  private readonly waiters: ((message: JsonRpcMessage) => void)[] = [];

  public constructor() {
    this.fromServer.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf8');

      let newline = this.buffer.indexOf('\n');

      while (newline !== -1) {
        const line = this.buffer.slice(0, newline).trim();
        this.buffer = this.buffer.slice(newline + 1);

        if (line !== '') {
          const message = JSON.parse(line) as JsonRpcMessage;
          const waiter = this.waiters.shift();

          if (waiter === undefined) {
            this.queue.push(message);
          } else {
            waiter(message);
          }
        }

        newline = this.buffer.indexOf('\n');
      }
    });
  }

  public send(message: JsonRpcMessage): void {
    this.toServer.write(`${JSON.stringify(message)}\n`);
  }

  public async next(timeoutMs = 5_000): Promise<JsonRpcMessage> {
    const queued = this.queue.shift();

    if (queued !== undefined) {
      return queued;
    }

    return new Promise<JsonRpcMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for a message')), timeoutMs);

      this.waiters.push((message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
  }
}

export interface FakeUpstreamOptions {
  /** Tools returned by `tools/list`. */
  readonly tools?: readonly { name: string; description: string }[];
  /** Prompts returned by `prompts/list`. */
  readonly prompts?: readonly { name: string; title: string }[];
  /** Status returned instead of a result, once, on the nth request (1-based). */
  readonly failOnRequest?: { readonly index: number; readonly status: number };
}

export interface FakeUpstream {
  readonly url: URL;
  readonly requests: { method: string; authorization?: string; protocolVersion?: string; sessionId?: string }[];
  readonly sessions: string[];
  close(): Promise<void>;
}

const readBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
};

/** A minimal Streamable HTTP MCP server, enough to exercise the bridge. */
export const startFakeUpstream = async (options: FakeUpstreamOptions = {}): Promise<FakeUpstream> => {
  const tools = options.tools ?? [{ name: 'list_projects', description: 'List projects.' }];
  const prompts = options.prompts ?? [{ name: 'brand_ai_overview', title: 'Brand AI overview' }];
  const requests: FakeUpstream['requests'] = [];
  const sessions: string[] = [];

  let requestCount = 0;

  const server: Server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      if (request.method === 'DELETE') {
        response.writeHead(405).end();

        return;
      }

      if (request.method !== 'POST') {
        response.writeHead(405).end();

        return;
      }

      const body = await readBody(request);
      const message = JSON.parse(body) as JsonRpcMessage;

      requests.push({
        method: message.method ?? '(response)',
        ...(request.headers.authorization === undefined ? {} : { authorization: request.headers.authorization }),
        ...(typeof request.headers['mcp-protocol-version'] === 'string'
          ? { protocolVersion: request.headers['mcp-protocol-version'] }
          : {}),
        ...(typeof request.headers['mcp-session-id'] === 'string'
          ? { sessionId: request.headers['mcp-session-id'] }
          : {}),
      });

      if (message.id === undefined) {
        response.writeHead(202).end();

        return;
      }

      requestCount += 1;

      if (options.failOnRequest !== undefined && options.failOnRequest.index === requestCount) {
        response
          .writeHead(options.failOnRequest.status, { 'content-type': 'application/json' })
          .end(JSON.stringify({ error: 'session not found' }));

        return;
      }

      if (message.method === 'initialize') {
        const sessionId = `session-${sessions.length + 1}`;
        sessions.push(sessionId);

        response
          .writeHead(200, { 'content-type': 'application/json', 'mcp-session-id': sessionId })
          .end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              result: {
                protocolVersion: '2025-06-18',
                capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
                serverInfo: { name: 'fake-mencoro', version: '0.0.0' },
              },
            })
          );

        return;
      }

      if (message.method === 'prompts/list') {
        response
          .writeHead(200, { 'content-type': 'application/json' })
          .end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { prompts } }));

        return;
      }

      if (message.method === 'tools/list') {
        response.writeHead(200, { 'content-type': 'application/json' }).end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: { tools: tools.map((tool) => ({ ...tool, inputSchema: { type: 'object' } })) },
          })
        );

        return;
      }

      response.writeHead(200, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: { content: [{ type: 'text', text: 'ok' }] },
        })
      );
    })();
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const { port } = server.address() as AddressInfo;

  return {
    url: new URL(`http://127.0.0.1:${port}/mcp`),
    requests,
    sessions,
    close: async () => {
      server.closeAllConnections();
      server.close();
      await once(server, 'close');
    },
  };
};
