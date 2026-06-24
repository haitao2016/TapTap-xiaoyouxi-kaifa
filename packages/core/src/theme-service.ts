import { globalEventBus } from './event-bus';

export type ThemeType = 'light' | 'dark' | 'system' | 'custom';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface Theme {
  id: string;
  name: string;
  type: ThemeType;
  colors: ThemeColors;
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    none: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    full: string;
  };
  spacing: {
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

const LIGHT_THEME: Theme = {
  id: 'light',
  name: '浅色主题',
  type: 'light',
  colors: {
    primary: '#5B5FFF',
    primaryHover: '#4a4ae6',
    secondary: '#6B7280',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceHover: '#F3F4F6',
    border: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    accent: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    base: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
  },
};

const DARK_THEME: Theme = {
  id: 'dark',
  name: '深色主题',
  type: 'dark',
  colors: {
    primary: '#7C7CFF',
    primaryHover: '#6b6be6',
    secondary: '#9CA3AF',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceHover: '#334155',
    border: '#334155',
    textPrimary: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    accent: '#A78BFA',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    base: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
  },
};

export class ThemeService {
  private currentTheme: Theme = LIGHT_THEME;
  private savedThemeType: ThemeType = 'light';
  private customThemes = new Map<string, Theme>();

  constructor() {
    this.loadSavedTheme();
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  getThemeType(): ThemeType {
    return this.savedThemeType;
  }

  setTheme(type: ThemeType): void {
    this.savedThemeType = type;
    
    if (type === 'system') {
      this.currentTheme = this.getSystemTheme();
    } else if (type === 'light') {
      this.currentTheme = LIGHT_THEME;
    } else if (type === 'dark') {
      this.currentTheme = DARK_THEME;
    } else if (type === 'custom') {
      const defaultCustom = this.customThemes.get('default');
      if (defaultCustom) {
        this.currentTheme = defaultCustom;
      } else {
        this.currentTheme = LIGHT_THEME;
      }
    }

    this.saveTheme();
    this.applyTheme();
    globalEventBus.emit({ type: 'theme:change', payload: this.currentTheme });
  }

  setCustomTheme(theme: Theme): void {
    this.customThemes.set(theme.id, theme);
    this.savedThemeType = 'custom';
    this.currentTheme = theme;
    this.saveTheme();
    this.applyTheme();
    globalEventBus.emit({ type: 'theme:change', payload: this.currentTheme });
  }

  getAvailableThemes(): Theme[] {
    return [LIGHT_THEME, DARK_THEME, ...Array.from(this.customThemes.values())];
  }

  getCustomThemes(): Theme[] {
    return Array.from(this.customThemes.values());
  }

  deleteCustomTheme(id: string): void {
    this.customThemes.delete(id);
    if (this.currentTheme.id === id) {
      this.setTheme('light');
    }
  }

  getSystemTheme(): Theme {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
    }
    return LIGHT_THEME;
  }

  isDarkMode(): boolean {
    return this.currentTheme.type === 'dark' || 
           (this.currentTheme.type === 'system' && this.getSystemTheme().type === 'dark');
  }

  private loadSavedTheme(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tapdev-theme');
        if (saved) {
          this.savedThemeType = saved as ThemeType;
        }
      }
    } catch {
      // Ignore errors
    }
    this.setTheme(this.savedThemeType);
  }

  private saveTheme(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tapdev-theme', this.savedThemeType);
      }
    } catch {
      // Ignore errors
    }
  }

  private applyTheme(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.currentTheme.id);
      
      const root = document.documentElement;
      const colors = this.currentTheme.colors;
      
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });

      root.style.setProperty('--font-family', this.currentTheme.fontFamily);
      
      Object.entries(this.currentTheme.fontSize).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value);
      });

      Object.entries(this.currentTheme.borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--radius-${key}`, value);
      });

      Object.entries(this.currentTheme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
    }
  }

  generateThemeFromColors(name: string, primaryColor: string): Theme {
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const isLight = (r * 0.299 + g * 0.587 + b * 0.114) > 128;
    
    const baseTheme = isLight ? LIGHT_THEME : DARK_THEME;
    
    return {
      ...baseTheme,
      id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      type: 'custom',
      colors: {
        ...baseTheme.colors,
        primary: primaryColor,
        primaryHover: this.adjustColor(primaryColor, -20),
        accent: this.adjustColor(primaryColor, 30),
      },
    };
  }

  private adjustColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}

export const themeService = new ThemeService();