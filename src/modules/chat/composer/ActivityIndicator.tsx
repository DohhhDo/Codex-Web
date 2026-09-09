import { SquareIcon } from '@phosphor-icons/react/dist/csr/Square';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Shimmer } from '@/shared/ui';
import type { SessionActivity } from '@/shared/types';

type ActivityIndicatorProps = {
  activity: SessionActivity | null;
  onAbort?: () => void;
};

const ACTION_KEYS = [
  'claudeStatus.actions.thinking',
  'claudeStatus.actions.processing',
  'claudeStatus.actions.analyzing',
  'claudeStatus.actions.working',
  'claudeStatus.actions.computing',
  'claudeStatus.actions.reasoning',
];
const DEFAULT_ACTION_WORDS = ['Thinking', 'Processing', 'Analyzing', 'Working', 'Computing', 'Reasoning'];
const EXIT_ANIMATION_MS = 220;

/**
 * Minimal response-in-progress indicator, in the spirit of the inline status
 * lines in Claude Code / Codex / OpenCode: a shimmering activity label, the
 * elapsed time, and an interrupt affordance. Rendered only while the viewed
 * session has an entry in the processing map; it disappears the instant that
 * entry is removed.
 *
 * Rendered by chat's ChatComposer above the input so the user can see and
 * interrupt the in-flight turn without leaving the composer.
 */
export default function ActivityIndicator({ activity, onAbort }: ActivityIndicatorProps) {
  const { t } = useTranslation('chat');
  // Retain the last activity only while its exit animation finishes.
  const [renderedActivity, setRenderedActivity] = useState<SessionActivity | null>(activity);
  // Select the exit transition before releasing the retained activity.
  const [isExiting, setIsExiting] = useState(false);
  const startedAt = renderedActivity?.startedAt ?? null;
  // Refresh the elapsed label while a response is running.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (activity) {
      setRenderedActivity(activity);
      setIsExiting(false);
      return;
    }

    if (!renderedActivity) return;

    setIsExiting(true);
    const timer = setTimeout(() => {
      setRenderedActivity(null);
      setIsExiting(false);
    }, EXIT_ANIMATION_MS);

    return () => clearTimeout(timer);
  }, [activity, renderedActivity]);

  useEffect(() => {
    if (startedAt === null) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (!renderedActivity) return null;

  const actionWords = ACTION_KEYS.map((key, i) => t(key, { defaultValue: DEFAULT_ACTION_WORDS[i] }));
  const label = (renderedActivity.statusText || actionWords[Math.floor(elapsedSeconds / 4) % actionWords.length])
    .replace(/\.+$/, '');

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsedLabel = minutes < 1
    ? t('claudeStatus.elapsed.seconds', { count: seconds, defaultValue: '{{count}}s' })
    : t('claudeStatus.elapsed.minutesSeconds', { minutes, seconds, defaultValue: '{{minutes}}m {{seconds}}s' });


  return (
    <div
      className={`px-2 text-xs text-muted-foreground ${
        isExiting ? 'chat-activity-exit' : 'chat-activity-enter'
      }`}
    >
      <div className="flex min-h-8 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />
          <Shimmer className="min-w-0 truncate font-medium">{`${label}…`}</Shimmer>
          <span className="shrink-0 tabular-nums text-muted-foreground">{elapsedLabel}</span>
        </div>

        {renderedActivity.canInterrupt && onAbort && (
          <button
            type="button"
            onClick={onAbort}
            className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('claudeStatus.stop', { defaultValue: 'Stop' })}
          >
            <SquareIcon className="h-2.5 w-2.5" weight="fill" aria-hidden />
            <span>{t('claudeStatus.stop', { defaultValue: 'Stop' })}</span>
            <kbd className="hidden rounded border border-border/60 px-1 text-[10px] text-muted-foreground/70 sm:inline-block">
              esc
            </kbd>
          </button>
        )}
      </div>
    </div>
  );
}
