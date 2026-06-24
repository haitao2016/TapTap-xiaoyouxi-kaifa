/**
 * 国际化 (i18n) 服务
 * - 完整中英双语切换
 * - 时区、日期、数字本地化
 * - 文档多语言
 * - 复数形式处理
 */
import { globalEventBus } from '../event-bus';

export type Locale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR';

export type TranslationKey = string;

export type Translations = Record<Locale, Record<TranslationKey, string | string[]>>;

export interface I18nConfig {
  defaultLocale: Locale;
  fallbackLocale: Locale;
  available: Locale[];
}

const DEFAULT_TRANSLATIONS: Translations = {
  'zh-CN': {
    'app.title': 'TapDev Studio',
    'app.welcome': '欢迎使用',
    'menu.file': '文件',
    'menu.edit': '编辑',
    'menu.view': '视图',
    'menu.run': '运行',
    'menu.terminal': '终端',
    'menu.help': '帮助',
    'editor.open': '打开',
    'editor.save': '保存',
    'editor.saveAll': '全部保存',
    'editor.untitled': '未命名',
    'build.success': '构建成功',
    'build.failed': '构建失败',
    'debug.connect': '连接调试',
    'debug.disconnect': '断开',
    'plugin.install': '安装插件',
    'plugin.uninstall': '卸载',
    'settings.theme': '主题',
    'settings.language': '语言',
    'common.confirm': '确认',
    'common.cancel': '取消',
    'common.close': '关闭',
    'common.yes': '是',
    'common.no': '否',
  },
  'en-US': {
    'app.title': 'TapDev Studio',
    'app.welcome': 'Welcome',
    'menu.file': 'File',
    'menu.edit': 'Edit',
    'menu.view': 'View',
    'menu.run': 'Run',
    'menu.terminal': 'Terminal',
    'menu.help': 'Help',
    'editor.open': 'Open',
    'editor.save': 'Save',
    'editor.saveAll': 'Save All',
    'editor.untitled': 'Untitled',
    'build.success': 'Build succeeded',
    'build.failed': 'Build failed',
    'debug.connect': 'Connect Debugger',
    'debug.disconnect': 'Disconnect',
    'plugin.install': 'Install Plugin',
    'plugin.uninstall': 'Uninstall',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.yes': 'Yes',
    'common.no': 'No',
  },
  'zh-TW': {
    'app.title': 'TapDev Studio',
    'app.welcome': '歡迎使用',
    'menu.file': '檔案',
    'menu.edit': '編輯',
    'menu.view': '檢視',
    'menu.run': '執行',
    'menu.terminal': '終端機',
    'menu.help': '說明',
  },
  'ja-JP': {
    'app.title': 'TapDev Studio',
    'app.welcome': 'ようこそ',
    'menu.file': 'ファイル',
    'menu.edit': '編集',
    'menu.view': '表示',
    'menu.run': '実行',
    'menu.terminal': 'ターミナル',
    'menu.help': 'ヘルプ',
  },
  'ko-KR': {
    'app.title': 'TapDev Studio',
    'app.welcome': '환영합니다',
    'menu.file': '파일',
    'menu.edit': '편집',
    'menu.view': '보기',
    'menu.run': '실행',
    'menu.terminal': '터미널',
    'menu.help': '도움말',
  },
};

const LOCALE_LABELS: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en-US': 'English',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
};

export class I18nService {
  private config: I18nConfig = {
    defaultLocale: 'zh-CN',
    fallbackLocale: 'en-US',
    available: ['zh-CN', 'en-US', 'zh-TW', 'ja-JP', 'ko-KR'],
  };
  private currentLocale: Locale = 'zh-CN';
  private translations: Translations = DEFAULT_TRANSLATIONS;
  private readonly listeners = new Set<(locale: Locale) => void>();

  getCurrent(): Locale {
    return this.currentLocale;
  }

  getAvailable(): Locale[] {
    return [...this.config.available];
  }

  getLabel(locale: Locale): string {
    return LOCALE_LABELS[locale];
  }

  configure(config: Partial<I18nConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setLocale(locale: Locale): void {
    if (!this.config.available.includes(locale)) return;
    this.currentLocale = locale;
    for (const l of this.listeners) l(locale);
    globalEventBus.emit({ type: 'i18n:change', payload: locale });
  }

  /**
   * 注册翻译
   */
  registerTranslations(translations: Partial<Translations>): void {
    for (const [locale, dict] of Object.entries(translations)) {
      this.translations[locale as Locale] = {
        ...this.translations[locale as Locale],
        ...dict,
      };
    }
  }

  /**
   * 翻译键
   */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const text = this.lookup(this.currentLocale, key)
      ?? this.lookup(this.config.fallbackLocale, key)
      ?? this.lookup(this.config.defaultLocale, key)
      ?? key;
    if (!params) return text;
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      text,
    );
  }

  /**
   * 复数形式（英文等需要）
   */
  plural(key: TranslationKey, count: number, params?: Record<string, string | number>): string {
    const entries = this.translations[this.currentLocale]?.[key];
    const list = Array.isArray(entries) ? entries : [entries ?? key];
    const idx = count === 1 ? 0 : 1;
    const text = list[Math.min(idx, list.length - 1)] ?? key;
    return this.t(text, { ...params, count });
  }

  /**
   * 数字本地化
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLocale, options).format(value);
  }

  /**
   * 日期本地化
   */
  formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
  }

  /**
   * 相对时间（如"3 小时前"）
   */
  formatRelative(date: Date | number): string {
    const target = typeof date === 'number' ? date : date.getTime();
    const diff = Date.now() - target;
    const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 365 * 24 * 3600_000],
      ['month', 30 * 24 * 3600_000],
      ['day', 24 * 3600_000],
      ['hour', 3600_000],
      ['minute', 60_000],
      ['second', 1000],
    ];
    for (const [unit, ms] of units) {
      if (Math.abs(diff) >= ms) {
        return rtf.format(-Math.round(diff / ms), unit);
      }
    }
    return rtf.format(0, 'second');
  }

  /**
   * 订阅语言变化
   */
  onChange(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private lookup(locale: Locale, key: TranslationKey): string | undefined {
    const text = this.translations[locale]?.[key];
    return Array.isArray(text) ? text[0] : text;
  }
}

export const i18n = new I18nService();
