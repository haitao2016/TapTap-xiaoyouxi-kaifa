import type { PluginContext, PluginMeta, PluginHook } from '@tapdev/types';
import type { Theme, ThemeColors } from '../../theme-service';
import { themeService } from '../../theme-service';

export const meta: PluginMeta = {
  id: 'tapdev.theme',
  name: '主题管理',
  version: '1.0.0',
  description: '提供丰富的主题定制和切换功能',
  author: 'TapDev Studio',
  enabled: true,
  entry: 'theme-plugin',
  hooks: ['onProjectOpen'] as PluginHook[],
  icon: 'palette',
  category: '界面',
  homepage: 'https://tapdev.io/plugins/theme',
  repository: 'https://github.com/tapdev/theme-plugin',
};

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: Partial<ThemeColors>;
  type: 'light' | 'dark';
}

const PRESET_THEMES: ThemePreset[] = [
  {
    id: 'ocean',
    name: '海洋蓝',
    description: '清新的海洋蓝色调',
    colors: { primary: '#0EA5E9', accent: '#06B6D4' },
    type: 'light',
  },
  {
    id: 'forest',
    name: '森林绿',
    description: '自然的森林绿色调',
    colors: { primary: '#10B981', accent: '#34D399' },
    type: 'light',
  },
  {
    id: 'sunset',
    name: '日落橙',
    description: '温暖的日落橙色调',
    colors: { primary: '#F97316', accent: '#FB923C' },
    type: 'light',
  },
  {
    id: 'grape',
    name: '葡萄紫',
    description: '优雅的葡萄紫色调',
    colors: { primary: '#8B5CF6', accent: '#A78BFA' },
    type: 'light',
  },
  {
    id: 'rose',
    name: '玫瑰粉',
    description: '柔美的玫瑰粉色调',
    colors: { primary: '#EC4899', accent: '#F472B6' },
    type: 'light',
  },
  {
    id: 'midnight',
    name: '午夜蓝',
    description: '深邃的午夜蓝色调',
    colors: { primary: '#6366F1', accent: '#818CF8' },
    type: 'dark',
  },
  {
    id: 'emerald',
    name: '翡翠绿',
    description: '典雅的翡翠绿色调',
    colors: { primary: '#10B981', accent: '#34D399' },
    type: 'dark',
  },
  {
    id: 'amber',
    name: '琥珀金',
    description: '华贵的琥珀金色调',
    colors: { primary: '#F59E0B', accent: '#FBBF24' },
    type: 'dark',
  },
];

export class ThemePlugin {
  private customThemes = new Map<string, Theme>();
  private currentPreset = '';

  getPresets(): ThemePreset[] {
    return PRESET_THEMES;
  }

  applyPreset(presetId: string): void {
    const preset = PRESET_THEMES.find((p) => p.id === presetId);
    if (!preset) {
      throw new Error(`主题不存在: ${presetId}`);
    }

    const currentTheme = themeService.getTheme();
    const newTheme: Theme = {
      ...currentTheme,
      id: `preset-${presetId}`,
      name: preset.name,
      type: preset.type,
      colors: {
        ...currentTheme.colors,
        ...preset.colors,
      },
    };

    themeService.setCustomTheme(newTheme);
    this.currentPreset = presetId;
  }

  getCurrentPreset(): string {
    return this.currentPreset;
  }

  createCustomTheme(name: string, primaryColor: string): Theme {
    const theme = themeService.generateThemeFromColors(name, primaryColor);
    this.customThemes.set(theme.id, theme);
    return theme;
  }

  getCustomThemes(): Theme[] {
    return Array.from(this.customThemes.values());
  }

  deleteCustomTheme(id: string): void {
    this.customThemes.delete(id);
  }

  applyTheme(theme: Theme): void {
    themeService.setCustomTheme(theme);
  }

  getCurrentTheme(): Theme {
    return themeService.getTheme();
  }

  toggleDarkMode(): void {
    const current = themeService.getThemeType();
    if (current === 'dark') {
      themeService.setTheme('light');
    } else {
      themeService.setTheme('dark');
    }
  }

  resetTheme(): void {
    themeService.setTheme('light');
    this.currentPreset = '';
  }
}

export const themePlugin = new ThemePlugin();

export function activate(ctx: PluginContext): void {
  const plugin = themePlugin;

  ctx.registerCommand(
    'apply-theme-preset',
    async () => {
      const presets = plugin.getPresets();
      if (presets.length > 0) {
        plugin.applyPreset(presets[0].id);
        ctx.showNotification(`已应用主题: ${presets[0].name}`, 'success');
      }
    },
    {
      id: 'apply-theme-preset',
      title: '应用主题预设',
      description: '快速应用预设主题',
      icon: 'palette',
      category: '主题',
    }
  );

  ctx.registerCommand(
    'toggle-dark-mode',
    async () => {
      plugin.toggleDarkMode();
      ctx.showNotification('已切换深色/浅色模式', 'info');
    },
    {
      id: 'toggle-dark-mode',
      title: '切换深色模式',
      description: '在浅色和深色模式之间切换',
      icon: 'moon',
      shortcut: 'Ctrl+Shift+M',
      category: '主题',
    }
  );

  ctx.registerCommand(
    'reset-theme',
    async () => {
      plugin.resetTheme();
      ctx.showNotification('主题已重置为默认', 'info');
    },
    {
      id: 'reset-theme',
      title: '重置主题',
      description: '恢复到默认主题设置',
      icon: 'rotate-ccw',
      category: '主题',
    }
  );

  ctx.registerPanel('theme-manager', {
    id: 'theme-manager',
    title: '主题管理',
    icon: 'palette',
    component: 'ThemeManagerPanel',
    defaultPosition: 'right',
    defaultSize: 350,
  });

  ctx.showNotification('主题插件已激活', 'success');
}

export function deactivate(): void {
  console.log('[Theme Plugin] 已停用');
}
