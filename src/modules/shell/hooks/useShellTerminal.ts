import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { ClipboardAddon, type IClipboardProvider } from '@xterm/addon-clipboard';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';
import type { ITerminalOptions } from '@xterm/xterm';

import type { MobileTerminalSelectionManager, Project } from '@/shared/types';
import { copyTextToClipboard } from '@/shared/utils';
import { TERMINAL_INIT_DELAY_MS } from '@/shared/constants';
import { installMobileTerminalSelection } from '@/modules/shell/utils/mobileTerminalSelection';
import { sendSocketMessage } from '@/modules/shell/utils/socket';
import { ensureXtermFocusStyles } from '@/modules/shell/utils/terminalStyles';

const TERMINAL_RESIZE_DELAY_MS = 50;

const TERMINAL_OPTIONS: ITerminalOptions = {
  cursorBlink: true,
  fontSize: 14,
  fontFamily: '"Codex Terminal Mono", "SFMono-Regular", Consolas, "Liberation Mono", "Noto Sans Mono CJK SC", monospace',
  lineHeight: 1.4,
  fontWeight: '400',
  fontWeightBold: '600',
  cursorStyle: 'bar',
  cursorWidth: 2,
  minimumContrastRatio: 4.5,
  allowProposedApi: true,
  allowTransparency: false,
  convertEol: true,
  scrollback: 10000,
  tabStopWidth: 4,
  windowsMode: false,
  macOptionIsMeta: true,
  macOptionClickForcesSelection: true,
  // Keep the runtime theme keys used by the previous JSX implementation.
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    cursorAccent: '#1e1e1e',
    selectionBackground: '#264f78',
    selectionForeground: '#ffffff',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff',
    extendedAnsi: [
      '#000000',
      '#800000',
      '#008000',
      '#808000',
      '#000080',
      '#800080',
      '#008080',
      '#c0c0c0',
      '#808080',
      '#ff0000',
      '#00ff00',
      '#ffff00',
      '#0000ff',
      '#ff00ff',
      '#00ffff',
      '#ffffff',
    ],
  },
};

// Theme changes repaint the existing terminal rather than reconnecting the PTY.
function readTerminalTheme(): ITerminalOptions['theme'] {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    ...TERMINAL_OPTIONS.theme,
    background: isDark ? '#141414' : '#faf9f5',
    foreground: isDark ? '#e5e5e5' : '#242424',
    cursor: isDark ? '#faf9f5' : '#242424',
    cursorAccent: isDark ? '#141414' : '#faf9f5',
    selectionBackground: isDark ? '#ffffff26' : '#24242420',
    black: '#242424', red: '#d98980', green: '#a3b18a', yellow: '#d8ba83',
    blue: '#8db3d4', magenta: '#b9a0c5', cyan: '#8bbfbb', white: '#d8d5cc',
    brightBlack: '#92908a', brightRed: '#edaaa0', brightGreen: '#b9c9a4',
    brightYellow: '#e8cda0', brightBlue: '#aacbea', brightMagenta: '#d1b9dd',
    brightCyan: '#a8d6d0', brightWhite: '#faf9f5',
    selectionForeground: isDark ? '#faf9f5' : '#242424',
    ...(!isDark && {
      black: '#242424', red: '#a83232', green: '#386b35', yellow: '#805c17',
      blue: '#2866a0', magenta: '#85418d', cyan: '#246d78', white: '#555555',
      brightBlack: '#6b6962', brightRed: '#b42e2e', brightGreen: '#366c37',
      brightYellow: '#815c12', brightBlue: '#225da1', brightMagenta: '#8a3c91',
      brightCyan: '#216c78', brightWhite: '#242424',
    }),
  };
}

// CLIs running inside the pty (e.g. `claude auth login`'s "press c to copy"
// device-flow prompt) write to the clipboard via an OSC 52 escape sequence,
// not a browser event — xterm.js ignores OSC 52 unless a clipboard addon is
// loaded. Routes writes through the same fallback-aware helper the terminal's
// own selection-copy shortcut uses, since `navigator.clipboard` is often
// unavailable on self-hosted, non-HTTPS deployments.
// `ClipboardSelectionType.SYSTEM` is `'c'` (vs. `'p'` for the X11 primary
// selection) — compared as a literal since the addon ships it as a const
// enum, which isolatedModules builds (esbuild/Vite) can't import as a value.
const oscClipboardProvider: IClipboardProvider = {
  readText: async (selection) => {
    if (selection !== 'c') {
      return '';
    }
    try {
      return (await navigator.clipboard?.readText?.()) || '';
    } catch {
      return '';
    }
  },
  writeText: async (selection, text) => {
    if (selection !== 'c') {
      return;
    }
    await copyTextToClipboard(text);
  },
};

// The addon's published typings declare a single `(provider?)` constructor
// param, but the shipped runtime actually takes `(base64?, provider?)` — see
// node_modules/@xterm/addon-clipboard/lib/addon-clipboard.js. Cast to call it
// the way it's really implemented.
const ClipboardAddonCtor = ClipboardAddon as unknown as new (
  base64?: unknown,
  provider?: IClipboardProvider,
) => ClipboardAddon;

type UseShellTerminalOptions = {
  terminalContainerRef: RefObject<HTMLDivElement>;
  terminalRef: MutableRefObject<Terminal | null>;
  fitAddonRef: MutableRefObject<FitAddon | null>;
  wsRef: MutableRefObject<WebSocket | null>;
  selectedProject: Project | null | undefined;
  minimal: boolean;
  isRestarting: boolean;
  closeSocket: () => void;
};

type UseShellTerminalResult = {
  isInitialized: boolean;
  clearTerminalScreen: () => void;
  disposeTerminal: () => void;
};

export function useShellTerminal({
  terminalContainerRef,
  terminalRef,
  fitAddonRef,
  wsRef,
  selectedProject,
  minimal,
  isRestarting,
  closeSocket,
}: UseShellTerminalOptions): UseShellTerminalResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const resizeTimeoutRef = useRef<number | null>(null);
  const mobileSelectionRef = useRef<MobileTerminalSelectionManager | null>(null);
  const selectedProjectKey = selectedProject?.fullPath || selectedProject?.path || '';
  const hasSelectedProject = Boolean(selectedProject);

  useEffect(() => {
    ensureXtermFocusStyles();
  }, []);

  const clearTerminalScreen = useCallback(() => {
    if (!terminalRef.current) {
      return;
    }

    terminalRef.current.clear();
    terminalRef.current.write('\x1b[2J\x1b[H');
  }, [terminalRef]);

  const disposeTerminal = useCallback(() => {
    if (mobileSelectionRef.current) {
      mobileSelectionRef.current.dispose();
      mobileSelectionRef.current = null;
    }

    if (terminalRef.current) {
      terminalRef.current.dispose();
      terminalRef.current = null;
    }

    fitAddonRef.current = null;
    setIsInitialized(false);
  }, [fitAddonRef, terminalRef]);

  useEffect(() => {
    const terminalContainer = terminalContainerRef.current;
    if (!terminalContainer || !hasSelectedProject || isRestarting || terminalRef.current) {
      return;
    }

    const nextTerminal = new Terminal({ ...TERMINAL_OPTIONS, theme: readTerminalTheme() });
    terminalRef.current = nextTerminal;

    const nextFitAddon = new FitAddon();
    fitAddonRef.current = nextFitAddon;
    nextTerminal.loadAddon(nextFitAddon);

    nextTerminal.loadAddon(new ClipboardAddonCtor(undefined, oscClipboardProvider));

    // Avoid wrapped partial links in compact login flows.
    if (!minimal) {
      nextTerminal.loadAddon(new WebLinksAddon());
    }

    try {
      nextTerminal.loadAddon(new WebglAddon());
    } catch {
      console.warn('[Shell] WebGL renderer unavailable, using Canvas fallback');
    }

    nextTerminal.open(terminalContainer);
    // A local webfont can arrive after xterm measures its cells. Refit this same PTY.
    void document.fonts?.load('14px "Codex Terminal Mono"').then(() => {
      if (terminalRef.current !== nextTerminal) return;
      nextTerminal.options.fontFamily = TERMINAL_OPTIONS.fontFamily;
      nextFitAddon.fit();
      nextTerminal.refresh(0, nextTerminal.rows - 1);
      sendSocketMessage(wsRef.current, { type: 'resize', cols: nextTerminal.cols, rows: nextTerminal.rows });
    }).catch(() => {});

    const themeObserver = new MutationObserver(() => {
      nextTerminal.options.theme = readTerminalTheme();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    mobileSelectionRef.current = installMobileTerminalSelection(
      nextTerminal,
      terminalContainer,
      {
        onFontSizeChange: (fontSize) => {
          nextTerminal.options.fontSize = fontSize;

          const currentFitAddon = fitAddonRef.current;
          if (currentFitAddon) {
            currentFitAddon.fit();
            sendSocketMessage(wsRef.current, {
              type: 'resize',
              cols: nextTerminal.cols,
              rows: nextTerminal.rows,
            });
          } else {
            nextTerminal.refresh(0, nextTerminal.rows - 1);
          }
        },
      },
    );

    const copyTerminalSelection = async () => {
      const selection = nextTerminal.getSelection();
      if (!selection) {
        return false;
      }

      return copyTextToClipboard(selection);
    };

    const handleTerminalCopy = (event: ClipboardEvent) => {
      if (!nextTerminal.hasSelection()) {
        return;
      }

      const selection = nextTerminal.getSelection();
      if (!selection) {
        return;
      }

      event.preventDefault();

      if (event.clipboardData) {
        event.clipboardData.setData('text/plain', selection);
        return;
      }

      void copyTextToClipboard(selection);
    };

    terminalContainer.addEventListener('copy', handleTerminalCopy);

    nextTerminal.attachCustomKeyEventHandler((event) => {
      if (
        event.type === 'keydown' &&
        (event.ctrlKey || event.metaKey) &&
        event.key?.toLowerCase() === 'c' &&
        nextTerminal.hasSelection()
      ) {
        event.preventDefault();
        event.stopPropagation();
        void copyTerminalSelection();
        return false;
      }

      if (
        event.type === 'keydown' &&
        (event.ctrlKey || event.metaKey) &&
        event.key?.toLowerCase() === 'v'
      ) {
        // Block native paste so data is only injected after clipboard-read resolves.
        event.preventDefault();
        event.stopPropagation();

        if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
          navigator.clipboard
            .readText()
            .then((text) => {
              sendSocketMessage(wsRef.current, {
                type: 'input',
                data: text,
              });
            })
            .catch(() => {});
        }

        return false;
      }

      return true;
    });

    window.setTimeout(() => {
      const currentFitAddon = fitAddonRef.current;
      const currentTerminal = terminalRef.current;
      if (!currentFitAddon || !currentTerminal) {
        return;
      }

      currentFitAddon.fit();
      sendSocketMessage(wsRef.current, {
        type: 'resize',
        cols: currentTerminal.cols,
        rows: currentTerminal.rows,
      });
    }, TERMINAL_INIT_DELAY_MS);

    setIsInitialized(true);

    const dataSubscription = nextTerminal.onData((data) => {
      sendSocketMessage(wsRef.current, {
        type: 'input',
        data,
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = window.setTimeout(() => {
        const currentFitAddon = fitAddonRef.current;
        const currentTerminal = terminalRef.current;
        if (!currentFitAddon || !currentTerminal) {
          return;
        }

        currentFitAddon.fit();
        sendSocketMessage(wsRef.current, {
          type: 'resize',
          cols: currentTerminal.cols,
          rows: currentTerminal.rows,
        });
      }, TERMINAL_RESIZE_DELAY_MS);
    });

    resizeObserver.observe(terminalContainer);

    return () => {
      themeObserver.disconnect();
      terminalContainer.removeEventListener('copy', handleTerminalCopy);
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      dataSubscription.dispose();
      closeSocket();
      disposeTerminal();
    };
  }, [
    closeSocket,
    disposeTerminal,
    fitAddonRef,
    isRestarting,
    hasSelectedProject,
    minimal,
    selectedProjectKey,
    terminalContainerRef,
    terminalRef,
    wsRef,
  ]);

  return {
    isInitialized,
    clearTerminalScreen,
    disposeTerminal,
  };
}
