'use client'

import { useEffect } from 'react';

export function ThemeInitializer() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flow-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved ? saved === 'dark' : prefersDark;
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.classList.toggle('light', !isDark);
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return null;
}