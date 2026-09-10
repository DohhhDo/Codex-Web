import assert from 'node:assert/strict';
import test from 'node:test';
import type { TestContext } from 'node:test';

import { codexAppServer } from '@/modules/providers/list/codex/codex-app-server.client.js';
import { codexRuntime } from '@/modules/providers/list/codex/codex-runtime.provider.js';
import { CodexSessionsProvider } from '@/modules/providers/list/codex/codex-sessions.provider.js';
import type { AnyRecord, ProviderRuntimeContext } from '@/shared/types.js';

function setup(t: TestContext, execute: (method: string, params: AnyRecord, emit: (method: string, params: AnyRecord) => void) => AnyRecord | Promise<AnyRecord> = () => ({})) {
  let handlers: Parameters<typeof codexAppServer.connect>[0];
  const calls: Array<{ method: string; params: AnyRecord }> = [];
  const messages: AnyRecord[] = [];
  const responses: unknown[] = [];
  let closed = false;
  const emit = (method: string, params: AnyRecord) => handlers?.notification?.(method, { threadId: 'native-thread', ...params });
  t.mock.method(codexAppServer, 'connect', async (callbacks: typeof handlers) => {
    handlers = callbacks;
    return {
      async call(method: string, params: AnyRecord) {
        calls.push({ method, params });
        if (method === 'thread/start' || method === 'thread/resume') return { thread: { id: 'native-thread' }, model: 'test-model' };
        return execute(method, params, emit);
      },
      close() { closed = true; handlers?.closed?.(new Error('closed')); },
    };
  });
  const normalizer = new CodexSessionsProvider();
  const context: ProviderRuntimeContext = {
    resolveProviderSessionId: () => null,
    resolveResumeModel: async () => 'test-model',
    getProviderModels: async () => ({ OPTIONS: [], DEFAULT: 'test-model' }),
    normalizeMessage: (raw, sid) => normalizer.normalizeMessage(raw, sid),
    isProviderInstalled: async () => true,
  };
  return {
    calls, messages, responses, context, emit,
    closed: () => closed,
    request(method: string, params: AnyRecord, id?: string | number) { handlers?.request?.(method, params, (response) => responses.push(response), id); },
    run(command = 'Hello', options: AnyRecord = {}) { return codexRuntime.run(command, { sessionId: 'app-session', cwd: '/workspace', ...options }, { isWebSocketWriter: true, send: (message) => messages.push(message as AnyRecord) }, context); },
  };
}

for (const resumed of [false, true]) for (const permissionMode of ['default', 'unknown', 'acceptEdits', 'bypassPermissions', 'plan']) {
  test(`Codex ${resumed ? 'resumes' : 'starts'} interactive turn (${permissionMode})`, async (t) => {
    const state = setup(t, (method, _params, emit) => {
      if (method === 'turn/start') {
        // Deliberately complete before responding: clients must retain it.
        emit('turn/completed', { turn: { id: 'turn-1', status: 'completed' } });
        return { turn: { id: 'turn-1' } };
      }
      return {};
    });
    state.context.resolveProviderSessionId = () => resumed ? 'native-thread' : null;
    await state.run('Hello', { permissionMode });
    const start = state.calls[0];
    assert.equal(start.method, resumed ? 'thread/resume' : 'thread/start');
    assert.equal(start.params.sandbox, permissionMode === 'bypassPermissions' ? 'danger-full-access' : 'workspace-write');
    assert.equal(start.params.approvalPolicy, ['acceptEdits', 'bypassPermissions'].includes(permissionMode) ? 'never' : 'on-request');
    const turn = state.calls.find((call) => call.method === 'turn/start')!;
    assert.equal(turn.params.collaborationMode.mode, permissionMode === 'plan' ? 'plan' : 'default');
    assert.equal(turn.params.collaborationMode.settings.developer_instructions, null);
    assert.equal(turn.params.input[0].text, 'Hello');
    assert.deepEqual(state.messages.filter((m) => m.kind === 'complete').map((m) => m.exitCode), [0]);
    assert.equal(state.closed(), true);
  });
}

test('streamed snapshots preserve item identity and progressive command output', async (t) => {
  const state = setup(t, (method, _params, emit) => {
    if (method === 'turn/start') {
      emit('item/started', { item: { id: 'text-1', type: 'agentMessage', text: '' } });
      emit('item/agentMessage/delta', { itemId: 'text-1', delta: 'Hello' });
      emit('item/agentMessage/delta', { itemId: 'text-1', delta: ' world' });
      emit('item/completed', { item: { id: 'text-1', type: 'agentMessage', text: 'Hello world' } });
      emit('item/started', { item: { id: 'cmd-1', type: 'commandExecution', command: 'ls', status: 'inProgress' } });
      emit('item/commandExecution/outputDelta', { itemId: 'cmd-1', delta: 'src\n' });
      emit('turn/completed', { turn: { id: 'turn-1', status: 'completed' } });
    }
    return {};
  });
  await state.run();
  const text = state.messages.filter((message) => message.kind === 'text');
  assert.equal(text.at(-1)?.content, 'Hello world');
  assert.deepEqual([...new Set(text.map((message) => message.id))], ['text-1']);
  assert.ok(state.messages.some((message) => message.kind === 'tool_result' && message.content === 'src\n'));
});

test('approval, stable question ids and reconnect replay do not auto-answer', async (t) => {
  const state = setup(t, () => ({ turn: { id: 'turn-1' } }));
  const running = state.run();
  await new Promise((resolve) => setImmediate(resolve));
  state.request('item/commandExecution/requestApproval', { command: 'npm test', threadId: 'native-thread' });
  state.request('item/tool/requestUserInput', { questions: [
    { id: 'first', question: 'Same title', options: null }, { id: 'second', question: 'Same title', options: [] },
  ] });
  const pending = codexRuntime.permissions.listPending('app-session');
  assert.equal(pending.length, 2);
  assert.equal(pending[0].sessionId, 'app-session');
  assert.equal(state.responses.length, 0);
  codexRuntime.permissions.resolve(pending[0].requestId, { allow: false });
  codexRuntime.permissions.resolve(pending[1].requestId, { allow: true, updatedInput: { answers: { first: ['one'], second: ['two'] } } });
  assert.deepEqual(state.responses, [{ decision: 'decline' }, { answers: { first: { answers: ['one'] }, second: { answers: ['two'] } } }]);
  assert.equal(codexRuntime.permissions.listPending('app-session').length, 0);
  state.emit('turn/completed', { turn: { status: 'completed' } });
  await running;
});

test('failed turns emit exactly one failed completion and clean pending requests', async (t) => {
  const state = setup(t, (method, _params, emit) => {
    if (method === 'turn/start') emit('turn/completed', { turn: { status: 'failed', error: { message: 'quota exceeded' } } });
    return {};
  });
  await state.run();
  assert.deepEqual(state.messages.filter((m) => m.kind === 'complete').map((m) => m.exitCode), [1]);
  assert.equal(state.closed(), true);
});

test('steer targets the active turn and abort closes its process', async (t) => {
  const state = setup(t, () => ({ turn: { id: 'turn-1' } }));
  const running = state.run();
  await new Promise((resolve) => setImmediate(resolve));
  await codexRuntime.control('app-session', 'steer', { content: 'Use TypeScript' });
  const steer = state.calls.find((call) => call.method === 'turn/steer')!;
  assert.equal(steer.params.expectedTurnId, 'turn-1');
  assert.equal(steer.params.input[0].text, 'Use TypeScript');
  assert.equal(await codexRuntime.abort('app-session'), true);
  await running;
  assert.equal(state.closed(), true);
  assert.equal(codexRuntime.permissions.listPending('app-session').length, 0);
  assert.equal(state.messages.filter((m) => m.kind === 'complete').length, 0);
});

test('explicit skills use discovered paths, disabled skills are not injected', async (t) => {
  const state = setup(t, (method, _params, emit) => {
    if (method === 'skills/list') return { data: [{ skills: [{ name: 'test', path: '/skills/test/SKILL.md', enabled: true }, { name: 'disabled', path: '/skills/disabled', enabled: false }] }] };
    if (method === 'turn/start') emit('turn/completed', { turn: { status: 'completed' } });
    return {};
  });
  await state.run('$test $disabled Run checks');
  const input = state.calls.find((call) => call.method === 'turn/start')!.params.input;
  assert.deepEqual(input.filter((item: AnyRecord) => item.type === 'skill'), [{ type: 'skill', name: 'test', path: '/skills/test/SKILL.md' }]);
});

test('goal follows native continuations without submitting duplicate turns', async (t) => {
  let finished = false;
  const state = setup(t, (method) => {
    if (method === 'thread/goal/set') return { goal: { status: 'active' } };
    if (method === 'thread/goal/get') return { goal: { status: finished ? 'complete' : 'active' } };
    return {};
  });
  const running = state.run('/goal --budget 40000 Complete the migration');
  await new Promise((resolve) => setImmediate(resolve));
  state.emit('turn/started', { turn: { id: 'native-1' } });
  state.emit('turn/completed', { turn: { id: 'native-1', status: 'completed' } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.closed(), false);
  state.emit('turn/started', { turn: { id: 'native-2' } });
  finished = true;
  state.emit('thread/goal/updated', { goal: { status: 'complete' } });
  state.emit('turn/completed', { turn: { id: 'native-2', status: 'completed' } });
  await running;
  assert.equal(state.calls.filter((call) => call.method === 'turn/start').length, 0);
  assert.equal(state.calls.find((call) => call.method === 'thread/goal/set')?.params.tokenBudget, 40000);
});

for (const allow of [true, false]) test(`plan requires explicit implementation decision: ${allow}`, async (t) => {
  let turns = 0;
  const state = setup(t, (method, _params, emit) => {
    if (method === 'turn/start') {
      turns++;
      if (turns === 1) emit('item/completed', { item: { id: 'plan', type: 'plan', text: 'Implement the feature and run tests.' } });
      emit('turn/completed', { turn: { id: `turn-${turns}`, status: 'completed' } });
    }
    return {};
  });
  const running = state.run('Plan this work', { permissionMode: 'plan' });
  await new Promise((resolve) => setImmediate(resolve));
  const pending = codexRuntime.permissions.listPending('app-session');
  assert.equal(pending.length, 1);
  assert.equal(turns, 1);
  codexRuntime.permissions.resolve(pending[0].requestId, { allow });
  await running;
  assert.equal(turns, allow ? 2 : 1);
  if (allow) assert.equal(state.calls.filter((call) => call.method === 'turn/start')[1].params.collaborationMode.mode, 'default');
});

test('native approval expiry removes replay and ignores stale browser approval', async (t) => {
  const state = setup(t, () => ({ turn: { id: 'turn-1' } }));
  const running = state.run();
  await new Promise((resolve) => setImmediate(resolve));
  state.request('item/commandExecution/requestApproval', { command: 'ls' }, 33);
  const pending = codexRuntime.permissions.listPending('app-session')[0];
  state.emit('serverRequest/resolved', { requestId: 33 });
  codexRuntime.permissions.resolve(pending.requestId, { allow: true });
  assert.deepEqual(state.responses, []);
  assert.equal(codexRuntime.permissions.listPending('app-session').length, 0);
  await codexRuntime.abort('app-session');
  await running;
});

test('voice remains connected across delegated turn completion and stops cleanly', async (t) => {
  const state = setup(t);
  const running = state.run('/voice', { realtimeSdp: 'local-offer' });
  await new Promise((resolve) => setImmediate(resolve));
  state.emit('thread/realtime/sdp', { sdp: 'remote-answer' });
  state.emit('turn/completed', { turn: { id: 'voice-turn', status: 'completed' } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.closed(), false);
  assert.ok(state.messages.some((message) => message.sdp === 'remote-answer'));
  state.emit('thread/realtime/closed', {});
  await running;
  assert.equal(state.closed(), true);
});

test('saved goal status does not resume or run the thread', async (t) => {
  const state = setup(t, () => ({ goal: { objective: 'Saved objective', status: 'paused', tokensUsed: 12, timeUsedSeconds: 3 } }));
  state.context.resolveProviderSessionId = () => 'native-thread';
  await state.run('/goal status');
  assert.deepEqual(state.calls.map((call) => call.method), ['thread/goal/get']);
  assert.ok(state.messages.some((message) => message.content?.includes('Saved objective')));
});

test('late voice cancellation cannot stop an ordinary task', async (t) => {
  const state = setup(t, () => ({ turn: { id: 'turn-1' } }));
  const running = state.run('Run the tests');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(await codexRuntime.control('app-session', 'voice', { operation: 'stop' }), { stopped: false });
  assert.equal(state.closed(), false);
  state.emit('turn/completed', { turn: { status: 'completed' } });
  await running;
});

test('image output, every child agent, search sources and native usage metadata survive normalization', async (t) => {
  const state = setup(t, (method, _params, emit) => {
    if (method !== 'turn/start') return {};
    emit('item/completed', { item: { id: 'image', type: 'imageGeneration', status: 'completed', result: 'base64-image', revisedPrompt: 'A diagram' } });
    emit('item/completed', { item: { id: 'agents', type: 'collabAgentToolCall', receiverThreadIds: ['first', 'second'], agentsStates: { first: { status: 'completed', message: 'First result' }, second: { status: 'completed', message: 'Second result' } } } });
    emit('item/completed', { item: { id: 'search', type: 'webSearch', query: 'docs', results: [{ title: 'Docs', url: 'https://example.com' }] } });
    emit('thread/tokenUsage/updated', { tokenUsage: { total: { inputTokens: 300, outputTokens: 100, cachedInputTokens: 200, totalTokens: 400 }, last: { totalTokens: 80 }, modelContextWindow: 1000 } });
    emit('account/rateLimits/updated', { rateLimits: { planType: 'pro', primary: { usedPercent: 42, windowDurationMins: 300, resetsAt: 2000000000 } } });
    emit('turn/completed', { turn: { status: 'completed' } });
    return {};
  });
  await state.run();
  assert.equal(state.messages.find((message) => message.images)?.images[0].data, 'data:image/png;base64,base64-image');
  assert.deepEqual(state.messages.filter((message) => message.subagent).map((message) => message.subagent.id), ['first', 'second']);
  assert.ok(state.messages.find((message) => message.toolId === 'search' && message.kind === 'tool_result')?.content.includes('https://example.com'));
  const budget = state.messages.filter((message) => message.tokenBudget).at(-1)!.tokenBudget;
  assert.equal(budget.used, 80);
  assert.equal(budget.cacheReadTokens, 200);
  assert.equal(budget.rateLimits.primary.usedPercent, 42);
});
