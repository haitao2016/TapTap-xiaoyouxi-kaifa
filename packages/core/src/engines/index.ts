/**
 * 引擎注册中心
 * 统一管理和调度各引擎适配器
 */
import { html5Adapter2D } from './html5-2d-adapter';
import { html5Adapter3D } from './html5-3d-adapter';
import { cocosAdapter } from './cocos-adapter';
import type { EngineType } from '@tapdev/types';

export interface EngineAdapter {
  detect(projectPath: string): boolean;
  getSupportedTemplates?(): string[];
}

export const engineRegistry = {
  'native-js-2d': html5Adapter2D,
  'native-js-3d': html5Adapter3D,
  cocos: cocosAdapter,
} as const;

export type RegisteredEngine = keyof typeof engineRegistry;

/**
 * 自动检测项目引擎类型
 */
export function detectProjectEngine(projectPath: string): RegisteredEngine | null {
  if (engineRegistry.cocos.detect(projectPath)) return 'cocos';
  if (engineRegistry['native-js-3d'].detect(projectPath)) return 'native-js-3d';
  if (engineRegistry['native-js-2d'].detect(projectPath)) return 'native-js-2d';
  return null;
}

/**
 * 获取所有可用引擎的模板
 */
export function listAllTemplates(): Record<RegisteredEngine, string[]> {
  return {
    'native-js-2d': html5Adapter2D.getSupportedTemplates(),
    'native-js-3d': html5Adapter3D.getSupportedTemplates(),
    cocos: [],
  };
}

export { html5Adapter2D, html5Adapter3D, cocosAdapter };
