export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'drophour_theme';

/**
 * Determine theme according to time of day:
 * - Morning 6:00 AM (06:00) to Evening 6:00 PM (18:00): Bright / Light
 * - Remaining time (6:00 PM to 6:00 AM): Dark
 */
export function getTimeBasedTheme(): Theme {
  const currentHour = new Date().getHours();
  // 6:00 to 17:59 (6 AM to 6 PM) is Bright (Light)
  return currentHour >= 6 && currentHour < 18 ? 'light' : 'dark';
}

/**
 * Get initial theme:
 * Checks localStorage for explicit user toggle, else follows time of day.
 */
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return getTimeBasedTheme();
}

/**
 * Applies theme to document.documentElement (.dark class) and persists preference
 */
export function applyTheme(theme: Theme): void {
  try {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Toggles current theme between light and dark
 */
export function toggleTheme(current: Theme): Theme {
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
