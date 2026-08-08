import { useEffect, useState } from 'react';

/** Persists dark/light preference to localStorage and toggles the `dark` class on <html> */
export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('wb_dark');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add('dark'); }
    else       { root.classList.remove('dark'); }
    localStorage.setItem('wb_dark', String(dark));
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
