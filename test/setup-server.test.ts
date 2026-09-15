import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { SETUP_TOOL_NAME, startSetupServer } from '../src/setup-server.ts';
import { StdioPair } from './helpers.ts';

describe('the keyless setup server', () => {
  it('is introspectable without a credential and explains how to get one', async () => {
    const stdio = new StdioPair();
    const server = await startSetupServer(new URL('https://api.mencoro.com/mcp'), stdio.toServer, stdio.fromServer);

    after(async () => {
      await server.close();
    });

    stdio.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test-host', version: '1.0.0' },
      },
    });

    const handshake = await stdio.next();
    const capabilities = (handshake.result as { capabilities: Record<string, unknown> }).capabilities;

    assert.deepEqual(Object.keys(capabilities), ['tools']);

    stdio.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    stdio.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

    const listed = await stdio.next();
    const tools = (listed.result as { tools: { name: string; annotations?: { readOnlyHint?: boolean } }[] }).tools;

    assert.equal(tools.length, 1);
    assert.equal(tools[0]?.name, SETUP_TOOL_NAME);
    assert.equal(tools[0]?.annotations?.readOnlyHint, true);

    stdio.send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: SETUP_TOOL_NAME, arguments: {} } });

    const called = await stdio.next();
    const content = (called.result as { content: { type: string; text: string }[] }).content;

    assert.match(content[0]?.text ?? '', /MENCORO_API_KEY/);
    assert.match(content[0]?.text ?? '', /mcp_pat_/);
  });
});
