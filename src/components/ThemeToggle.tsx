// src/components/ThemeToggle.tsx

"use client";

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Initialize theme preference from localStorage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flow-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return saved ? saved === 'dark' : prefersDark;
    }
    return true; // Default to dark mode
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    localStorage.setItem('flow-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg transition-all duration-300 hover-lift backdrop-blur-sm border dark:border-neutral-700/50 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 light:border-gray-200/50 light:bg-white/80 light:hover:bg-gray-50/80 group"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        <Sun className={`w-6 h-6 text-yellow-500 transition-all duration-300 absolute ${
          isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        }`} />
        <Moon className={`w-6 h-6 text-blue-600 transition-all duration-300 absolute ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
        }`} />
      </div>
    </button>
  );
}
