import { describe, expect, test, vi } from 'vitest';
import { DockviewApi } from 'dockview';
import { handleDockviewKeyboardNavigation } from '@/components/DockWorkspace';

const PANEL_ORDER = ['files', 'projects', 'editor', 'preview', 'chat', 'logs', 'plan'] as const;

function createKeyboardEvent(key: string, ctrlKey = true): KeyboardEvent {
  return {
    key,
    ctrlKey,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe('handleDockviewKeyboardNavigation', () => {
  test('activates specific panel via panel API for Ctrl+ArrowRight', () => {
    const setActive = vi.fn();
    const event = createKeyboardEvent('ArrowRight');
    const api = {
      activePanel: { id: 'files' },
      getPanel: vi.fn((id: string) => (id === 'projects' ? { api: { setActive } } : undefined)),
      moveToPrevious: vi.fn(),
      moveToNext: vi.fn(),
    } as unknown as DockviewApi;

    handleDockviewKeyboardNavigation(event, api, PANEL_ORDER);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(api.getPanel).toHaveBeenCalledWith('projects');
    expect(setActive).toHaveBeenCalledOnce();
  });

  test('moves focus across groups with Ctrl+ArrowUp / Ctrl+ArrowDown', () => {
    const upEvent = createKeyboardEvent('ArrowUp');
    const downEvent = createKeyboardEvent('ArrowDown');

    const api = {
      activePanel: { id: 'editor' },
      getPanel: vi.fn(),
      moveToPrevious: vi.fn(),
      moveToNext: vi.fn(),
    } as unknown as DockviewApi;

    handleDockviewKeyboardNavigation(upEvent, api, PANEL_ORDER);
    handleDockviewKeyboardNavigation(downEvent, api, PANEL_ORDER);

    expect(upEvent.preventDefault).toHaveBeenCalledOnce();
    expect(downEvent.preventDefault).toHaveBeenCalledOnce();
    expect(api.moveToPrevious).toHaveBeenCalledWith({ includePanel: false });
    expect(api.moveToNext).toHaveBeenCalledWith({ includePanel: false });
  });
});
