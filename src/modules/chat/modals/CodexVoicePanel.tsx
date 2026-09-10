import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWebSocket } from '@/shared/context/WebSocketContext';
import { Button, Dialog, DialogContent, DialogTitle } from '@/shared/ui';

/** Used by ChatInterface to negotiate native realtime audio without proxying microphone data through chat messages. */
export function CodexVoicePanel({ open, sessionId, isBusy = false, onStart, onClose }: { open: boolean; sessionId: string | null; isBusy?: boolean; onStart: (sdp: string) => void; onClose: () => void }) {
  const { t } = useTranslation('chat');
  const { subscribe, sendMessage, isConnected } = useWebSocket();
  // The peer and microphone live only for the explicitly started voice session.
  const peer = useRef<RTCPeerConnection | null>(null);
  const media = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const startedSession = useRef<string | null>(null);
  const generation = useRef(0);
  // Connection state and errors are shown while the browser negotiates audio.
  const [state, setState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [error, setError] = useState<string | null>(null);
  const release = useCallback(() => {
    generation.current += 1;
    peer.current?.close(); peer.current = null;
    media.current?.getTracks().forEach((track) => track.stop()); media.current = null;
    if (audio.current) audio.current.srcObject = null;
    setState('idle');
  }, []);
  const stop = useCallback(() => {
    const target = startedSession.current;
    startedSession.current = null;
    release();
    if (target) sendMessage({ type: 'chat.control', sessionId: target, action: 'voice', input: { operation: 'stop' } });
  }, [release, sendMessage]);
  useEffect(() => {
    if (!open || !isConnected) { stop(); return; }
    const unsubscribe = subscribe((event) => {
      if (event.sessionId !== sessionId || !startedSession.current) return;
      if (event.kind === 'status' && event.text === 'codex_voice_sdp' && typeof event.sdp === 'string') {
        void peer.current?.setRemoteDescription({ type: 'answer', sdp: event.sdp }).catch((failure) => { setError(String(failure.message)); stop(); });
      }
      if (event.kind === 'error' || event.kind === 'protocol_error') { setError(String(event.content ?? event.error)); stop(); }
      if (event.kind === 'complete') { startedSession.current = null; release(); }
    });
    return () => { unsubscribe(); stop(); };
  }, [open, sessionId, isConnected, subscribe, stop, release]);
  const start = async () => {
    if (!sessionId || !open || !isConnected || isBusy || state !== 'idle') return;
    const attempt = ++generation.current;
    setState('connecting'); setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (attempt !== generation.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      media.current = stream;
      const connection = new RTCPeerConnection();
      peer.current = connection;
      connection.ontrack = (event) => { if (audio.current) { audio.current.srcObject = event.streams[0] ?? new MediaStream([event.track]); void audio.current.play().catch(() => setError(t('codex.audioPlayback'))); } };
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') setState('connected');
        if (connection.connectionState === 'failed') { setError(t('codex.voiceFailed')); stop(); }
      };
      for (const track of stream.getTracks()) connection.addTrack(track, stream);
      connection.createDataChannel('oai-events');
      const offer = await connection.createOffer();
      if (attempt !== generation.current) return;
      await connection.setLocalDescription(offer);
      if (attempt !== generation.current) return;
      if (!offer.sdp) throw new Error(t('codex.voiceFailed'));
      startedSession.current = sessionId;
      onStart(offer.sdp);
    } catch (failure) { if (attempt === generation.current) { setError(failure instanceof Error ? failure.message : String(failure)); stop(); } }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!value) { stop(); onClose(); } }}><DialogContent className="max-w-md rounded-xl border border-border bg-background p-5">
    <div className="mb-4 flex justify-between"><DialogTitle>{t('codex.voice')}</DialogTitle><Button size="sm" variant="ghost" onClick={() => { stop(); onClose(); }}>{t('codex.close')}</Button></div>
    <p className="mb-4 text-sm text-muted-foreground">{sessionId ? t(`codex.voiceState.${state}`) : t('codex.sessionRequired')}</p>
    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
    <audio ref={audio} autoPlay controls className="mb-3 w-full" />
    {state === 'idle' && isBusy && <p className="mb-3 text-sm text-muted-foreground">{t('codex.voiceBusy')}</p>}
    {state === 'idle' ? <Button disabled={!sessionId || !isConnected || isBusy} onClick={() => void start()}>{t('codex.startVoice')}</Button> : <Button variant="outline" onClick={stop}>{t('codex.stopVoice')}</Button>}
  </DialogContent></Dialog>;
}
