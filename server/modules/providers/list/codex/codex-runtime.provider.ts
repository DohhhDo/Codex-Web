import { randomUUID } from 'node:crypto';

import { readCodexProposedPlan, unifiedDiffToTexts } from '@/modules/providers/list/codex/codex-sessions.provider.js';
import { codexAppServer } from '@/modules/providers/list/codex/codex-app-server.client.js';
import { appendFilesInputTag, buildCodexInputItems, createCompleteMessage, createNormalizedMessage, readCodexUsageMetadata } from '@/shared/index.js';
import { notifyRunFailed, notifyRunStopped } from '@/modules/notifications/index.js';
import type { AnyRecord, ProviderPermissionDecision, ProviderRuntimeContext, ProviderRuntimeWriter } from '@/shared/types.js';

// Each run owns its process, pending requests and item buffers. A disconnected
// browser does not close it; the session writer buffers events for reconnect.
type CodexRun = {
  client: Awaited<ReturnType<typeof codexAppServer.connect>> | null;
  threadId: string | null;
  turnId: string | null;
  aborted: boolean;
  voice: boolean;
  writer: ProviderRuntimeWriter;
  pending: Map<string, { message: AnyRecord; respond: (decision: ProviderPermissionDecision) => void }>;
};
const runs = new Map<string, CodexRun>();

function send(writer: ProviderRuntimeWriter, data: unknown) {
  writer.send(writer.isWebSocketWriter || writer.isSSEStreamWriter ? data : JSON.stringify(data));
}

function permissionOptions(mode: string) {
  return {
    sandbox: mode === 'bypassPermissions' ? 'danger-full-access' : 'workspace-write',
    approvalPolicy: mode === 'acceptEdits' || mode === 'bypassPermissions' ? 'never' : 'on-request',
    approvalsReviewer: 'user',
  };
}

function questionResponse(params: AnyRecord, decision: ProviderPermissionDecision) {
  const supplied = (decision.updatedInput as AnyRecord | undefined)?.answers ?? {};
  const answers: AnyRecord = {};
  for (const question of params.questions ?? []) {
    const value = supplied[question.id] ?? supplied[question.question];
    if (decision.allow && (typeof value === 'string' || Array.isArray(value))) {
      answers[question.id] = { answers: Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [value] };
    }
  }
  return { answers };
}

function receiveRequest(run: CodexRun, method: string, params: AnyRecord, respond: (value: unknown) => void, nativeRequestId?: string | number) {
  const requestId = `codex:${randomUUID()}`;
  let toolName: string;
  let input: AnyRecord = params;
  let translate: (decision: ProviderPermissionDecision) => unknown;
  switch (method) {
    case 'item/commandExecution/requestApproval':
      toolName = 'CodexCommand';
      translate = (decision) => ({ decision: decision.allow ? 'accept' : 'decline' });
      break;
    case 'item/fileChange/requestApproval':
      toolName = 'CodexFileChange';
      translate = (decision) => ({ decision: decision.allow ? 'accept' : 'decline' });
      break;
    case 'item/permissions/requestApproval':
      toolName = 'CodexPermissions';
      translate = (decision) => ({
        permissions: decision.allow ? Object.fromEntries(Object.entries(params.permissions ?? {}).filter(([, value]) => value !== null)) : {},
        scope: 'turn',
      });
      break;
    case 'item/tool/requestUserInput':
    case 'tool/requestUserInput':
      toolName = 'AskUserQuestion';
      input = { questions: (params.questions ?? []).map((question: AnyRecord) => ({ ...question, options: question.options ?? [] })), provider: 'codex' };
      translate = (decision) => questionResponse(params, decision);
      break;
    case 'mcpServer/elicitation/request':
      toolName = 'CodexElicitation';
      translate = (decision) => ({ action: decision.allow ? 'accept' : 'decline', content: decision.allow ? (decision.updatedInput as AnyRecord | undefined)?.content ?? null : null, _meta: null });
      break;
    default:
      // Never approve an unknown request or let it hang indefinitely.
      if (method !== 'item/tool/call') throw new Error(`Unsupported Codex client request: ${method}`);
      respond({ success: false, contentItems: [{ type: 'inputText', text: `Unsupported client tool: ${params.tool ?? method}` }] });
      return;
  }
  const message = { requestId, toolName, input, context: { provider: 'codex', method, turnId: params.turnId, nativeRequestId }, sessionId: run.threadId };
  run.pending.set(requestId, {
    message,
    respond: (decision) => {
      run.pending.delete(requestId);
      respond(translate(decision));
      send(run.writer, createNormalizedMessage({ kind: 'permission_resolved', provider: 'codex', sessionId: run.threadId, requestId }));
    },
  });
  send(run.writer, createNormalizedMessage({ kind: 'permission_request', provider: 'codex', ...message }));
}

// Translate the native item vocabulary into the existing transcript contract.
// Full text snapshots share the provider item id, including their final event.
function emitItem(item: AnyRecord, context: ProviderRuntimeContext, run: CodexRun) {
  const base = { sessionId: run.threadId, provider: 'codex' as const, id: item.id };
  const emit = (payload: AnyRecord) => send(run.writer, createNormalizedMessage({ ...base, kind: 'tool_use', ...payload }));
  const status = item.status === 'inProgress' ? 'in_progress' : item.status;
  let raw: AnyRecord;
  switch (item.type) {
    case 'agentMessage': raw = { itemType: 'agent_message', message: { content: item.text } }; break;
    case 'reasoning': raw = { itemType: 'reasoning', message: { content: (item.summary?.length ? item.summary : item.content ?? []).join('\n\n') } }; break;
    case 'commandExecution': raw = { itemType: 'command_execution', command: item.command, output: item.aggregatedOutput, exitCode: item.exitCode, status }; break;
    case 'fileChange':
      for (const [index, change] of (item.changes ?? []).entries()) {
        const id = `${item.id}_${index}`;
        const diff = unifiedDiffToTexts(change.diff ?? '');
        emit({ id, kind: 'tool_use', toolId: id, toolName: change.kind?.type === 'add' ? 'Write' : 'Edit', toolInput: { file_path: change.path, old_string: diff.oldText, new_string: diff.newText }, status });
      }
      return;
    case 'mcpToolCall': raw = { ...item, itemType: 'mcp_tool_call', status }; break;
    case 'plan': emit({ kind: 'tool_use', toolName: 'ExitPlanMode', toolId: item.id, toolInput: { plan: item.text } }); return;
    case 'webSearch':
      emit({ kind: 'tool_use', toolName: 'WebSearch', toolId: item.id, toolInput: { query: item.query, action: item.action }, status });
      if (item.results) emit({ id: `${item.id}_result`, kind: 'tool_result', toolId: item.id, content: JSON.stringify(item.results) });
      return;
    case 'imageGeneration':
      if (item.status === 'completed' && item.result) {
        emit({ kind: 'text', role: 'assistant', content: item.revisedPrompt ?? '', images: [{ data: `data:image/png;base64,${item.result}`, name: `generated-${item.id}.png` }] });
      } else emit({ kind: 'tool_use', toolName: 'ImageGeneration', toolId: item.id, toolInput: { prompt: item.revisedPrompt ?? '' }, status });
      return;
    case 'collabAgentToolCall': {
      const receivers: string[] = item.receiverThreadIds?.length ? item.receiverThreadIds : [item.id];
      for (const agentId of receivers) {
        const agent = item.agentsStates?.[agentId];
        const toolId = receivers.length === 1 ? item.id : `${item.id}:${agentId}`;
        emit({ id: toolId, kind: 'tool_use', toolName: 'Task', toolId, toolInput: { description: item.prompt ?? item.tool }, subagent: {
          id: agentId, description: item.prompt ?? item.tool, model: item.model,
          status: ['completed', 'shutdown'].includes(agent?.status) ? 'completed' : ['errored', 'notFound', 'interrupted'].includes(agent?.status) ? 'failed' : 'running',
        } });
        if (agent?.message) emit({ id: `${toolId}_result`, kind: 'tool_result', toolId, content: agent.message });
      }
      return;
    }
    case 'userMessage': return; // The send path already creates the user's echo.
    case 'contextCompaction': emit({ kind: 'status', text: 'Compacting conversation context…' }); return;
    case 'exitedReviewMode': emit({ kind: 'text', role: 'assistant', content: item.review }); return;
    default:
      emit({ kind: 'tool_use', toolName: item.type, toolId: item.id, toolInput: item, status });
      return;
  }
  for (const message of context.normalizeMessage({ ...raw, type: 'item', itemId: item.id }, run.threadId)) send(run.writer, message);
}

async function buildInput(client: NonNullable<CodexRun['client']>, command: string, options: AnyRecord, cwd: string) {
  const input: AnyRecord[] = [{ type: 'text', text: appendFilesInputTag(command, options.files), text_elements: [] }];
  for (const image of buildCodexInputItems('', options.images, cwd)) if (image.type === 'local_image') input.push({ type: 'localImage', path: image.path });
  // Resolve explicit skill tokens against the server's own discovery results,
  // never a browser-supplied filesystem path.
  const names = new Set(Array.from(command.matchAll(/(?:^|\s)\$([\w:.-]+)/g), (match) => match[1]));
  if (names.size) {
    const result = await client.call('skills/list', { cwds: [cwd] });
    for (const group of result.data ?? []) for (const skill of group.skills ?? []) {
      if (names.has(skill.name) && skill.enabled !== false) {
        input.push({ type: 'skill', name: skill.name, path: skill.path });
        names.delete(skill.name);
      }
    }
  }
  const appIds = new Set(Array.from(command.matchAll(/(?:^|\s)@app:([\w-]+)/g), (match) => match[1]));
  if (appIds.size) {
    let cursor: string | undefined;
    do {
      const result = await client.call('app/list', { limit: 100, ...(cursor ? { cursor } : {}) });
      for (const app of result.data ?? []) if (appIds.has(app.id) && app.isAccessible && app.isEnabled) {
        input.push({ type: 'mention', name: app.name, path: `app://${app.id}` });
        appIds.delete(app.id);
      }
      cursor = result.nextCursor || undefined;
    } while (cursor && appIds.size);
    if (appIds.size) throw new Error('A selected app is unavailable. Connect or enable it before sending.');
  }
  return input;
}

async function queryCodex(command: string, options: AnyRecord, writer: ProviderRuntimeWriter, context: ProviderRuntimeContext) {
  const sessionId = options.sessionId || `direct:${randomUUID()}`;
  const run: CodexRun = { client: null, threadId: context.resolveProviderSessionId(options.sessionId), turnId: null, aborted: false, voice: command.trim() === '/voice', writer, pending: new Map() };
  runs.set(sessionId, run);
  const items = new Map<string, AnyRecord>();
  const itemTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const flushItem = (id: string) => {
    clearTimeout(itemTimers.get(id));
    itemTimers.delete(id);
    const item = items.get(id);
    if (item) emitItem(item, context, run);
  };
  const scheduleItem = (id: string) => {
    if (!itemTimers.has(id)) itemTimers.set(id, setTimeout(() => flushItem(id), 100));
  };
  // A completion can precede the turn/start response. Queue it rather than
  // losing it before the consumer begins waiting.
  const completed: AnyRecord[] = [];
  let wake: (() => void) | null = null;
  let connectionError: Error | null = null;
  const wakeWaiter = () => { wake?.(); wake = null; };
  const nextCompletion = async () => {
    while (!completed.length && !connectionError && !run.aborted) await new Promise<void>((resolve) => { wake = resolve; });
    if (connectionError && !run.aborted) throw connectionError;
    return completed.shift() ?? { status: 'interrupted' };
  };
  let proposedPlan: string | null = null;
  let goalActive = false;
  let watchingGoal = false;
  let rateMetadata: AnyRecord = {};
  let tokenBudget: AnyRecord | null = null;
  let exitCode = 0;
  try {
    run.client = await codexAppServer.connect({
      request: (method, params, respond, id) => receiveRequest(run, method, params, respond, id),
      closed: (error) => {
        connectionError = error;
        for (const [id, pending] of run.pending) if (id.startsWith('codex:plan:')) pending.respond({ allow: false });
        wakeWaiter();
      },
      notification: (method, params) => {
        if (run.aborted || (params.threadId && run.threadId && params.threadId !== run.threadId)) return;
        switch (method) {
          case 'serverRequest/resolved':
            for (const [id, pending] of run.pending) if (pending.message.context.nativeRequestId === params.requestId) {
              run.pending.delete(id);
              send(writer, createNormalizedMessage({ kind: 'permission_cancelled', provider: 'codex', sessionId: run.threadId, requestId: id }));
            }
            break;
          case 'thread/realtime/sdp':
            send(writer, createNormalizedMessage({ kind: 'status', provider: 'codex', sessionId: run.threadId, text: 'codex_voice_sdp', sdp: params.sdp }));
            break;
          case 'thread/realtime/transcript/done':
            send(writer, createNormalizedMessage({ kind: 'text', provider: 'codex', sessionId: run.threadId, role: params.role === 'user' ? 'user' : 'assistant', content: params.text }));
            break;
          case 'thread/realtime/closed': completed.push({ status: 'voiceClosed' }); wakeWaiter(); break;
          case 'thread/realtime/error': completed.push({ status: 'failed', error: { message: params.message } }); wakeWaiter(); break;
          case 'turn/started': run.turnId = params.turn.id; break;
          case 'turn/completed':
            run.turnId = null;
            for (const id of itemTimers.keys()) flushItem(id);
            completed.push(params.turn); wakeWaiter(); break;
          case 'item/started':
          case 'item/completed': {
            const item = params.item;
            if (!item?.id) break;
            items.set(item.id, item);
            flushItem(item.id);
            if (method === 'item/completed' && item.type === 'plan' && item.text) proposedPlan = item.text;
            if (method === 'item/completed' && item.type === 'agentMessage') proposedPlan = readCodexProposedPlan(item.text ?? '') ?? proposedPlan;
            if (method === 'item/completed') items.delete(item.id);
            break;
          }
          case 'item/agentMessage/delta':
          case 'item/plan/delta': {
            const item = items.get(params.itemId) ?? { id: params.itemId, type: method.includes('/plan/') ? 'plan' : 'agentMessage', text: '' };
            item.text = (item.text ?? '') + params.delta;
            items.set(item.id, item);
            scheduleItem(item.id);
            break;
          }
          case 'item/commandExecution/outputDelta': {
            const item = items.get(params.itemId);
            if (item) { item.aggregatedOutput = (item.aggregatedOutput ?? '') + params.delta; scheduleItem(item.id); }
            break;
          }
          case 'item/reasoning/summaryTextDelta':
          case 'item/reasoning/textDelta': {
            const item = items.get(params.itemId) ?? { id: params.itemId, type: 'reasoning', summary: [], content: [] };
            const parts = method.includes('/summaryTextDelta') ? item.summary : item.content;
            const index = params.summaryIndex ?? params.contentIndex ?? 0;
            parts[index] = (parts[index] ?? '') + params.delta;
            items.set(item.id, item);
            scheduleItem(item.id);
            break;
          }
          case 'turn/plan/updated':
            send(writer, createNormalizedMessage({ kind: 'tool_use', provider: 'codex', sessionId: run.threadId, id: `plan:${params.turnId}`, toolId: `plan:${params.turnId}`, toolName: 'TodoWrite', toolInput: { todos: (params.plan ?? []).map((step: AnyRecord) => ({ content: step.step, status: step.status === 'inProgress' ? 'in_progress' : step.status })) } }));
            break;
          case 'thread/tokenUsage/updated': {
            const usage = params.tokenUsage?.total;
            if (!usage) break;
            tokenBudget = {
              ...readCodexUsageMetadata({ input_tokens: usage.inputTokens, cached_input_tokens: usage.cachedInputTokens, output_tokens: usage.outputTokens }, null),
              ...rateMetadata,
              used: params.tokenUsage.last?.totalTokens ?? usage.totalTokens, total: params.tokenUsage.modelContextWindow ?? 0,
              inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
              breakdown: { input: usage.inputTokens, output: usage.outputTokens },
            };
            send(writer, createNormalizedMessage({ kind: 'status', provider: 'codex', sessionId: run.threadId, text: 'token_budget', tokenBudget }));
            break;
          }
          case 'account/rateLimits/updated': {
            const limits = params.rateLimitsByLimitId?.codex ?? params.rateLimits;
            const window = (value: AnyRecord | undefined) => value ? { used_percent: value.usedPercent, window_minutes: value.windowDurationMins, resets_at: value.resetsAt } : null;
            rateMetadata = readCodexUsageMetadata(null, { plan_type: limits?.planType, primary: window(limits?.primary), secondary: window(limits?.secondary) });
            if (tokenBudget) {
              tokenBudget = { ...tokenBudget, ...rateMetadata };
              send(writer, createNormalizedMessage({ kind: 'status', provider: 'codex', sessionId: run.threadId, text: 'token_budget', tokenBudget }));
            }
            break;
          }
          case 'thread/goal/updated':
            goalActive = params.goal?.status === 'active';
            send(writer, createNormalizedMessage({ kind: 'status', provider: 'codex', sessionId: run.threadId, text: 'codex_goal', goal: params.goal }));
            if (watchingGoal && !goalActive && !run.turnId) { completed.push({ status: 'goalStopped' }); wakeWaiter(); }
            break;
          case 'thread/goal/cleared':
            goalActive = false;
            send(writer, createNormalizedMessage({ kind: 'status', provider: 'codex', sessionId: run.threadId, text: 'codex_goal', goal: null }));
            if (watchingGoal && !run.turnId) { completed.push({ status: 'goalStopped' }); wakeWaiter(); }
            break;
          case 'error':
            if (!params.willRetry) send(writer, createNormalizedMessage({ kind: 'error', provider: 'codex', sessionId: run.threadId, content: params.error?.message ?? 'Codex request failed.' }));
            break;
        }
      },
    });
    if (run.aborted) return;
    const metadataCommand = command.trim().match(/^\/goal(?:\s+(status|pause|clear))?$/);
    if (metadataCommand && run.threadId) {
      // Reading or pausing a saved goal must not resume its thread: resuming an
      // active goal can start native work before a status-only request finishes.
      const operation = metadataCommand[1] ?? 'status';
      const result = await run.client.call(operation === 'clear' ? 'thread/goal/clear' : operation === 'pause' ? 'thread/goal/set' : 'thread/goal/get', { threadId: run.threadId, ...(operation === 'pause' ? { status: 'paused' } : {}) });
      send(writer, createNormalizedMessage({ kind: 'status', provider: 'codex', sessionId: run.threadId, text: 'codex_goal', goal: result.goal ?? null }));
      if (operation === 'status') send(writer, createNormalizedMessage({ kind: 'text', provider: 'codex', sessionId: run.threadId, role: 'assistant', content: result.goal ? `${result.goal.objective}\n\n${result.goal.status} · ${result.goal.tokensUsed} tokens · ${result.goal.timeUsedSeconds}s` : 'No goal set. Use /goal followed by an objective.' }));
      return;
    }
    const cwd = options.cwd || options.projectPath || process.cwd();
    const model = await context.resolveResumeModel(options.sessionId, options.model);
    const catalog = await context.getProviderModels();
    const allowedEfforts = catalog.OPTIONS.find((entry) => entry.value === model)?.effort?.values.map((entry) => entry.value) ?? [];
    const effort = allowedEfforts.includes(options.effort) ? options.effort : null;
    const response = await run.client.call(run.threadId ? 'thread/resume' : 'thread/start', {
      ...(run.threadId ? { threadId: run.threadId, excludeTurns: true } : {}), cwd, model,
      ...permissionOptions(options.permissionMode ?? 'default'),
    });
    const wasNew = !run.threadId;
    run.threadId = response.thread?.id;
    if (!run.threadId) throw new Error('Codex did not return a thread id.');
    writer.setSessionId?.(run.threadId);
    if (wasNew) send(writer, createNormalizedMessage({ kind: 'session_created', provider: 'codex', sessionId: run.threadId, newSessionId: run.threadId }));
    if (run.aborted) return;

    let mode = options.permissionMode === 'plan' ? 'plan' : 'default';
    let firstTurn = true;
    const startTurn = async (text: string) => {
      const input = await buildInput(run.client!, text, firstTurn ? options : {}, cwd);
      firstTurn = false;
      if (run.aborted) return;
      const result = await run.client!.call('turn/start', {
        threadId: run.threadId, input, model, effort,
        collaborationMode: { mode, settings: { model: model ?? response.model, reasoning_effort: effort, developer_instructions: null } },
      });
      if (!completed.some((event) => event.id === result.turn?.id)) run.turnId = result.turn?.id ?? run.turnId;
    };
    // Native maintenance operations share the same run reservation and replay
    // stream as ordinary prompts, so they cannot race a second turn.
    if (command.trim() === '/voice') {
      if (typeof options.realtimeSdp !== 'string' || options.realtimeSdp.length > 200_000) throw new Error('Start voice from the voice panel.');
      run.voice = true;
      await run.client.call('thread/realtime/start', { threadId: run.threadId, outputModality: 'audio', transport: { type: 'webrtc', sdp: options.realtimeSdp } });
      while (!run.aborted) {
        const event = await nextCompletion();
        if (event.status === 'failed') throw new Error(event.error?.message ?? 'Voice connection failed.');
        if (event.status === 'voiceClosed' || event.status === 'interrupted') break;
      }
      return;
    }
    const workflow = command.match(/^\/(image|research|browser)\s+([\s\S]+)$/);
    if (workflow) {
      const result = await run.client.call('skills/list', { cwds: [cwd] });
      const skills = (result.data ?? []).flatMap((group: AnyRecord) => group.skills ?? []).filter((skill: AnyRecord) => skill.enabled !== false);
      const aliases: Record<string, string[]> = { image: ['imagegen', 'image-gen'], research: ['deep-research'], browser: ['browser', 'browser-use', 'playwright'] };
      const skill = skills.find((candidate: AnyRecord) => aliases[workflow[1]].some((name) => candidate.name === name || candidate.name.endsWith(`:${name}`)));
      if (!skill) throw new Error(`No ${workflow[1]} skill is available. Install or enable a matching skill in Settings → Skills, then retry.`);
      command = `$${skill.name} ${workflow[2]}`;
    }
    const match = command.match(/^\/(goal|compact|review)\b\s*([\s\S]*)$/);
    if (match?.[1] === 'goal') {
      const budgetMatch = match[2].match(/^--budget\s+(\d+)\s+([\s\S]+)$/);
      const tokenBudget = budgetMatch ? Number(budgetMatch[1]) : undefined;
      if (tokenBudget !== undefined && (!Number.isSafeInteger(tokenBudget) || tokenBudget < 1)) throw new Error('Token budget must be a positive integer.');
      const objective = (budgetMatch ? budgetMatch[2] : match[2]).trim();
      if (!objective || objective === 'status') {
        const result = await run.client.call('thread/goal/get', { threadId: run.threadId });
        send(writer, createNormalizedMessage({ kind: 'text', provider: 'codex', sessionId: run.threadId, role: 'assistant', content: result.goal ? `${result.goal.objective}\n\n${result.goal.status} · ${result.goal.tokensUsed} tokens · ${result.goal.timeUsedSeconds}s` : 'No goal set. Use /goal followed by an objective.' }));
        return;
      }
      if (['pause', 'clear'].includes(objective)) {
        await run.client.call(objective === 'clear' ? 'thread/goal/clear' : 'thread/goal/set', { threadId: run.threadId, ...(objective === 'pause' ? { status: 'paused' } : {}) });
        return;
      }
      mode = 'default';
      await run.client.call('thread/settings/update', { threadId: run.threadId, model, effort, collaborationMode: { mode, settings: { model: model ?? response.model, reasoning_effort: effort, developer_instructions: null } } });
      send(writer, createNormalizedMessage({ kind: 'status', provider: 'codex', sessionId: run.threadId, text: 'permission_mode', permissionMode: options.permissionMode === 'plan' ? 'default' : options.permissionMode ?? 'default' }));
      const goalParams = { threadId: run.threadId, ...(tokenBudget === undefined ? {} : { tokenBudget }), ...(objective === 'resume' ? {} : { objective }) };
      if (options.files?.length || options.images?.length) {
        // Attachments require a user input turn. Register the goal paused first
        // so the native idle scheduler cannot race that initial input.
        await run.client.call('thread/goal/set', { ...goalParams, status: 'paused' });
        completed.splice(0, completed.length, ...completed.filter((event) => event.status !== 'goalStopped'));
        await startTurn(objective === 'resume' ? 'Continue working toward the current goal.' : objective);
      }
      watchingGoal = true;
      const result = await run.client.call('thread/goal/set', { ...goalParams, status: 'active' });
      goalActive = result.goal?.status === 'active';
      if (!goalActive) return;
    } else if (match?.[1] === 'compact') {
      await run.client.call('thread/compact/start', { threadId: run.threadId });
    } else if (match?.[1] === 'review') {
      const target = match[2].trim();
      const result = await run.client.call('review/start', { threadId: run.threadId, delivery: 'inline', target: target ? { type: 'custom', instructions: target } : { type: 'uncommittedChanges' } });
      run.turnId = result.turn?.id ?? run.turnId;
    } else {
      await startTurn(command);
    }
    while (!run.aborted) {
      const turn = await nextCompletion();
      if (turn.status === 'failed') throw new Error(turn.error?.message ?? 'Codex turn failed.');
      if (turn.status === 'interrupted' || (turn.status === 'goalStopped' && !goalActive)) break;
      if (turn.status === 'goalStopped') continue;
      if (mode === 'plan' && proposedPlan) {
        const requestId = `codex:plan:${randomUUID()}`;
        const message = { requestId, toolName: 'ExitPlanMode', input: { plan: proposedPlan }, context: { provider: 'codex' }, sessionId: run.threadId };
        // The native plan turn has finished. Keep this app run reserved until
        // the user explicitly starts implementation or returns to their draft.
        const decision = await new Promise<ProviderPermissionDecision>((resolve) => {
          run.pending.set(requestId, { message, respond: resolve });
          send(writer, createNormalizedMessage({ kind: 'permission_request', provider: 'codex', ...message }));
        });
        run.pending.delete(requestId);
        send(writer, createNormalizedMessage({ kind: 'permission_resolved', provider: 'codex', sessionId: run.threadId, requestId }));
        if (connectionError && !run.aborted) throw connectionError;
        if (run.aborted || !decision.allow) break;
        mode = 'default';
        send(writer, createNormalizedMessage({ kind: 'status', provider: 'codex', sessionId: run.threadId, text: 'permission_mode', permissionMode: 'default' }));
        proposedPlan = null;
        await startTurn('Implement the approved plan.');
        continue;
      }
      if (!goalActive) break;
      const result = await run.client.call('thread/goal/get', { threadId: run.threadId });
      goalActive = result.goal?.status === 'active';
      if (!goalActive || run.aborted) break;
      // Native goal runtime starts each continuation itself. Keep the process
      // and replay stream alive without submitting duplicate user turns.
    }
    if (!run.aborted) notifyRunStopped({ userId: writer.userId ?? null, provider: 'codex', sessionId: options.sessionId ?? run.threadId, sessionName: options.sessionSummary });
  } catch (error) {
    if (!run.aborted) {
      exitCode = 1;
      send(writer, createNormalizedMessage({ kind: 'error', provider: 'codex', sessionId: run.threadId, content: error instanceof Error ? error.message : String(error) }));
      notifyRunFailed({ userId: writer.userId ?? null, provider: 'codex', sessionId: options.sessionId ?? run.threadId, sessionName: options.sessionSummary, error });
    }
  } finally {
    for (const timer of itemTimers.values()) clearTimeout(timer);
    itemTimers.clear();
    for (const requestId of run.pending.keys()) send(writer, createNormalizedMessage({ kind: 'permission_cancelled', provider: 'codex', sessionId: run.threadId, requestId }));
    run.pending.clear();
    run.client?.close();
    if (runs.get(sessionId) === run) runs.delete(sessionId);
    // Registry ignores a duplicate completion after an error or explicit abort.
    if (!run.aborted) send(writer, createCompleteMessage({ provider: 'codex', sessionId: run.threadId, exitCode }));
  }
}

/** Used by the provider registry to run interactive Codex sessions and handle their decisions. */
export const codexRuntime = {
  run: queryCodex,
  async abort(sessionId: string) {
    const run = runs.get(sessionId);
    if (!run) return false;
    run.aborted = true;
    for (const pending of run.pending.values()) pending.respond({ allow: false });
    try {
      if (run.threadId && run.client) {
        if (run.voice) await run.client.call('thread/realtime/stop', { threadId: run.threadId }).catch(() => {});
        // Explicit stop also pauses a goal so it cannot silently restart later.
        await run.client.call('thread/goal/set', { threadId: run.threadId, status: 'paused' }).catch(() => {});
        if (run.turnId) await run.client.call('turn/interrupt', { threadId: run.threadId, turnId: run.turnId }).catch(() => {});
      }
    } finally { run.client?.close(); }
    return true;
  },
  async control(sessionId: string, action: string, input: AnyRecord) {
    const run = runs.get(sessionId);
    if (action === 'voice' && input.operation === 'stop') {
      // A late voice cancellation must never interrupt a newer ordinary turn.
      return { stopped: run?.voice ? await codexRuntime.abort(sessionId) : false };
    }
    if (!run?.client || !run.threadId) {
      if (action !== 'goal') throw new Error('Codex is not ready. Try again when the turn starts.');
      if (!input.providerSessionId) {
        if (input.operation === 'status') return { goal: null };
        throw new Error('Start a conversation before updating its goal.');
      }
      const client = await codexAppServer.connect();
      try {
        if (input.operation === 'status') return await client.call('thread/goal/get', { threadId: input.providerSessionId });
        if (input.operation === 'clear') return await client.call('thread/goal/clear', { threadId: input.providerSessionId });
        if (input.operation === 'pause') return await client.call('thread/goal/set', { threadId: input.providerSessionId, status: 'paused' });
        throw new Error('Use /goal resume or /goal followed by an objective to start work.');
      } finally { client.close(); }
    }
    if (action === 'agent') {
      const children = await run.client.call('thread/list', { parentThreadId: run.threadId, limit: 100 });
      if (input.operation !== 'interrupt' || !children.data?.some((thread: AnyRecord) => thread.id === input.threadId)) throw new Error('This agent does not belong to the current conversation.');
      const result = await run.client.call('thread/read', { threadId: input.threadId, includeTurns: true });
      const turn = result.thread?.turns?.find((entry: AnyRecord) => entry.status === 'inProgress');
      if (!turn) throw new Error('This agent has no active turn.');
      await run.client.call('turn/interrupt', { threadId: input.threadId, turnId: turn.id });
      return { stopped: true };
    }
    if (action === 'steer') {
      if (!run.turnId) throw new Error('There is no active turn to steer.');
      if (typeof input.content !== 'string' || !input.content.trim()) throw new Error('A message is required.');
      const result = await run.client.call('turn/steer', { threadId: run.threadId, expectedTurnId: run.turnId, input: [{ type: 'text', text: input.content, text_elements: [] }] });
      send(run.writer, createNormalizedMessage({ kind: 'text', provider: 'codex', sessionId: run.threadId, role: 'user', content: input.content }));
      return result;
    }
    if (action === 'goal') {
      if (input.operation === 'status') return run.client.call('thread/goal/get', { threadId: run.threadId });
      if (input.operation === 'clear') return run.client.call('thread/goal/clear', { threadId: run.threadId });
      if (!['pause', 'resume', 'set'].includes(input.operation)) throw new Error('Unknown goal operation.');
      return run.client.call('thread/goal/set', { threadId: run.threadId, status: input.operation === 'pause' ? 'paused' : 'active', ...(input.operation === 'set' ? { objective: input.objective } : {}) });
    }
    throw new Error('Unsupported Codex control.');
  },
  async listAgents(sessionId: string, threadId: string) {
    const active = runs.get(sessionId)?.client;
    const client = active ?? await codexAppServer.connect();
    try { return await client.call('thread/list', { parentThreadId: threadId, limit: 100 }); }
    finally { if (!active) client.close(); }
  },
  permissions: {
    resolve(requestId: string, decision: ProviderPermissionDecision) {
      for (const run of runs.values()) {
        const pending = run.pending.get(requestId);
        if (pending) { pending.respond(decision); return; }
      }
    },
    listPending(sessionId: string): AnyRecord[] {
      return Array.from(runs.get(sessionId)?.pending.values() ?? [], (request) => ({ ...request.message, sessionId }));
    },
  },
};
