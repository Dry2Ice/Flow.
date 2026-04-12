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
    localStorage.setItem('flow-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="fixed top-4 right-16 p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors z-10"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-blue-400" />
      )}
    </button>
  );
}