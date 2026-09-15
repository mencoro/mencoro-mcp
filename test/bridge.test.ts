import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { startBridge } from '../src/bridge.ts';
import { StdioPair, startFakeUpstream } from './helpers.ts';

const initialize = {
  jsonrpc: '2.0' as const,
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test-host', version: '1.0.0' },
  },
};

describe('startBridge', () => {
  it('forwards the handshake and tool traffic verbatim, with the credential attached', async () => {
    const upstream = await startFakeUpstream({
      tools: [{ name: 'get_query_movers', description: 'Biggest movers.' }],
    });
    const stdio = new StdioPair();

    const bridge = await startBridge({
      url: upstream.url,
      headers: { Authorization: 'Bearer mcp_pat_test' },
      stdin: stdio.toServer,
      stdout: stdio.fromServer,
    });

    after(async () => {
      await bridge.close();
      await upstream.close();
    });

    stdio.send(initialize);

    const handshake = await stdio.next();
    assert.equal(handshake.id, 1);
    assert.equal((handshake.result as { protocolVersion: string }).protocolVersion, '2025-06-18');

    stdio.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    stdio.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

    const tools = await stdio.next();
    assert.equal(tools.id, 2);
    assert.deepEqual(
      (tools.result as { tools: { name: string }[] }).tools.map((tool) => tool.name),
      ['get_query_movers']
    );

    assert.deepEqual(
      upstream.requests.map((request) => request.method),
      ['initialize', 'notifications/initialized', 'tools/list']
    );

    for (const request of upstream.requests) {
      assert.equal(request.authorization, 'Bearer mcp_pat_test');
    }

    // The negotiated revision is read off the handshake the host performed and
    // echoed on every later request, as Streamable HTTP requires.
    const listRequest = upstream.requests.at(-1);
    assert.equal(listRequest?.protocolVersion, '2025-06-18');
    assert.equal(listRequest?.sessionId, 'session-1');
  });

  it('re-establishes an expired upstream session without the host noticing', async () => {
    // Request 1 is the handshake; request 2 (the first tools/list) is answered
    // with 404, the status a Streamable HTTP server returns for an evicted session.
    const upstream = await startFakeUpstream({ failOnRequest: { index: 2, status: 404 } });
    const stdio = new StdioPair();

    const bridge = await startBridge({
      url: upstream.url,
      headers: { Authorization: 'Bearer mcp_pat_test' },
      stdin: stdio.toServer,
      stdout: stdio.fromServer,
    });

    after(async () => {
      await bridge.close();
      await upstream.close();
    });

    stdio.send(initialize);
    assert.equal((await stdio.next()).id, 1);

    stdio.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

    const tools = await stdio.next();

    assert.equal(tools.id, 2);
    assert.ok(Array.isArray((tools.result as { tools: unknown[] }).tools));

    // Two sessions exist because the handshake was replayed, and the host only
    // ever saw one response per request it sent.
    assert.deepEqual(upstream.sessions, ['session-1', 'session-2']);
    assert.deepEqual(
      upstream.requests.map((request) => request.method),
      ['initialize', 'tools/list', 'initialize', 'notifications/initialized', 'tools/list']
    );
  });

  it('stops when the host closes stdin', async () => {
    const upstream = await startFakeUpstream();
    const stdio = new StdioPair();

    let closed = false;

    const bridge = await startBridge({
      url: upstream.url,
      headers: {},
      stdin: stdio.toServer,
      stdout: stdio.fromServer,
      onClose: () => {
        closed = true;
      },
    });

    after(async () => {
      await upstream.close();
    });

    await bridge.close();

    assert.equal(closed, true);
  });
});
