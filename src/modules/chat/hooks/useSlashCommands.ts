import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/shared/api';
import { safeLocalStorage } from '@/modules/chat/utils/chatStorage';
import type { LLMProvider, Project, SlashCommand } from '@/shared/types';


type UseSlashCommandsOptions = {
  selectedProject: Project | null;
  provider: LLMProvider;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onExecuteCommand: (command: SlashCommand, rawInput?: string) => void | Promise<void>;
};

type ProviderSkill = {
  name: string;
  description?: string;
  command: string;
  scope: string;
  sourcePath?: string;
  pluginName?: string;
  pluginId?: string;
};

type ProviderSkillsResponse = {
  success?: boolean;
  data?: {
    skills?: ProviderSkill[];
  };
};

const getCommandHistoryKey = (projectName: string) => `command_history_${projectName}`;

const readCommandHistory = (projectName: string): Record<string, number> => {
  const history = safeLocalStorage.getItem(getCommandHistoryKey(projectName));
  if (!history) {
    return {};
  }

  try {
    return JSON.parse(history);
  } catch (error) {
    console.error('Error parsing command history:', error);
    return {};
  }
};

const saveCommandHistory = (projectName: string, history: Record<string, number>) => {
  safeLocalStorage.setItem(getCommandHistoryKey(projectName), JSON.stringify(history));
};

const isPromiseLike = (value: unknown): value is Promise<unknown> =>
  Boolean(value) && typeof (value as Promise<unknown>).then === 'function';

const isSkillCommand = (command: SlashCommand) =>
  command.type === 'skill' || command.namespace === 'skill' || command.metadata?.type === 'skill';

const dedupeProviderSkills = (skills: ProviderSkill[]): ProviderSkill[] => {
  const seenCommands = new Set<string>();

  return skills.filter((skill) => {
    // Multiple physical Claude plugin folders can expose the same invocation.
    // The slash menu should show each executable command only once.
    const key = skill.command;
    if (seenCommands.has(key)) {
      return false;
    }

    seenCommands.add(key);
    return true;
  });
};

const mapSkillToSlashCommand = (skill: ProviderSkill): SlashCommand => ({
  name: skill.command,
  description: skill.description,
  namespace: 'skill',
  path: skill.sourcePath,
  type: 'skill',
  metadata: {
    type: skill.scope,
    scope: skill.scope,
    sourcePath: skill.sourcePath,
    pluginName: skill.pluginName,
    pluginId: skill.pluginId,
    skillName: skill.name,
  },
});

const filterSlashCommands = (
  commands: SlashCommand[],
  query: string,
): SlashCommand[] => {
  const normalizedQuery = query.trim().toLowerCase().replace(/^[/$]/, '');
  const candidates = query.startsWith('$') ? commands.filter(isSkillCommand) : commands;
  if (!normalizedQuery) return candidates;
  const nameOf = (command: SlashCommand) => command.name.toLowerCase().replace(/^[/$]/, '');
  const prefixMatches = candidates.filter((command) => nameOf(command).startsWith(normalizedQuery));
  // Namespaced commands retain exact prefix completion rather than unrelated results.
  if (normalizedQuery.includes(':')) return prefixMatches;
  const substringMatches = candidates.filter((command) => !nameOf(command).startsWith(normalizedQuery) && nameOf(command).includes(normalizedQuery));
  const descriptionMatches = candidates.filter((command) => !nameOf(command).includes(normalizedQuery) && command.description?.toLowerCase().includes(normalizedQuery));
  return [...prefixMatches, ...substringMatches, ...descriptionMatches];
};

/** Used by useChatComposerState to discover, filter and select commands without leaving the draft. */
export function useSlashCommands({
  selectedProject,
  provider,
  input,
  setInput,
  textareaRef,
  onExecuteCommand,
}: UseSlashCommandsOptions) {
  const { t } = useTranslation('chat');
  // The available commands are loaded for the active project and provider.
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  // Visibility also supports opening from the + menu without typing a trigger.
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  // Retain the trigger so $ restricts discovery to skills while / includes commands.
  const [commandQuery, setCommandQuery] = useState('');
  // One index drives both the highlighted row and keyboard selection.
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  // Remember which token to replace when completing inside a longer draft.
  const [slashPosition, setSlashPosition] = useState(-1);

  const filteredCommands = useMemo(() => {
    const localizedCommands = slashCommands.map((command) => command.type === 'built-in' ? {
      ...command,
      description: t(`misc.fallbackCommands.${command.name.replace(/^\//, '')}`, { defaultValue: command.description ?? '' }),
    } : command);
    return filterSlashCommands(localizedCommands, commandQuery);
  }, [slashCommands, commandQuery, t]);

  const resetCommandMenuState = useCallback(() => {
    setShowCommandMenu(false);
    setSlashPosition(-1);
    setCommandQuery('');
    setSelectedCommandIndex(0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchCommands = async () => {
      setSlashCommands([]);
      resetCommandMenuState();
      if (!selectedProject) {
        setSlashCommands([]);
        return;
      }

      try {
        const workspacePath = selectedProject.fullPath || selectedProject.path || '';
        const response = await api.commands.list(workspacePath || selectedProject.path, provider);

        if (!response.ok) {
          throw new Error('Failed to fetch commands');
        }

        const data = await response.json();
        if (!cancelled) setSlashCommands([
          ...(data.builtIn ?? []).map((command: SlashCommand) => ({ ...command, type: 'built-in' })),
          ...(data.custom ?? []).map((command: SlashCommand) => ({ ...command, type: 'custom' })),
        ]);
        const skillsResponse = await api.providers.skills(provider, { workspacePath }).catch(() => null);
        const skillsData = skillsResponse?.ok
          ? ((await skillsResponse.json()) as ProviderSkillsResponse)
          : null;
        const skillCommands = dedupeProviderSkills(skillsData?.data?.skills || [])
          .map(mapSkillToSlashCommand);
        const allCommands: SlashCommand[] = [
          ...((data.builtIn || []) as SlashCommand[]).map((command) => ({
            ...command,
            type: 'built-in',
          })),
          ...skillCommands,
          ...((data.custom || []) as SlashCommand[]).map((command) => ({
            ...command,
            type: 'custom',
          })),
        ];

        const parsedHistory = readCommandHistory(selectedProject.projectId);
        const sortedCommands = [...allCommands].sort((commandA, commandB) => {
          const commandAUsage = parsedHistory[commandA.name] || 0;
          const commandBUsage = parsedHistory[commandB.name] || 0;
          return commandBUsage - commandAUsage;
        });

        if (!cancelled) {
          setSlashCommands(sortedCommands);
        }
      } catch (error) {
        console.error('Error fetching slash commands:', error);
        if (!cancelled) {
          setSlashCommands([]);
        }
      }
    };

    fetchCommands();
    return () => {
      cancelled = true;
    };
  }, [selectedProject, provider, resetCommandMenuState]);

  const trackCommandUsage = useCallback(
    (command: SlashCommand) => {
      if (!selectedProject) {
        return;
      }

      const parsedHistory = readCommandHistory(selectedProject.projectId);
      parsedHistory[command.name] = (parsedHistory[command.name] || 0) + 1;
      saveCommandHistory(selectedProject.projectId, parsedHistory);
    },
    [selectedProject],
  );

  const insertCommandIntoInput = useCallback(
    (command: SlashCommand) => {
      const currentTextarea = textareaRef.current;
      const insertionStart = slashPosition >= 0
        ? slashPosition
        : currentTextarea?.selectionStart ?? input.length;
      const textBeforeCommand = input.slice(0, insertionStart);
      const tokenLength = slashPosition >= 0 ? (input.slice(insertionStart).match(/^[/$]\S*/)?.[0].length ?? 0) : 0;
      const textAfterCommand = input.slice(slashPosition >= 0 ? insertionStart + tokenLength : currentTextarea?.selectionEnd ?? insertionStart);
      const separator = textBeforeCommand && !/\s$/.test(textBeforeCommand) ? ' ' : '';
      const newInput = `${textBeforeCommand}${separator}${command.name}${textAfterCommand && /^\s/.test(textAfterCommand) ? textAfterCommand : ` ${textAfterCommand}`}`;

      setInput(newInput);
      resetCommandMenuState();

      window.requestAnimationFrame(() => {
        currentTextarea?.focus();
        const nextCursorPosition = `${textBeforeCommand}${separator}${command.name} `.length;
        currentTextarea?.setSelectionRange(nextCursorPosition, nextCursorPosition);
      });
    },
    [input, resetCommandMenuState, setInput, slashPosition, textareaRef],
  );

  const executeNonSkillCommand = useCallback(
    (command: SlashCommand) => {
      const executionResult = onExecuteCommand(command);
      if (isPromiseLike(executionResult)) {
        executionResult.then(
          () => {
            resetCommandMenuState();
          },
          () => {
            resetCommandMenuState();
            // Keep behavior silent; execution errors are handled by caller.
          },
        );
      } else {
        resetCommandMenuState();
      }
    },
    [onExecuteCommand, resetCommandMenuState],
  );

  const selectCommandFromKeyboard = useCallback(
    (command: SlashCommand) => {
      trackCommandUsage(command);
      if (isSkillCommand(command) || command.metadata?.acceptsArguments) {
        insertCommandIntoInput(command);
        return;
      }

      executeNonSkillCommand(command);
    },
    [executeNonSkillCommand, insertCommandIntoInput, trackCommandUsage],
  );

  const handleCommandSelect = useCallback(
    (command: SlashCommand | null, index: number, isHover: boolean) => {
      if (!command || !selectedProject) {
        return;
      }

      if (isHover) {
        setSelectedCommandIndex(index);
        return;
      }

      trackCommandUsage(command);
      if (isSkillCommand(command) || command.metadata?.acceptsArguments) {
        insertCommandIntoInput(command);
        return;
      }

      executeNonSkillCommand(command);
    },
    [selectedProject, trackCommandUsage, insertCommandIntoInput, executeNonSkillCommand],
  );

  const handleToggleCommandMenu = useCallback(() => {
    const isOpening = !showCommandMenu;
    setShowCommandMenu(isOpening);
    setCommandQuery('');
    setSelectedCommandIndex(0);
    setSlashPosition(-1);

    textareaRef.current?.focus();
  }, [showCommandMenu, textareaRef]);

  const handleCommandInputChange = useCallback(
    (newValue: string, cursorPos: number) => {
      if (!newValue.trim()) {
        resetCommandMenuState();
        return;
      }

      const textBeforeCursor = newValue.slice(0, cursorPos);
      const backticksBefore = (textBeforeCursor.match(/```/g) || []).length;
      const inCodeBlock = backticksBefore % 2 === 1;

      if (inCodeBlock) {
        resetCommandMenuState();
        return;
      }

      // Trigger at word boundaries; URLs and fenced code remain ordinary draft text.
      const slashPattern = /(?:^|\s)([/$]\S*)$/;
      const match = textBeforeCursor.match(slashPattern);

      if (!match) {
        resetCommandMenuState();
        return;
      }

      // Compute actual position of / in the full input string.
      const slashPos = match.index! + (match[0].length - match[1].length);
      const query = match[1];

      setSlashPosition(slashPos);
      setShowCommandMenu(true);
      setSelectedCommandIndex(0);
      setCommandQuery(query);
    },
    [resetCommandMenuState],
  );

  const handleCommandMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      // IME confirmation belongs to the textarea, never to command selection.
      if (event.nativeEvent?.isComposing || event.keyCode === 229) return true;
      if (!showCommandMenu) {
        return false;
      }

      if (!filteredCommands.length) {
        if (event.key === 'Escape') {
          event.preventDefault();
          resetCommandMenuState();
          return true;
        }
        return false;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedCommandIndex((previousIndex) =>
          previousIndex < filteredCommands.length - 1 ? previousIndex + 1 : 0,
        );
        return true;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedCommandIndex((previousIndex) =>
          previousIndex > 0 ? previousIndex - 1 : filteredCommands.length - 1,
        );
        return true;
      }

      if ((event.key === 'Tab' && !event.shiftKey) || (event.key === 'Enter' && !event.shiftKey)) {
        event.preventDefault();
        const command = filteredCommands[selectedCommandIndex] ?? filteredCommands[0];
        if (event.key === 'Tab') {
          trackCommandUsage(command);
          insertCommandIntoInput(command);
        } else {
          selectCommandFromKeyboard(command);
        }
        return true;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        resetCommandMenuState();
        return true;
      }

      return false;
    },
    [showCommandMenu, filteredCommands, resetCommandMenuState, selectCommandFromKeyboard, selectedCommandIndex, trackCommandUsage, insertCommandIntoInput],
  );

  return {
    slashCommands,
    slashCommandsCount: slashCommands.length,
    filteredCommands,
    showCommandMenu,
    selectedCommandIndex,
    resetCommandMenuState,
    handleCommandSelect,
    handleToggleCommandMenu,
    handleCommandInputChange,
    handleCommandMenuKeyDown,
  };
}
