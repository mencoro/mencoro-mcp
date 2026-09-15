/**
 * stdout is the MCP wire. Anything written there that is not a framed JSON-RPC
 * message corrupts the stream and the host disconnects, so every human-readable
 * line — including fatal errors — goes to stderr.
 */
export const log = (...parts: readonly unknown[]): void => {
  process.stderr.write(`${parts.map((part) => String(part)).join(' ')}\n`);
};
