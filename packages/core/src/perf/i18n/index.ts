export type Namespace =
  | 'common'
  | 'editor'
  | 'debug'
  | 'build'
  | 'settings'
  | 'plugins'
  | 'dashboard'
  | 'collab'
  | 'ai'
  | 'platform';

export const NAMESPACES: Namespace[] = [
  'common',
  'editor',
  'debug',
  'build',
  'settings',
  'plugins',
  'dashboard',
  'collab',
  'ai',
  'platform',
];

import common from './locales/zh-CN/common';
import editor from './locales/zh-CN/editor';
import debug from './locales/zh-CN/debug';
import build from './locales/zh-CN/build';
import settings from './locales/zh-CN/settings';
import plugins from './locales/zh-CN/plugins';
import dashboard from './locales/zh-CN/dashboard';
import collab from './locales/zh-CN/collab';
import ai from './locales/zh-CN/ai';
import platform from './locales/zh-CN/platform';

export const defaultTranslations = {
  common,
  editor,
  debug,
  build,
  settings,
  plugins,
  dashboard,
  collab,
  ai,
  platform,
};

export type TranslationDict = Record<string, string>;
export type NamespaceTranslations = Record<Namespace, TranslationDict>;
