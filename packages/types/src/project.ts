/** 平台类型 */
export type Platform = 'pc' | 'mobile' | 'tablet';

/** 项目引擎类型 */
export type EngineType = 'unity' | 'cocos' | 'laya' | 'native-js' | 'custom';

/** 项目状态 */
export type ProjectStatus = 'idle' | 'building' | 'debugging' | 'running' | 'error';

/** TapTap 小游戏项目配置 */
export interface TapProjectConfig {
  id: string;
  name: string;
  description?: string;
  engine: EngineType;
  unityVersion?: string;
  appId?: string;
  clientId?: string;
  buildPath: string;
  cdnUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** 项目元数据 */
export interface ProjectMeta {
  config: TapProjectConfig;
  path: string;
  status: ProjectStatus;
  lastOpenedAt?: string;
}

/** 编辑器文件节点 */
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
}

/** 打开的文件标签 */
export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
  cursorPosition?: { line: number; column: number };
}
