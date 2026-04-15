// src/components/ThemeToggle.tsx

"use client";

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read theme preference and mark as hydrated
    const saved = localStorage.getItem('flow-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(saved ? saved === 'dark' : prefersDark);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      // Apply theme to document
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.classList.toggle('light', !isDark);
      localStorage.setItem('flow-theme', isDark ? 'dark' : 'light');
    }
  }, [isDark, hydrated]);

  // Don't render until hydrated to prevent hydration mismatch
  if (!hydrated) {
    return (
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-700/70 bg-neutral-900/70">
        <div className="h-4 w-4 animate-pulse rounded bg-neutral-600" />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      type="button"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:border-neutral-700/70 dark:bg-neutral-900/70 dark:hover:border-neutral-500/70 dark:hover:bg-neutral-800/85 light:border-gray-300/70 light:bg-white/85 light:hover:border-gray-400/80 light:hover:bg-gray-50"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        <Sun className={`absolute h-5 w-5 text-yellow-500 transition-all duration-300 ${
          isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        }`} />
        <Moon className={`absolute h-5 w-5 text-blue-400 transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
        }`} />
      </div>

      {/* Tooltip */}
      <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white light:border-gray-200 light:bg-white light:text-gray-900">
        {isDark ? 'Switch to Light' : 'Switch to Dark'}
      </div>
    </button>
  );
}
