import type { Readable, Writable } from 'node:stream';

import {
  SdkHttpError,
  StreamableHTTPClientTransport,
  UnauthorizedError,
  isInitializeRequest,
  isJSONRPCRequest,
  isJSONRPCResultResponse,
  type JSONRPCMessage,
  type JSONRPCRequest,
} from '@modelcontextprotocol/client';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

import { log } from './log.ts';
import { USER_AGENT } from './version.ts';

/**
 * Id used for the internal `initialize` replayed after a session is evicted
 * upstream. It never reaches the host, and the response carrying it is
 * swallowed, so it cannot collide with a host-issued id of its own making.
 */
const REPLAY_ID_PREFIX = 'mencoro-mcp/reinitialize/';

export interface BridgeOptions {
  readonly url: URL;
  readonly headers: Readonly<Record<string, string>>;
  /** Injectable for tests; defaults to the process streams. */
  readonly stdin?: Readable;
  readonly stdout?: Writable;
  /** Called once when the bridge can no longer serve the host. */
  readonly onClose?: () => void;
}

export interface Bridge {
  close(): Promise<void>;
}

const isSessionExpired = (error: unknown): boolean =>
  error instanceof SdkHttpError && (error.status === 404 || error.status === 400);

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Splices a stdio transport onto a Streamable HTTP transport at the transport
 * layer: every frame crosses verbatim in both directions.
 *
 * Deliberately not built on `Client`/`Server`. `Protocol` answers `ping`,
 * `notifications/progress` and `notifications/cancelled` itself, `Server` owns
 * `initialize`, and the era codec rejects spec methods absent from the
 * negotiated revision before any fallback handler runs — so nothing routed
 * through those classes can be transparent. Splicing transports means this
 * bridge needs no knowledge of the method set, and keeps working when the
 * upstream server gains methods this package has never heard of.
 */
export const startBridge = async (options: BridgeOptions): Promise<Bridge> => {
  const local = new StdioServerTransport(options.stdin, options.stdout);

  /**
   * The host's `initialize` frame, kept so the session can be rebuilt without
   * the host noticing. Streamable HTTP sessions are server-owned state: a
   * restarted or scaled-down upstream answers the next POST with 404, and
   * without a replay every later request fails for the life of the process.
   */
  let handshake: JSONRPCRequest | undefined;
  let replayCount = 0;
  let closing = false;
  let remote = createRemote();

  function createRemote(): StreamableHTTPClientTransport {
    const transport = new StreamableHTTPClientTransport(options.url, {
      requestInit: { headers: { ...options.headers, 'User-Agent': USER_AGENT } },
    });

    transport.onmessage = (message) => {
      captureNegotiatedVersion(transport, message);

      if (isReplayResponse(message)) {
        return;
      }

      void local.send(message).catch((error: unknown) => {
        log(`mencoro-mcp: could not write to the host: ${describe(error)}`);
      });
    };

    transport.onerror = (error) => {
      log(`mencoro-mcp: upstream error: ${error.message}`);
    };

    transport.onclose = () => {
      void shutdown();
    };

    return transport;
  }

  function isReplayResponse(message: JSONRPCMessage): boolean {
    return 'id' in message && typeof message.id === 'string' && message.id.startsWith(REPLAY_ID_PREFIX);
  }

  /**
   * The host, not this bridge, negotiates the protocol revision. Streamable
   * HTTP requires every post-handshake request to echo the negotiated version
   * in `MCP-Protocol-Version`, and nothing else in a transport-only splice will
   * set it — so read it off the `initialize` result as it passes through.
   */
  function captureNegotiatedVersion(transport: StreamableHTTPClientTransport, message: JSONRPCMessage): void {
    if (handshake === undefined || !isJSONRPCResultResponse(message) || message.id !== handshake.id) {
      return;
    }

    const version = (message.result as { protocolVersion?: unknown }).protocolVersion;

    if (typeof version === 'string') {
      transport.setProtocolVersion(version);
    }
  }

  async function reestablish(): Promise<void> {
    if (handshake === undefined) {
      throw new Error('the upstream session expired before the handshake completed');
    }

    replayCount += 1;

    const previous = remote;
    delete previous.onmessage;
    delete previous.onerror;
    delete previous.onclose;
    await previous.close().catch(() => undefined);

    remote = createRemote();
    await remote.start();

    const replay: JSONRPCRequest = { ...handshake, id: `${REPLAY_ID_PREFIX}${replayCount}` };
    await remote.send(replay);
    await remote.send({ jsonrpc: '2.0', method: 'notifications/initialized' });

    const version = previous.protocolVersion;

    if (version !== undefined) {
      remote.setProtocolVersion(version);
    }

    log('mencoro-mcp: upstream session expired; reconnected transparently.');
  }

  async function forward(message: JSONRPCMessage, allowRetry = true): Promise<void> {
    try {
      await remote.send(message);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError || (error instanceof SdkHttpError && error.status === 401)) {
        log(
          'mencoro-mcp: the Mencoro API rejected the credential (HTTP 401).',
          '\n  Create a token at https://tool.mencoro.com/me/mcp-server and set MENCORO_API_KEY.'
        );
        await shutdown();
        return;
      }

      if (allowRetry && isSessionExpired(error)) {
        try {
          await reestablish();
          await forward(message, false);
          return;
        } catch (retryError: unknown) {
          log(`mencoro-mcp: could not re-establish the upstream session: ${describe(retryError)}`);
          await shutdown();
          return;
        }
      }

      log(`mencoro-mcp: could not reach ${options.url.href}: ${describe(error)}`);
    }
  }

  async function shutdown(): Promise<void> {
    if (closing) {
      return;
    }

    closing = true;

    delete remote.onclose;
    delete local.onclose;

    await remote.terminateSession().catch(() => undefined);
    await Promise.allSettled([remote.close(), local.close()]);

    options.onClose?.();
  }

  local.onmessage = (message) => {
    if (isJSONRPCRequest(message) && isInitializeRequest(message)) {
      handshake = message;
    }

    void forward(message);
  };

  local.onerror = (error) => {
    log(`mencoro-mcp: stdio error: ${error.message}`);
  };

  local.onclose = () => {
    void shutdown();
  };

  await remote.start();
  await local.start();

  return { close: shutdown };
};
