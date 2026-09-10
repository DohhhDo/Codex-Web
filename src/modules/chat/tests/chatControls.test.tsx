import { act, renderHook } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { useChatControls } from '@/modules/chat/hooks/useChatControls';
import type { ServerEvent } from '@/shared/types';

test('live controls wait for their own acknowledgement and surface rejection', async () => {
  let receive: (event: ServerEvent) => void = () => {};
  const send = vi.fn();
  const subscribe = (listener: typeof receive) => { receive = listener; return () => {}; };
  const { result } = renderHook(() => useChatControls(send, subscribe));
  const request = result.current('session', 'steer', { content: 'Keep this draft' });
  const outcome = expect(request).rejects.toThrow('Turn already finished');
  const id = send.mock.calls[0][0].requestId;
  act(() => receive({ kind: 'control_result', requestId: 'unrelated', result: {} } as ServerEvent));
  act(() => receive({ kind: 'control_result', requestId: id, error: 'Turn already finished' } as ServerEvent));
  await outcome;
  const next = result.current('session', 'steer', { content: 'Try again' });
  act(() => receive({ kind: 'control_result', requestId: send.mock.calls[1][0].requestId, result: { turnId: 'turn' } } as ServerEvent));
  await expect(next).resolves.toEqual({ turnId: 'turn' });
});

test('closing the composer settles pending controls', async () => {
  const { result, unmount } = renderHook(() => useChatControls(vi.fn(), () => () => {}));
  const pending = result.current('session', 'steer', { content: 'Draft' });
  const outcome = expect(pending).rejects.toThrow('closed');
  unmount();
  await outcome;
});
