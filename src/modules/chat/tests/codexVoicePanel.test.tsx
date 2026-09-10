import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { CodexVoicePanel } from '@/modules/chat/modals/CodexVoicePanel';

const socket = vi.hoisted(() => ({ subscribe: vi.fn(() => () => {}), sendMessage: vi.fn(), isConnected: true }));
vi.mock('@/shared/context/WebSocketContext', () => ({ useWebSocket: () => socket }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

test('late microphone permission after closing releases every track and never starts a turn', async () => {
  let grant: (stream: MediaStream) => void = () => {};
  const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => { grant = resolve; }));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  const stop = vi.fn();
  const onStart = vi.fn();
  const onClose = vi.fn();
  const { rerender } = render(<CodexVoicePanel open sessionId="session" onStart={onStart} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'codex.startVoice' }));
  expect(getUserMedia).toHaveBeenCalledOnce();
  rerender(<CodexVoicePanel open={false} sessionId="session" onStart={onStart} onClose={onClose} />);
  await act(async () => { grant({ getTracks: () => [{ stop }] } as unknown as MediaStream); });
  expect(stop).toHaveBeenCalledOnce();
  expect(onStart).not.toHaveBeenCalled();
  expect(socket.sendMessage).not.toHaveBeenCalled();
});
