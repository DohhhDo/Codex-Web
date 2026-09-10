import { CloudArrowUpIcon } from '@phosphor-icons/react/dist/csr/CloudArrowUp';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
  TouchEvent,
} from 'react';
import { SpinnerGapIcon as Loader2 } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { PencilSimpleIcon as PencilIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';

import { useVoiceInput } from '@/modules/chat/hooks/useVoiceInput';
import { useVoiceAvailable } from '@/modules/chat/hooks/useVoiceAvailable';
import type { QueuedDraft, ScheduledMessage, SlashCommand,SessionActivity,PendingPermissionRequest,PermissionMode,ProviderModelOption } from '@/shared/types';
import {
  PromptInput,
  PromptInputHeader,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from '@/modules/chat/composer/PromptInput';
import CommandMenu from '@/modules/chat/composer/CommandMenu';
import ActivityIndicator from '@/modules/chat/composer/ActivityIndicator';
import ComposerAttachment from '@/modules/chat/composer/ComposerAttachment';
import VoiceInputButton from '@/modules/chat/composer/VoiceInputButton';
import PermissionRequestsBanner from '@/modules/chat/composer/PermissionRequestsBanner';
import QueuedMessageCard from '@/modules/chat/composer/QueuedMessageCard';
import { ScheduledMessageList } from '@/modules/chat/composer/ScheduledMessageList';
import TokenUsageSummary from '@/modules/chat/composer/TokenUsageSummary';
import ComposerActionsMenu from '@/modules/chat/composer/ComposerActionsMenu';
import ComposerModelMenu from '@/modules/chat/composer/ComposerModelMenu';
import ComposerPermissionMenu from '@/modules/chat/composer/ComposerPermissionMenu';

type MentionableFile = {
  name: string;
  path: string;
};

type ChatComposerProps = {
  pendingPermissionRequests: PendingPermissionRequest[];
  handlePermissionDecision: (
    requestIds: string | string[],
    decision: { allow?: boolean; message?: string; rememberEntry?: string | null; updatedInput?: unknown },
  ) => void;
  handleGrantToolPermission: (suggestion: { entry: string; toolName: string }) => { success: boolean };
  activity: SessionActivity | null;
  isLoading: boolean;
  onAbortSession: () => void;
  permissionMode: PermissionMode;
  availablePermissionModes: PermissionMode[];
  onSelectPermissionMode: (mode: PermissionMode) => void;
  providerLabel: string;
  effort: string;
  availableEffortOptions: NonNullable<ProviderModelOption['effort']>['values'];
  onSelectEffort: (effort: string) => void;
  model: string;
  availableModelOptions: ProviderModelOption[];
  onSelectModel: (model: string) => void;
  modelsLoading: boolean;
  tokenBudget: Record<string, unknown> | null;
  onShowTokenUsage: () => void;
  slashCommandsCount: number;
  onToggleCommandMenu: () => void;
  hasInput: boolean;
  onClearInput: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => void;
  isDragActive: boolean;
  queuedDraft: QueuedDraft | null;
  /** Set while the composer is replacing an already-sent message. */
  isEditingSentMessage: boolean;
  onCancelEditMessage: () => void;
  /** Messages waiting to be sent to this session later. */
  scheduledMessages: ScheduledMessage[];
  onScheduleMessage: (scheduledFor: Date) => void;
  onCancelScheduledMessage: (id: string) => void;
  onEditQueuedDraft: () => void;
  onDeleteQueuedDraft: () => void;
  attachedFiles: File[];
  onRemoveAttachment: (index: number) => void;
  fileErrors: Map<string, string>;
  showFileDropdown: boolean;
  filteredFiles: MentionableFile[];
  selectedFileIndex: number;
  onSelectFile: (file: MentionableFile) => void;
  filteredCommands: SlashCommand[];
  selectedCommandIndex: number;
  onCommandSelect: (command: SlashCommand, index: number, isHover: boolean) => void;
  onCloseCommandMenu: () => void;
  isCommandMenuOpen: boolean;
  getRootProps: (...args: unknown[]) => Record<string, unknown>;
  getInputProps: (...args: unknown[]) => Record<string, unknown>;
  openAttachmentPicker: () => void;
  inputHighlightRef: RefObject<HTMLDivElement>;
  renderInputWithMentions: (text: string) => ReactNode;
  textareaRef: RefObject<HTMLTextAreaElement>;
  input: string;
  onVoiceTranscript?: (text: string, send?: boolean) => void;
  onInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTextareaClick: (event: MouseEvent<HTMLTextAreaElement>) => void;
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onTextareaPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onTextareaScrollSync: (target: HTMLTextAreaElement) => void;
  onTextareaInput: (event: FormEvent<HTMLTextAreaElement>) => void;
  isInputFocused?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
  placeholder: string;
  isTextareaExpanded: boolean;
  sendByCtrlEnter?: boolean;
};

/**
 * Rendered by chat's ChatInterface as the whole input area: textarea, pending
 * attachments, queued message, permission banner, voice input and the
 * model/permission popovers that drive the next turn.
 */
export default function ChatComposer({
  pendingPermissionRequests,
  handlePermissionDecision,
  handleGrantToolPermission,
  activity,
  isLoading,
  onAbortSession,
  permissionMode,
  availablePermissionModes,
  onSelectPermissionMode,
  providerLabel,
  effort,
  availableEffortOptions,
  onSelectEffort,
  model,
  availableModelOptions,
  onSelectModel,
  modelsLoading,
  tokenBudget,
  onShowTokenUsage,
  slashCommandsCount,
  onToggleCommandMenu,
  hasInput,
  onClearInput,
  onSubmit,
  isDragActive,
  queuedDraft,
  isEditingSentMessage,
  onCancelEditMessage,
  scheduledMessages,
  onScheduleMessage,
  onCancelScheduledMessage,
  onEditQueuedDraft,
  onDeleteQueuedDraft,
  attachedFiles,
  onRemoveAttachment,
  fileErrors,
  showFileDropdown,
  filteredFiles,
  selectedFileIndex,
  onSelectFile,
  filteredCommands,
  selectedCommandIndex,
  onCommandSelect,
  onCloseCommandMenu,
  isCommandMenuOpen,
  getRootProps,
  getInputProps,
  openAttachmentPicker,
  inputHighlightRef,
  renderInputWithMentions,
  textareaRef,
  input,
  onVoiceTranscript,
  onInputChange,
  onTextareaClick,
  onTextareaKeyDown,
  onTextareaPaste,
  onTextareaScrollSync,
  onTextareaInput,
  onInputFocusChange,
  placeholder,
  sendByCtrlEnter,
}: ChatComposerProps) {
  const { t } = useTranslation('chat');
  const inputHelpId = useId();
  const commandMenuId = useId();
  const fileDropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedFileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dropdown = fileDropdownRef.current;
    const selectedFile = selectedFileRef.current;
    if (!showFileDropdown || !dropdown || !selectedFile) {
      return;
    }

    const itemTop = selectedFile.offsetTop;
    const itemBottom = itemTop + selectedFile.offsetHeight;
    const visibleTop = dropdown.scrollTop;
    const visibleBottom = visibleTop + dropdown.clientHeight;

    if (itemTop < visibleTop) {
      dropdown.scrollTop = itemTop;
    } else if (itemBottom > visibleBottom) {
      dropdown.scrollTop = itemBottom - dropdown.clientHeight;
    }
  }, [selectedFileIndex, showFileDropdown]);

  // Voice state is hosted here (not in the mic button) so the main Send button can stop
  // recording and send the transcript in one tap, the way the mic button drops it in the box.
  const voiceAvailable = useVoiceAvailable();
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voiceErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleVoiceError = useCallback((msg: string) => {
    setVoiceError(msg);
    if (voiceErrorTimer.current) clearTimeout(voiceErrorTimer.current);
    voiceErrorTimer.current = setTimeout(() => setVoiceError(null), 4000);
  }, []);
  useEffect(() => () => {
    if (voiceErrorTimer.current) clearTimeout(voiceErrorTimer.current);
  }, []);
  const noopTranscript = useCallback(() => {}, []);
  const { state: voiceState, toggle: voiceToggle, stop: voiceStop } = useVoiceInput(
    onVoiceTranscript ?? noopTranscript,
    handleVoiceError,
  );
  const isRecording = voiceState === 'recording';
  const isTranscribing = voiceState === 'transcribing';

  // Detect if the AskUserQuestion interactive panel is active
  const hasQuestionPanel = pendingPermissionRequests.some(
    (r) => r.toolName === 'AskUserQuestion'
  );

  // Hide the thinking/status bar while any permission request is pending
  const hasPendingPermissions = pendingPermissionRequests.length > 0;

  const hasQueuedDraft = Boolean(queuedDraft);
  const canQueueDraft = isLoading && Boolean(input.trim() || attachedFiles.length > 0);
  const submitHint = canQueueDraft
    ? hasQueuedDraft
      ? t('input.hintText.updateQueued', { defaultValue: 'Enter to update queued message' })
      : t('input.hintText.queue', { defaultValue: 'Enter to queue your next message' })
    : sendByCtrlEnter
      ? t('input.hintText.ctrlEnter')
      : t('input.hintText.enter');
  const submitAriaLabel = canQueueDraft
    ? hasQueuedDraft
      ? t('input.queue.update', { defaultValue: 'Update queued message' })
      : t('input.queue.sendNext', { defaultValue: 'Queue next message' })
    : isLoading
      ? t('input.stop')
      : t('input.send');

  return (
    <div className="chat-composer-shell relative flex-shrink-0 px-2 pb-2 pt-0 sm:px-4 sm:pb-4 md:px-4 md:pb-6">
      <div className="codex-composer-column">
        {!hasPendingPermissions && <ActivityIndicator activity={activity} onAbort={onAbortSession} />}
        <div className="codex-composer-context">

          {pendingPermissionRequests.length > 0 && (
            <div className="min-w-0">
              <PermissionRequestsBanner
                pendingPermissionRequests={pendingPermissionRequests}
                handlePermissionDecision={handlePermissionDecision}
                handleGrantToolPermission={handleGrantToolPermission}
              />
            </div>
          )}

          <ScheduledMessageList
            scheduledMessages={scheduledMessages}
            onCancel={onCancelScheduledMessage}
          />

          {isEditingSentMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
              <PencilIcon className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="min-w-0 flex-1">
                {t('composer.editing.title')}
                {' — '}
                <span className="text-muted-foreground">{t('composer.editing.filesNotReverted')}</span>
              </span>
              <button
                type="button"
                onClick={onCancelEditMessage}
                className="shrink-0 rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t('composer.editing.cancel')}
              </button>
            </div>
          )}

          {queuedDraft && (
            <QueuedMessageCard
              content={queuedDraft.content}
              attachmentCount={
                queuedDraft.uploadedAttachments?.length ?? queuedDraft.attachments.length
              }
              onEdit={onEditQueuedDraft}
              onDelete={onDeleteQueuedDraft}
            />
          )}

        </div>
        {!hasQuestionPanel && <div className="relative min-w-0">
          {showFileDropdown && filteredFiles.length > 0 && (
            <div
              ref={fileDropdownRef}
              className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-48 overflow-y-auto rounded-xl border border-border/50 bg-card/95 shadow-lg backdrop-blur-md"
            >
              {filteredFiles.map((file, index) => (
                <div
                  key={file.path}
                  ref={index === selectedFileIndex ? selectedFileRef : undefined}
                  className={`cursor-pointer touch-manipulation border-b border-border/30 px-4 py-3 last:border-b-0 ${
                    index === selectedFileIndex
                      ? 'bg-primary/8 text-primary'
                      : 'text-foreground hover:bg-accent/50'
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectFile(file);
                  }}
                >
                  <div className="text-sm font-medium">{file.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{file.path}</div>
                </div>
              ))}
            </div>
          )}

          <CommandMenu
            id={commandMenuId}
            anchorRef={textareaRef}
            commands={filteredCommands}
            selectedIndex={selectedCommandIndex}
            onSelect={onCommandSelect}
            onClose={onCloseCommandMenu}
            isOpen={isCommandMenuOpen}
          />

          <PromptInput
            onSubmit={onSubmit as (event: FormEvent<HTMLFormElement>) => void}
            status={isLoading ? 'streaming' : 'ready'}
            {...getRootProps()}
          >
            {isDragActive && (
              <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-primary/15">
                <div className="rounded-xl border border-border/30 bg-card p-4 shadow-lg">
                  <CloudArrowUpIcon className="mx-auto mb-2 h-8 w-8 text-primary" aria-hidden />
                  <p className="text-sm font-medium">Drop files here</p>
                </div>
              </div>
            )}

            {attachedFiles.length > 0 && (
              <PromptInputHeader>
                <div className="rounded-xl bg-muted/40 p-2">
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <ComposerAttachment
                        key={`${file.name}-${file.lastModified}-${index}`}
                        file={file}
                        onRemove={() => onRemoveAttachment(index)}
                        error={fileErrors.get(file.name)}
                      />
                    ))}
                  </div>
                </div>
              </PromptInputHeader>
            )}

            <input {...getInputProps()} />

            <PromptInputBody>
              <div ref={inputHighlightRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                <div className="codex-input-text chat-input-placeholder block w-full whitespace-pre-wrap break-words px-5 py-4 text-[15px] leading-7 text-transparent">
                  {renderInputWithMentions(input)}
                </div>
              </div>

              <PromptInputTextarea
                ref={textareaRef}
                dir="auto"
                value={input}
                onChange={onInputChange}
                onClick={onTextareaClick}
                onKeyDown={onTextareaKeyDown}
                onPaste={onTextareaPaste}
                onScroll={(event) => onTextareaScrollSync(event.target as HTMLTextAreaElement)}
                onFocus={() => onInputFocusChange?.(true)}
                onBlur={() => onInputFocusChange?.(false)}
                onInput={onTextareaInput}
                placeholder={placeholder}
                aria-label={t('composer.message', { defaultValue: 'Message' })}
                aria-describedby={inputHelpId}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isCommandMenuOpen}
                aria-controls={isCommandMenuOpen ? commandMenuId : undefined}
                aria-activedescendant={isCommandMenuOpen && filteredCommands[selectedCommandIndex] ? `${commandMenuId}-${selectedCommandIndex}` : undefined}
              />
          </PromptInputBody>

          <PromptInputFooter>
            <PromptInputTools>
              <ComposerActionsMenu
                hasDraft={hasInput}
                canSchedule={Boolean(input.trim()) && !isEditingSentMessage}
                commandCount={slashCommandsCount}
                tokenBudget={tokenBudget}
                onAttach={openAttachmentPicker}
                onCommands={onToggleCommandMenu}
                onSchedule={onScheduleMessage}
                onTokenUsage={onShowTokenUsage}
                onClear={onClearInput}
                onVoiceInput={onVoiceTranscript && voiceAvailable && voiceState === 'idle' ? voiceToggle : undefined}
              />
              {onVoiceTranscript && voiceAvailable && (voiceState !== 'idle' || voiceError) && (
                <VoiceInputButton state={voiceState} onToggle={voiceToggle} errorMsg={voiceError} />
              )}
            </PromptInputTools>

            <div className="ml-auto flex min-w-0 items-center gap-3">
              <ComposerModelMenu
                effort={effort}
                effortOptions={availableEffortOptions}
                onSelectEffort={onSelectEffort}
                model={model}
                modelOptions={availableModelOptions}
                onSelectModel={onSelectModel}
                modelsLoading={modelsLoading}
              />

              <PromptInputSubmit
                onClick={
                  canQueueDraft
                    ? (e: MouseEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        onSubmit(e);
                      }
                    : isLoading
                      ? onAbortSession
                      : isRecording
                        ? (e: MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            voiceStop({ send: true });
                          }
                        : undefined
                }
                disabled={
                  isLoading
                    ? false
                    : isRecording
                      ? false
                      : isTranscribing
                        ? true
                        : !input.trim() && attachedFiles.length === 0
                }
                aria-label={submitAriaLabel}
                title={submitAriaLabel}
                className="codex-composer-send h-9 w-9"
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : canQueueDraft ? (
                  <ArrowUpIcon className="h-4 w-4" />
                ) : undefined}
              </PromptInputSubmit>
            </div>

          </PromptInputFooter>
        </PromptInput>
        <div className="codex-composer-meta">
          <ComposerPermissionMenu
            permissionMode={permissionMode}
            permissionModes={availablePermissionModes}
            onSelectPermissionMode={onSelectPermissionMode}
            providerLabel={providerLabel}
          />
          <TokenUsageSummary usage={tokenBudget} onClick={onShowTokenUsage} providerLabel={providerLabel} compact />

        </div>
        <p id={inputHelpId} className="sr-only">{submitHint}</p>
        </div>}
      </div>
    </div>
  );
}
