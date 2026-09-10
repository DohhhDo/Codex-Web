import { useCallback, useEffect, useRef } from 'react';

import type { ServerEvent } from '@/shared/types';

type Pending = { resolve: (result: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

/** Used by the composer to retain steering drafts until the server acknowledges the exact request. */
export function useChatControls(send: (message: unknown) => void, subscribe?: (listener: (event: ServerEvent) => void) => () => void) {
  const pending = useRef(new Map<string, Pending>());
  useEffect(() => {
    const requests = pending.current;
    const unsubscribe = subscribe?.((event) => {
      if (event.kind !== 'control_result' || typeof event.requestId !== 'string') return;
      const request = requests.get(event.requestId);
      if (!request) return;
      requests.delete(event.requestId); clearTimeout(request.timer);
      if (event.error) request.reject(new Error(String(event.error)));
      else request.resolve(event.result);
    });
    return () => {
      unsubscribe?.();
      for (const request of requests.values()) { clearTimeout(request.timer); request.reject(new Error('The conversation was closed.')); }
      requests.clear();
    };
  }, [subscribe]);
  return useCallback((sessionId: string, action: string, input: Record<string, unknown>) => new Promise<unknown>((resolve, reject) => {
    if (!subscribe) { reject(new Error('Live controls are unavailable.')); return; }
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => { pending.current.delete(requestId); reject(new Error('No confirmation received. Check the conversation before retrying.')); }, 15_000);
    pending.current.set(requestId, { resolve, reject, timer });
    try { send({ type: 'chat.control', requestId, sessionId, action, input }); }
    catch (error) { clearTimeout(timer); pending.current.delete(requestId); reject(error); }
  }), [send, subscribe]);
}
