import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Mode = 'light' | 'dark' | 'system' | 'night';
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  /** The user's selected mode. */
  mode: Mode;
  /** The currently applied theme (resolved from `mode`). */
  theme: Theme;
  setMode: (m: Mode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'theme';

// Night window: 7pm (19:00) through 6:59am.
const NIGHT_START = 19;
const NIGHT_END = 7;

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function isNight(): boolean {
  const h = new Date().getHours();
  return h >= NIGHT_START || h < NIGHT_END;
}

function resolve(mode: Mode): Theme {
  switch (mode) {
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    case 'system':
      return systemPrefersDark() ? 'dark' : 'light';
    case 'night':
      return isNight() ? 'dark' : 'light';
  }
}

function getInitialMode(): Mode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'night') {
    return stored;
  }
  // Default to following the OS preference.
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(getInitialMode);
  const [theme, setTheme] = useState<Theme>(() => resolve(getInitialMode()));

  // Re-resolve and apply whenever the mode changes.
  useEffect(() => {
    const apply = () => {
      const next = resolve(mode);
      setTheme(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      localStorage.setItem(STORAGE_KEY, mode);
    };
    apply();

    // `system` must react to OS changes; `night` must react to the clock.
    let mql: MediaQueryList | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;

    if (mode === 'system') {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', apply);
    } else if (mode === 'night') {
      // Re-check every minute so the flip happens near the window edges.
      timer = setInterval(apply, 60_000);
    }

    return () => {
      mql?.removeEventListener('change', apply);
      if (timer) clearInterval(timer);
    };
  }, [mode]);

  const setMode = (m: Mode) => setModeState(m);
  const toggleTheme = () =>
    setModeState((m) => (resolve(m) === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
