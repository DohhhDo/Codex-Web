import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import CommandMenu from '@/modules/chat/composer/CommandMenu';
import { useSlashCommands } from '@/modules/chat/hooks/useSlashCommands';
import { api } from '@/shared/api';
import type { Project } from '@/shared/types';

vi.mock('@/shared/api', () => ({ api: { commands: { list: vi.fn() }, providers: { skills: vi.fn() } } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }) }));

const project = { projectId: 'completion-project', path: '/workspace', fullPath: '/workspace' } as Project;
const execute = vi.fn();

function CompletionHarness() {
  // A real draft lets these tests verify completion preserves surrounding text.
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commands = useSlashCommands({ selectedProject: project, provider: 'codex', input, setInput, textareaRef, onExecuteCommand: execute });
  return <form onSubmit={(event) => event.preventDefault()}>
    <textarea aria-label="Message" ref={textareaRef} value={input} onChange={(event) => {
      setInput(event.target.value);
      commands.handleCommandInputChange(event.target.value, event.target.selectionStart);
    }} onKeyDown={commands.handleCommandMenuKeyDown} />
    <button type="button" disabled={!commands.slashCommandsCount} onClick={commands.handleToggleCommandMenu}>Commands</button>
    <CommandMenu id="completion" anchorRef={textareaRef} commands={commands.filteredCommands} selectedIndex={commands.selectedCommandIndex} onSelect={commands.handleCommandSelect} onClose={commands.resetCommandMenuState} isOpen={commands.showCommandMenu} />
  </form>;
}

beforeEach(() => {
  localStorage.clear();
  execute.mockReset();
  vi.mocked(api.commands.list).mockResolvedValue({ ok: true, json: async () => ({ builtIn: [
    { name: '/help', description: 'Help with commands', namespace: 'builtin' },
    { name: '/models', description: 'Choose a model', namespace: 'builtin' },
  ], custom: [{ name: '/team:review', description: 'Team review', namespace: 'project' }] }) } as Response);
  vi.mocked(api.providers.skills).mockResolvedValue({ ok: true, json: async () => ({ data: { skills: [
    { name: 'imagegen', command: '$imagegen', description: '生成与修改图片', scope: 'user', sourcePath: '/skills/imagegen/SKILL.md' },
    { name: 'review', command: '$review', description: 'Review code', scope: 'repo', sourcePath: '/skills/review/SKILL.md' },
  ] } }) } as Response);
});

async function setup(value = '/') {
  render(<CompletionHarness />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Commands' }).hasAttribute('disabled')).toBe(false));
  const input = screen.getByRole('textbox') as HTMLTextAreaElement;
  input.focus();
  fireEvent.change(input, { target: { value } });
  return input;
}

const selectedName = () => screen.getAllByRole('option').find((item) => item.getAttribute('aria-selected') === 'true')?.textContent;

describe('command completion', () => {
  test('usage ranking, visual order and arrow navigation agree across command types', async () => {
    localStorage.setItem('command_history_completion-project', JSON.stringify({ '$review': 12, '/models': 8 }));
    const input = await setup();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options[0].textContent).toContain('$review');
    expect(selectedName()).toContain('$review');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(selectedName()).toContain('/models');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ name: '/models' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('slash searches skill names immediately and dollar lists only skills', async () => {
    const input = await setup('/image');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(selectedName()).toContain('$imagegen');
    fireEvent.change(input, { target: { value: '$' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.change(input, { target: { value: '/图片' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(selectedName()).toContain('$imagegen');
  });

  test('Tab completes a built-in without executing it; Enter still executes', async () => {
    const input = await setup('/mod');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('/models ');
    expect(execute).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.change(input, { target: { value: '/mod' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  test('skill completion preserves the draft before and after the token, including newlines', async () => {
    const input = await setup('Please /image\nkeep this instruction');
    fireEvent.change(input, { target: { value: 'Please /imag\nkeep this instruction', selectionStart: 12, selectionEnd: 12 } });
    fireEvent.click(screen.getByRole('option', { name: /imagegen/ }));
    expect(input.value).toBe('Please $imagegen\nkeep this instruction');
    expect(execute).not.toHaveBeenCalled();
  });

  test('IME confirmation and Shift+Enter do not execute a command', async () => {
    const input = await setup('/mod');
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(execute).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  test('Escape dismisses completion and retains the focused draft', async () => {
    const input = await setup('/mod');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.value).toBe('/mod');
    expect(document.activeElement).toBe(input);
  });

  test('namespaced prefixes stay precise and empty results explain the absence', async () => {
    const input = await setup('/team:');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.change(input, { target: { value: '/team:missing' } });
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('No matching commands or skills');
  });

  test.each(['https://example.com/path', '```sh\n/help'])('does not open inside URLs or fenced code: %s', async (value) => {
    await setup(value);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('placement follows the composer and responds to short, narrow viewports', async () => {
    const input = await setup();
    const form = input.closest('form')!;
    vi.spyOn(form, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 210, left: 20, right: 300, width: 280, height: 110 } as DOMRect);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(320);
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('listbox').style.top).toBe('218px');
    expect(Number.parseFloat(screen.getByRole('listbox').style.width)).toBeLessThanOrEqual(304);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(250);
    fireEvent(window, new Event('resize'));
    const menu = screen.getByRole('listbox');
    expect(menu.style.top).toBe('');
    expect(menu.style.bottom).toBe('158px');
    expect(menu.style.maxHeight).toBe('84px');
  });
});
