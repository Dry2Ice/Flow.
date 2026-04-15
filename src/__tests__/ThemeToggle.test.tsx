import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ThemeToggle } from '@/components/ThemeToggle';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = '';
  });

  afterEach(() => {
    document.documentElement.className = '';
  });

  test('renders loading skeleton initially (hydration guard)', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ theme: 'dark' }));

    render(<ThemeToggle />);

    // Should show loading skeleton initially
    const loadingElement = screen.getByRole('generic', { hidden: true });
    expect(loadingElement).toHaveClass('animate-pulse');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('applies dark theme on mount when saved preference is dark', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });
  });

  test('applies light theme on mount when saved preference is light', async () => {
    localStorageMock.getItem.mockReturnValue('light');

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  test('uses system preference when no saved preference', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    window.matchMedia.mockReturnValue({ matches: true }); // prefers dark

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  test('toggles from dark to light on click', async () => {
    localStorageMock.getItem.mockReturnValue('dark');
    const user = userEvent.setup();

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    const toggleButton = screen.getByRole('button', { name: /switch to light theme/i });
    await user.click(toggleButton);

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('flow-theme', 'light');
  });

  test('toggles from light to dark on click', async () => {
    localStorageMock.getItem.mockReturnValue('light');
    const user = userEvent.setup();

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    const toggleButton = screen.getByRole('button', { name: /switch to dark theme/i });
    await user.click(toggleButton);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('flow-theme', 'dark');
  });

  test('handles localStorage errors gracefully', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    // Should not crash
    expect(() => render(<ThemeToggle />)).not.toThrow();

    await waitFor(() => {
      // Should still render and apply default theme
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  test('shows correct aria-label for current theme', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /switch to light theme/i });
      expect(button).toBeInTheDocument();
    });

    // Click to toggle
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /switch to light theme/i });
    await user.click(button);

    await waitFor(() => {
      const updatedButton = screen.getByRole('button', { name: /switch to dark theme/i });
      expect(updatedButton).toBeInTheDocument();
    });
  });

  test('shows correct tooltip text', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(<ThemeToggle />);

    await waitFor(() => {
      const tooltip = screen.getByText('Switch to Light');
      expect(tooltip).toBeInTheDocument();
    });
  });
});