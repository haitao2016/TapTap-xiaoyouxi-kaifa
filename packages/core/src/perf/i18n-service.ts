/**
 * 国际化 (i18n) 服务
 * - 多语言支持 (zh-CN, en-US, ja-JP)
 * - 命名空间管理 (common, editor, debug, build, settings, plugins, dashboard, collab, ai, platform)
 * - 延迟加载翻译资源
 * - 日期、数字、货币本地化
 * - 复数形式与性别变体
 * - 翻译缺失 fallback 与警告
 */
import { globalEventBus } from '../event-bus';
import type { Namespace } from './i18n/index';
import { NAMESPACES, defaultTranslations } from './i18n/index';

export type Locale = 'zh-CN' | 'en-US' | 'ja-JP' | 'zh-TW' | 'ko-KR';

export type TranslationKey = string;

export type TranslationDict = Record<TranslationKey, string>;

export type NamespaceTranslations = Partial<Record<Namespace, TranslationDict>>;

export type Translations = Record<Locale, NamespaceTranslations>;

export interface I18nConfig {
  defaultLocale: Locale;
  fallbackLocale: Locale;
  available: Locale[];
  defaultNS: Namespace;
  fallbackNS: Namespace;
  warnOnMissingKey: boolean;
  debug: boolean;
}

export type Gender = 'male' | 'female' | 'other';

const LOCALE_LABELS: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en-US': 'English',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
};

const LOCALE_CURRENCY: Record<Locale, string> = {
  'zh-CN': 'CNY',
  'zh-TW': 'TWD',
  'en-US': 'USD',
  'ja-JP': 'JPY',
  'ko-KR': 'KRW',
};

const DEFAULT_CONFIG: I18nConfig = {
  defaultLocale: 'zh-CN',
  fallbackLocale: 'en-US',
  available: ['zh-CN', 'en-US', 'ja-JP', 'zh-TW', 'ko-KR'],
  defaultNS: 'common',
  fallbackNS: 'common',
  warnOnMissingKey: true,
  debug: false,
};

const loadedNamespaces = new Set<string>();

const namespaceLoaders: Record<
  Locale,
  Partial<Record<Namespace, () => Promise<TranslationDict>>>
> = {
  'zh-CN': {
    common: () => import('./i18n/locales/zh-CN/common').then((m) => m.default as TranslationDict),
    editor: () => import('./i18n/locales/zh-CN/editor').then((m) => m.default as TranslationDict),
    debug: () => import('./i18n/locales/zh-CN/debug').then((m) => m.default as TranslationDict),
    build: () => import('./i18n/locales/zh-CN/build').then((m) => m.default as TranslationDict),
    settings: () =>
      import('./i18n/locales/zh-CN/settings').then((m) => m.default as TranslationDict),
    plugins: () => import('./i18n/locales/zh-CN/plugins').then((m) => m.default as TranslationDict),
    dashboard: () =>
      import('./i18n/locales/zh-CN/dashboard').then((m) => m.default as TranslationDict),
    collab: () => import('./i18n/locales/zh-CN/collab').then((m) => m.default as TranslationDict),
    ai: () => import('./i18n/locales/zh-CN/ai').then((m) => m.default as TranslationDict),
    platform: () =>
      import('./i18n/locales/zh-CN/platform').then((m) => m.default as TranslationDict),
  },
  'en-US': {
    common: () => import('./i18n/locales/en-US/common').then((m) => m.default as TranslationDict),
    editor: () => import('./i18n/locales/en-US/editor').then((m) => m.default as TranslationDict),
    debug: () => import('./i18n/locales/en-US/debug').then((m) => m.default as TranslationDict),
    build: () => import('./i18n/locales/en-US/build').then((m) => m.default as TranslationDict),
    settings: () =>
      import('./i18n/locales/en-US/settings').then((m) => m.default as TranslationDict),
    plugins: () => import('./i18n/locales/en-US/plugins').then((m) => m.default as TranslationDict),
    dashboard: () =>
      import('./i18n/locales/en-US/dashboard').then((m) => m.default as TranslationDict),
    collab: () => import('./i18n/locales/en-US/collab').then((m) => m.default as TranslationDict),
    ai: () => import('./i18n/locales/en-US/ai').then((m) => m.default as TranslationDict),
    platform: () =>
      import('./i18n/locales/en-US/platform').then((m) => m.default as TranslationDict),
  },
  'ja-JP': {
    common: () => import('./i18n/locales/ja-JP/common').then((m) => m.default as TranslationDict),
    editor: () => import('./i18n/locales/ja-JP/editor').then((m) => m.default as TranslationDict),
    debug: () => import('./i18n/locales/ja-JP/debug').then((m) => m.default as TranslationDict),
    build: () => import('./i18n/locales/ja-JP/build').then((m) => m.default as TranslationDict),
    settings: () =>
      import('./i18n/locales/ja-JP/settings').then((m) => m.default as TranslationDict),
    plugins: () => import('./i18n/locales/ja-JP/plugins').then((m) => m.default as TranslationDict),
    dashboard: () =>
      import('./i18n/locales/ja-JP/dashboard').then((m) => m.default as TranslationDict),
    collab: () => import('./i18n/locales/ja-JP/collab').then((m) => m.default as TranslationDict),
    ai: () => import('./i18n/locales/ja-JP/ai').then((m) => m.default as TranslationDict),
    platform: () =>
      import('./i18n/locales/ja-JP/platform').then((m) => m.default as TranslationDict),
  },
  'zh-TW': {},
  'ko-KR': {},
};

function buildInitialTranslations(): Translations {
  const translations: Translations = {} as Translations;
  for (const locale of DEFAULT_CONFIG.available) {
    translations[locale] = {};
  }
  translations['zh-CN'] = defaultTranslations as NamespaceTranslations;
  for (const ns of NAMESPACES) {
    loadedNamespaces.add(`zh-CN:${ns}`);
  }
  return translations;
}

export class I18nService {
  private config: I18nConfig = { ...DEFAULT_CONFIG };
  private currentLocale: Locale = DEFAULT_CONFIG.defaultLocale;
  private translations: Translations = buildInitialTranslations();
  private readonly listeners = new Set<(locale: Locale) => void>();
  private readonly missingKeys = new Set<string>();

  getCurrent(): Locale {
    return this.currentLocale;
  }

  getAvailable(): Locale[] {
    return [...this.config.available];
  }

  getLabel(locale: Locale): string {
    return LOCALE_LABELS[locale];
  }

  getNamespaces(): Namespace[] {
    return [...NAMESPACES];
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

  async loadNamespace(namespace: Namespace, locale?: Locale): Promise<void> {
    const targetLocale = locale ?? this.currentLocale;
    const key = `${targetLocale}:${namespace}`;
    if (loadedNamespaces.has(key)) return;

    const loader = namespaceLoaders[targetLocale]?.[namespace];
    if (!loader) {
      this.warn(`No loader found for namespace "${namespace}" in locale "${targetLocale}"`);
      return;
    }

    try {
      const dict = await loader();
      if (!this.translations[targetLocale]) {
        this.translations[targetLocale] = {};
      }
      this.translations[targetLocale][namespace] = dict;
      loadedNamespaces.add(key);
      if (this.config.debug) {
        console.log(`[i18n] Loaded namespace "${namespace}" for locale "${targetLocale}"`);
      }
    } catch (err) {
      this.error(`Failed to load namespace "${namespace}" for locale "${targetLocale}":`, err);
    }
  }

  async loadNamespaces(namespaces: Namespace[], locale?: Locale): Promise<void> {
    await Promise.all(namespaces.map((ns) => this.loadNamespace(ns, locale)));
  }

  async loadAllNamespaces(locale?: Locale): Promise<void> {
    await this.loadNamespaces(NAMESPACES, locale);
  }

  isNamespaceLoaded(namespace: Namespace, locale?: Locale): boolean {
    const targetLocale = locale ?? this.currentLocale;
    return loadedNamespaces.has(`${targetLocale}:${namespace}`);
  }

  registerTranslations(locale: Locale, namespace: Namespace, translations: TranslationDict): void {
    if (!this.translations[locale]) {
      this.translations[locale] = {};
    }
    this.translations[locale][namespace] = {
      ...this.translations[locale][namespace],
      ...translations,
    };
    loadedNamespaces.add(`${locale}:${namespace}`);
  }

  t(
    key: TranslationKey,
    params?: Record<string, string | number>,
    options?: { ns?: Namespace; locale?: Locale }
  ): string {
    const ns = options?.ns ?? this.config.defaultNS;
    const locale = options?.locale ?? this.currentLocale;
    const resolvedKey = key.includes(':') ? key : `${ns}:${key}`;
    const [namespace, actualKey] = this.parseKey(resolvedKey);

    const text =
      this.lookup(locale, namespace, actualKey) ??
      this.lookup(this.config.fallbackLocale, namespace, actualKey) ??
      this.lookup(this.config.defaultLocale, namespace, actualKey) ??
      this.lookup(this.config.defaultLocale, this.config.fallbackNS, actualKey) ??
      actualKey;

    if (text === actualKey && this.config.warnOnMissingKey) {
      this.warnMissingKey(resolvedKey, locale);
    }

    if (!params) return text;
    return this.interpolate(text, params);
  }

  private parseKey(key: string): [Namespace, string] {
    const parts = key.split(':');
    if (parts.length >= 2 && NAMESPACES.includes(parts[0] as Namespace)) {
      return [parts[0] as Namespace, parts.slice(1).join(':')];
    }
    return [this.config.defaultNS, key];
  }

  private lookup(locale: Locale, namespace: Namespace, key: string): string | undefined {
    const dict = this.translations[locale]?.[namespace];
    return dict?.[key];
  }

  private interpolate(text: string, params: Record<string, string | number>): string {
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      text
    );
  }

  private warnMissingKey(key: string, locale: Locale): void {
    if (this.missingKeys.has(key)) return;
    this.missingKeys.add(key);
    if (this.config.warnOnMissingKey) {
      console.warn(`[i18n] Missing translation key "${key}" for locale "${locale}"`);
    }
  }

  plural(
    key: TranslationKey,
    count: number,
    params?: Record<string, string | number>,
    options?: { ns?: Namespace; locale?: Locale }
  ): string {
    const ns = options?.ns ?? this.config.defaultNS;
    const locale = options?.locale ?? this.currentLocale;
    const resolvedKey = key.includes(':') ? key : `${ns}:${key}`;
    const [namespace, actualKey] = this.parseKey(resolvedKey);

    const baseText =
      this.lookup(locale, namespace, actualKey) ??
      this.lookup(this.config.fallbackLocale, namespace, actualKey) ??
      this.lookup(this.config.defaultLocale, namespace, actualKey) ??
      actualKey;

    const pluralIndex = this.getPluralIndex(locale, count);
    const pluralKey = `${actualKey}_${pluralIndex}`;
    const pluralText =
      this.lookup(locale, namespace, pluralKey) ??
      this.lookup(this.config.fallbackLocale, namespace, pluralKey) ??
      this.lookup(this.config.defaultLocale, namespace, pluralKey);

    const finalText = pluralText ?? baseText;
    return this.interpolate(finalText, { ...params, count });
  }

  private getPluralIndex(locale: Locale, count: number): number {
    switch (locale) {
      case 'zh-CN':
      case 'zh-TW':
      case 'ja-JP':
      case 'ko-KR':
        return 0;
      case 'en-US':
      default:
        return count === 1 ? 0 : 1;
    }
  }

  gender(
    key: TranslationKey,
    gender: Gender,
    params?: Record<string, string | number>,
    options?: { ns?: Namespace; locale?: Locale }
  ): string {
    const ns = options?.ns ?? this.config.defaultNS;
    const locale = options?.locale ?? this.currentLocale;
    const resolvedKey = key.includes(':') ? key : `${ns}:${key}`;
    const [namespace, actualKey] = this.parseKey(resolvedKey);

    const genderKey = `${actualKey}_${gender}`;
    const genderText =
      this.lookup(locale, namespace, genderKey) ??
      this.lookup(this.config.fallbackLocale, namespace, genderKey) ??
      this.lookup(this.config.defaultLocale, namespace, genderKey);

    const finalText = genderText ?? this.t(resolvedKey, undefined, { ns, locale });
    return this.interpolate(finalText, params ?? {});
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLocale, options).format(value);
  }

  formatCurrency(
    value: number,
    options?: {
      currency?: string;
      currencyDisplay?: 'symbol' | 'code' | 'name';
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    }
  ): string {
    const currency = options?.currency ?? LOCALE_CURRENCY[this.currentLocale] ?? 'USD';
    return new Intl.NumberFormat(this.currentLocale, {
      style: 'currency',
      currency,
      currencyDisplay: options?.currencyDisplay ?? 'symbol',
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits,
    }).format(value);
  }

  formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
  }

  formatRelative(date: Date | number): string {
    const target = typeof date === 'number' ? date : date.getTime();
    const diff = Date.now() - target;
    const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 365 * 24 * 3600_000],
      ['month', 30 * 24 * 3600_000],
      ['week', 7 * 24 * 3600_000],
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

  formatList(items: string[], options?: Intl.ListFormatOptions): string {
    return new Intl.ListFormat(this.currentLocale, options).format(items);
  }

  formatPlural(value: number, options?: Intl.PluralRulesOptions): Intl.LDMLPluralRule {
    return new Intl.PluralRules(this.currentLocale, options).select(value);
  }

  getCollator(options?: Intl.CollatorOptions): Intl.Collator {
    return new Intl.Collator(this.currentLocale, options);
  }

  getLocaleInfo(locale?: Locale): { label: string; currency: string; direction: 'ltr' | 'rtl' } {
    const targetLocale = locale ?? this.currentLocale;
    return {
      label: LOCALE_LABELS[targetLocale],
      currency: LOCALE_CURRENCY[targetLocale] ?? 'USD',
      direction: 'ltr',
    };
  }

  getMissingKeys(): string[] {
    return [...this.missingKeys];
  }

  clearMissingKeys(): void {
    this.missingKeys.clear();
  }

  onChange(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private warn(message: string): void {
    if (this.config.debug || this.config.warnOnMissingKey) {
      console.warn(`[i18n] ${message}`);
    }
  }

  private error(message: string, err?: unknown): void {
    console.error(`[i18n] ${message}`, err);
  }
}

export const i18nService = new I18nService();
export const i18n = i18nService;
