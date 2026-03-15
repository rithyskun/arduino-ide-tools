import { headers } from 'next/headers';
import { type Theme, type ResolvedTheme, resolveTheme } from './index';

export async function getThemeFromHeaders(): Promise<Theme> {
  try {
    // Try to get theme from cookies first
    const headersList = await headers();
    const cookieStore = headersList.get('cookie');
    if (cookieStore) {
      const themeMatch = cookieStore.match(/arduinosim-theme=([^;]+)/);
      if (themeMatch) {
        const theme = themeMatch[1] as Theme;
        if (['dark', 'light', 'system'].includes(theme)) {
          return theme;
        }
      }
    }
  } catch {
    // Headers might not be available in some contexts
  }
  
  return 'system'; // Default theme
}

export async function getServerTheme(): Promise<ResolvedTheme> {
  const theme = await getThemeFromHeaders();
  return resolveTheme(theme);
}

export async function getThemeClasses(): Promise<string> {
  const resolved = await getServerTheme();
  return resolved === 'dark' ? 'dark' : 'light';
}

// Fallback function for when cookies aren't available
export function getDefaultThemeClasses(): string {
  // Default to system preference or 'light' as fallback
  return 'light';
}
