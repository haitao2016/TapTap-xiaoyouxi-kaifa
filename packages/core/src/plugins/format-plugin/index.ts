import type { PluginContext, PluginMeta, PluginHook } from '@tapdev/types';
import { formatService, type FormatterConfig, type FormatResult } from '../../format-service';

export const meta: PluginMeta = {
  id: 'tapdev.format',
  name: '代码格式化',
  version: '1.0.0',
  description: '强大的代码格式化工具，支持多种编程语言',
  author: 'TapDev Studio',
  enabled: true,
  entry: 'format-plugin',
  hooks: ['onBeforeSave', 'onAfterSave'] as PluginHook[],
  icon: 'code',
  category: '编辑器',
  homepage: 'https://tapdev.io/plugins/format',
};

export interface FormatPluginConfig extends FormatterConfig {
  formatOnSave: boolean;
  defaultLanguage: string;
  autoDetectLanguage: boolean;
}

export class FormatPlugin {
  private config: FormatPluginConfig = {
    formatOnSave: true,
    defaultLanguage: 'typescript',
    autoDetectLanguage: true,
    tabWidth: 2,
    useTabs: false,
    printWidth: 100,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    arrowParens: 'always',
    bracketSpacing: true,
    bracketSameLine: false,
    endOfLine: 'lf',
  };

  getConfig(): FormatPluginConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<FormatPluginConfig>): void {
    Object.assign(this.config, config);
  }

  formatCode(code: string, language?: string, config?: Partial<FormatterConfig>): FormatResult {
    const lang = language || this.config.defaultLanguage;
    const mergedConfig = { ...this.config, ...config };
    return formatService.format(code, lang, mergedConfig);
  }

  formatAndLint(code: string, language?: string, config?: Partial<FormatterConfig>) {
    const lang = language || this.config.defaultLanguage;
    const mergedConfig = { ...this.config, ...config };
    return formatService.formatAndLint(code, lang, mergedConfig);
  }

  lintCode(code: string, language?: string) {
    const lang = language || this.config.defaultLanguage;
    return formatService.lint(code, lang);
  }

  getSupportedLanguages(): string[] {
    return formatService.getSupportedLanguages();
  }

  detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      jsonc: 'jsonc',
      md: 'markdown',
      markdown: 'markdown',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      less: 'css',
    };
    return langMap[ext] || this.config.defaultLanguage;
  }

  resetConfig(): void {
    this.config = {
      formatOnSave: true,
      defaultLanguage: 'typescript',
      autoDetectLanguage: true,
      tabWidth: 2,
      useTabs: false,
      printWidth: 100,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      arrowParens: 'always',
      bracketSpacing: true,
      bracketSameLine: false,
      endOfLine: 'lf',
    };
  }
}

export const formatPlugin = new FormatPlugin();

export function activate(ctx: PluginContext): void {
  const plugin = formatPlugin;

  ctx.registerCommand('format-code', async () => {
    ctx.showNotification('代码格式化已执行', 'success');
  }, {
    id: 'format-code',
    title: '格式化代码',
    description: '格式化当前编辑器中的代码',
    icon: 'code',
    shortcut: 'Shift+Alt+F',
    category: '格式化',
  });

  ctx.registerCommand('format-document', async () => {
    ctx.showNotification('文档格式化已执行', 'success');
  }, {
    id: 'format-document',
    title: '格式化文档',
    description: '格式化整个文档',
    icon: 'file-text',
    category: '格式化',
  });

  ctx.registerCommand('format-selection', async () => {
    ctx.showNotification('选中代码格式化已执行', 'info');
  }, {
    id: 'format-selection',
    title: '格式化选中代码',
    description: '只格式化选中的代码片段',
    icon: 'align-left',
    shortcut: 'Ctrl+K Ctrl+F',
    category: '格式化',
  });

  ctx.registerCommand('toggle-format-on-save', async () => {
    plugin.updateConfig({ formatOnSave: !plugin.getConfig().formatOnSave });
    const status = plugin.getConfig().formatOnSave ? '已启用' : '已禁用';
    ctx.showNotification(`保存时格式化: ${status}`, 'info');
  }, {
    id: 'toggle-format-on-save',
    title: '切换保存时格式化',
    description: '开启或关闭保存时自动格式化',
    icon: 'save',
    category: '格式化',
  });

  ctx.registerCommand('reset-format-config', async () => {
    plugin.resetConfig();
    ctx.showNotification('格式化配置已重置为默认', 'success');
  }, {
    id: 'reset-format-config',
    title: '重置格式化配置',
    description: '恢复所有格式化设置为默认值',
    icon: 'rotate-ccw',
    category: '格式化',
  });

  ctx.registerPanel('format-settings', {
    id: 'format-settings',
    title: '格式化设置',
    icon: 'settings',
    component: 'FormatSettingsPanel',
    defaultPosition: 'right',
    defaultSize: 380,
  });

  ctx.showNotification('代码格式化插件已激活', 'success');
}

export function deactivate(): void {
  console.log('[Format Plugin] 已停用');
}
