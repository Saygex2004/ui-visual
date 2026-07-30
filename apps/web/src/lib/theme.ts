// Theme persistence + React state (Phase 10, FRONTEND.md §5). The
// `data-theme` attribute on <html> is the single source of truth for CSS
// (tokens.css's `:root[data-theme='dark']` block); this module keeps a React
// hook in sync with it and owns the one localStorage key.
//
// Contract: an explicit user choice ('light' | 'dark') is stored and always
// wins from then on. Key ABSENCE means "follow the OS preference live" —
// never store a third 'system' value, since that would make the two states
// (explicit vs following-OS) indistinguishable from a stored string alone.
// index.html's inline bootstrap script applies the same resolution
// synchronously before first paint, to avoid a flash of the wrong theme.
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pvpdash.theme';

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function resolveTheme(): Theme {
  return (
    readStoredTheme() ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme());

  useEffect(() => {
    // Only follow live OS changes while no explicit choice is stored —
    // once the user picks, the system preference must stop overriding it.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function onChange(event: MediaQueryListEvent) {
      if (readStoredTheme() != null) return;
      const next = event.matches ? 'dark' : 'light';
      setTheme(next);
      applyTheme(next);
    }
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage unavailable (e.g. privacy mode) — the toggle still works
        // for this session, it just won't persist across reloads.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
