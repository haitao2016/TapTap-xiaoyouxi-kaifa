import type {
  TapProjectConfig,
  ProjectMeta,
  EngineType,
  FileNode,
  AppSettings,
} from '@tapdev/types';
import { globalEventBus } from './event-bus';
import { templateService } from './template-service';
import type { VirtualFile } from './template-service';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  renameSync,
  statSync,
  readdirSync,
  copyFileSync,
  watch,
  FSWatcher,
} from 'node:fs';
import { join, resolve, relative, basename, extname, dirname } from 'node:path';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'zh-CN',
  editorFontSize: 14,
  editorTabSize: 2,
  autoSave: true,
  autoSaveDelay: 1000,
  debugServerPort: 8081,
  buildOutputPath: './dist',
  unityPath: undefined,
  recentProjects: [],
  enabledPlugins: [],
  formatOnSave: true,
  formatOnPaste: false,
  editorLineWidth: 100,
  defaultCompress: true,
  defaultWasmSplit: true,
  buildNotification: true,
  maxBuildHistory: 20,
  defaultBuildPath: '',
  debugBreakOnStart: false,
  debugBreakOnException: true,
  debugInlineValues: true,
  maxLogLines: 1000,
  logTimestamps: true,
  autoScrollLog: true,
};

export interface ProjectTemplate {
  id: string;
  name: string;
  engine: EngineType;
  description: string;
  icon?: string;
}

const DEFAULT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'default',
    name: '默认空白项目',
    engine: 'native-js',
    description: '从零开始的 TapTap 小游戏项目',
    icon: 'file',
  },
  {
    id: 'html5-2d-canvas',
    name: 'HTML5 2D Canvas 模板',
    engine: 'native-js',
    description: '基于 Canvas 2D 的小游戏模板',
    icon: 'grid',
  },
  {
    id: 'html5-3d-threejs',
    name: 'HTML5 3D Three.js 模板',
    engine: 'native-js',
    description: 'Three.js 3D 渲染模板',
    icon: 'box',
  },
  {
    id: 'unity-webgl',
    name: 'Unity WebGL 模板',
    engine: 'unity',
    description: 'Unity 引擎构建的 WebGL 小游戏',
    icon: 'cube',
  },
  {
    id: 'cocos-creator',
    name: 'Cocos Creator 模板',
    engine: 'cocos',
    description: 'Cocos Creator 跨端小游戏模板',
    icon: 'layers',
  },
];

export interface FlatProject {
  id: string;
  name: string;
  path: string;
  template: string;
  description: string;
  version: string;
  targetPlatform: string[];
  createdAt: string;
  updatedAt: string;
  favorite?: boolean;
  group?: string;
  lastOpenedAt?: string;
}

export type EnvironmentType = 'development' | 'testing' | 'production';

export interface ProjectEnvironmentConfig {
  apiBaseUrl?: string;
  debugMode?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  buildOptions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ValidatedConfig<T = unknown> {
  valid: boolean;
  errors: string[];
  data?: T;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
  theme: string;
}

export interface BuildSettings {
  outputPath: string;
  sourceMap: boolean;
  minify: boolean;
  treeShaking: boolean;
  targetPlatforms: string[];
  buildCommand: string;
  devCommand: string;
  environment: EnvironmentType;
}

export interface DebugSettings {
  port: number;
  host: string;
  autoAttach: boolean;
  breakOnError: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sourceMaps: boolean;
}

export interface PluginSettings {
  enabled: string[];
  disabled: string[];
  configs: Record<string, Record<string, unknown>>;
  autoUpdate: boolean;
}

export interface ProjectSettings {
  editor: EditorSettings;
  build: BuildSettings;
  debug: DebugSettings;
  plugins: PluginSettings;
}

export interface FileSearchOptions {
  query: string;
  searchContent?: boolean;
  fileExtensions?: string[];
  maxResults?: number;
  ignorePatterns?: string[];
}

export interface FileSearchResult {
  path: string;
  name: string;
  type: 'file' | 'directory';
  matches?: { line: number; column: number; content: string }[];
}

export interface FileWatchEvent {
  type: 'create' | 'update' | 'delete' | 'rename';
  path: string;
  timestamp: number;
}

type FileWatchCallback = (event: FileWatchEvent) => void;

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  lineNumbers: true,
  wordWrap: false,
  autoSave: true,
  autoSaveDelay: 1000,
  formatOnSave: true,
  theme: 'dark',
};

const DEFAULT_BUILD_SETTINGS: BuildSettings = {
  outputPath: './dist',
  sourceMap: true,
  minify: false,
  treeShaking: true,
  targetPlatforms: ['webgl', 'mobile-web', 'pc-web'],
  buildCommand: 'npm run build',
  devCommand: 'npm run dev',
  environment: 'development',
};

const DEFAULT_DEBUG_SETTINGS: DebugSettings = {
  port: 8081,
  host: 'localhost',
  autoAttach: true,
  breakOnError: false,
  logLevel: 'info',
  sourceMaps: true,
};

const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
  enabled: [],
  disabled: [],
  configs: {},
  autoUpdate: true,
};

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  editor: { ...DEFAULT_EDITOR_SETTINGS },
  build: { ...DEFAULT_BUILD_SETTINGS },
  debug: { ...DEFAULT_DEBUG_SETTINGS },
  plugins: { ...DEFAULT_PLUGIN_SETTINGS },
};

const CONFIG_SCHEMA = {
  required: ['id', 'name', 'engine', 'buildPath', 'createdAt', 'updatedAt'],
  types: {
    id: 'string',
    name: 'string',
    description: 'string',
    engine: 'string',
    unityVersion: 'string',
    appId: 'string',
    clientId: 'string',
    buildPath: 'string',
    cdnUrl: 'string',
    createdAt: 'string',
    updatedAt: 'string',
  },
} as const;

const RECENT_PROJECTS_STORAGE_KEY = 'tapdev:recent-projects';
const MAX_RECENT_PROJECTS = 20;

export class ProjectManager {
  private currentProject: ProjectMeta | null = null;
  projects = new Map<string, FlatProject>();
  currentProjectId: string | null = null;
  recentProjects: FlatProject[] = [];
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private projectSettings = new Map<string, ProjectSettings>();
  private environmentConfigs = new Map<string, Record<EnvironmentType, ProjectEnvironmentConfig>>();
  private fileWatchers = new Map<
    string,
    { watcher: FSWatcher; callbacks: Set<FileWatchCallback> }
  >();
  private fileContentCache = new Map<string, { content: string; mtime: number }>();

  getCurrentProject(): (ProjectMeta & { id: string }) | null {
    if (!this.currentProjectId) return null;
    const flat = this.projects.get(this.currentProjectId);
    if (!flat) {
      this.currentProject = null;
      return null;
    }
    const meta = this.toMeta(flat);
    this.currentProject = meta;
    return { ...meta, id: flat.id };
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettingsToStorage();
    globalEventBus.emit({ type: 'settings:change', payload: partial });
  }

  createProject(options: {
    name: string;
    path: string;
    template?: string;
    engine?: EngineType;
    description?: string;
    unityVersion?: string;
    onProgress?: (progress: number, stage: string) => void;
  }): ProjectMeta & FlatProject {
    const now = new Date().toISOString();
    const tplMeta = DEFAULT_TEMPLATES.find((t) => t.id === options.template);
    const engine: EngineType = options.engine ?? tplMeta?.engine ?? 'native-js';

    const project: FlatProject = {
      id: randomUUID(),
      name: options.name,
      path: options.path,
      template: options.template ?? 'default',
      description: options.description ?? '',
      version: '0.1.0',
      targetPlatform: ['webgl', 'mobile-web', 'pc-web'],
      createdAt: now,
      updatedAt: now,
      favorite: false,
      lastOpenedAt: now,
    };

    if (options.unityVersion) {
      project.template = `${options.template ?? 'default'}#${options.unityVersion}`;
    }

    this.projects.set(project.id, project);
    this.addRecentProject(project);
    (project as FlatProject & { __engine?: EngineType }).__engine = engine;

    this.ensureProjectDirectory(project.path);
    this.createProjectConfig(project, engine);
    this.initializeProjectSettings(project.id);
    this.initializeEnvironmentConfigs(project.id);

    if (options.onProgress) {
      options.onProgress(20, '项目目录已创建');
    }

    void this.createFromTemplate(project, options.template, options.onProgress);

    const meta = this.toMeta(project);
    return { ...meta, ...project };
  }

  async createProjectAsync(options: {
    name: string;
    path: string;
    template?: string;
    engine?: EngineType;
    description?: string;
    unityVersion?: string;
    onProgress?: (progress: number, stage: string) => void;
  }): Promise<ProjectMeta & { id: string }> {
    const meta = this.createProject(options);
    const flat = [...this.projects.values()].find((p) => p.name === options.name);
    if (!flat) {
      throw new Error('项目创建失败');
    }
    return { ...meta, id: flat.id };
  }

  private async createFromTemplate(
    project: FlatProject,
    templateId?: string,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    if (!templateId || templateId === 'default') {
      this.createDefaultProjectStructure(project.path);
      if (onProgress) onProgress(60, '默认项目结构已创建');
      if (onProgress) onProgress(80, '正在安装依赖...');
      await this.simulateDependencyInstallation(project.path);
      if (onProgress) onProgress(100, '项目创建完成');
      return;
    }

    const templateMap: Record<string, string> = {
      'html5-2d-canvas': 'tapdev-empty-project',
      'html5-3d-threejs': 'tapdev-threejs-game',
      'unity-webgl': 'tapdev-cocos-creator',
      'cocos-creator': 'tapdev-cocos-creator',
    };

    const serviceTemplateId = templateMap[templateId] || 'tapdev-empty-project';

    try {
      if (onProgress) onProgress(30, '正在加载模板...');

      const result = await templateService.createProject({
        templateId: serviceTemplateId,
        projectName: project.name,
        onProgress: (p: number, stage: string) => {
          if (onProgress) onProgress(30 + p * 0.5, stage);
        },
      });

      if (result.files) {
        this.writeVirtualFiles(project.path, result.files);
      }

      if (onProgress) onProgress(80, '正在安装依赖...');
      await this.simulateDependencyInstallation(project.path);
      if (onProgress) onProgress(100, '项目创建完成');
    } catch {
      this.createDefaultProjectStructure(project.path);
      if (onProgress) onProgress(100, '项目创建完成（使用默认结构）');
    }
  }

  private writeVirtualFiles(basePath: string, files: VirtualFile[]): void {
    for (const file of files) {
      const fullPath = join(basePath, file.path);
      if (file.type === 'directory') {
        this.ensureDirectory(fullPath);
        if (file.children) {
          this.writeVirtualFiles(basePath, file.children);
        }
      } else {
        this.ensureDirectory(dirname(fullPath));
        writeFileSync(fullPath, file.content || '', 'utf-8');
      }
    }
  }

  private createDefaultProjectStructure(projectPath: string): void {
    const dirs = ['src', 'src/assets', 'public', 'tests'];
    for (const dir of dirs) {
      this.ensureDirectory(join(projectPath, dir));
    }

    const files: Record<string, string> = {
      'package.json': JSON.stringify(
        {
          name: basename(projectPath).toLowerCase().replace(/\s+/g, '-'),
          version: '0.1.0',
          private: true,
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
            test: 'jest',
          },
          devDependencies: {
            typescript: '^5.0.0',
            vite: '^5.0.0',
          },
        },
        null,
        2
      ),
      'tsconfig.json': JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            moduleResolution: 'bundler',
            strict: true,
            sourceMap: true,
            resolveJsonModule: true,
            esModuleInterop: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            skipLibCheck: true,
            outDir: 'dist',
          },
          include: ['src/**/*.ts', 'src/**/*.d.ts'],
        },
        null,
        2
      ),
      'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${basename(projectPath)}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`,
      'src/main.ts': `console.log('项目已启动');

const app = document.querySelector('#app');
if (app) {
  app.innerHTML = '<h1>Hello TapDev</h1>';
}
`,
      'README.md': `# ${basename(projectPath)}

## 开始使用

\`\`\`bash
npm install
npm run dev
\`\`\`

## 构建

\`\`\`bash
npm run build
\`\`\`
`,
      '.gitignore': `node_modules
dist
dist-ssr
*.local
.env
.env.*
!.env.example
*.log
.DS_Store
`,
    };

    for (const [filePath, content] of Object.entries(files)) {
      writeFileSync(join(projectPath, filePath), content, 'utf-8');
    }
  }

  private async simulateDependencyInstallation(projectPath: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  openProject(path: string): Promise<ProjectMeta | null> {
    return new Promise((resolve) => {
      const existing = [...this.projects.values()].find((p) => p.path === path);
      if (existing) {
        existing.updatedAt = new Date().toISOString();
        existing.lastOpenedAt = new Date().toISOString();
        this.currentProjectId = existing.id;
        this.currentProject = this.toMeta(existing);
        this.touchRecent(existing);
        this.loadProjectSettings(existing.id);
        this.loadEnvironmentConfigs(existing.id);
        globalEventBus.emit({ type: 'project:open', payload: this.currentProject });
        resolve(this.currentProject);
        return;
      }
      if (!path || !existsSync(path)) {
        resolve(null);
        return;
      }

      const now = new Date().toISOString();
      const newFlat: FlatProject = {
        id: randomUUID(),
        name: path.split(/[/\\]/).pop() ?? 'Untitled',
        path,
        template: 'default',
        description: '',
        version: '0.1.0',
        targetPlatform: ['webgl', 'mobile-web', 'pc-web'],
        createdAt: now,
        updatedAt: now,
        favorite: false,
        lastOpenedAt: now,
      };
      (newFlat as FlatProject & { __engine?: EngineType }).__engine = 'unity';
      this.projects.set(newFlat.id, newFlat);
      this.currentProjectId = newFlat.id;
      this.currentProject = this.toMeta(newFlat);
      this.addRecentProject(newFlat);
      this.initializeProjectSettings(newFlat.id);
      this.initializeEnvironmentConfigs(newFlat.id);
      globalEventBus.emit({ type: 'project:open', payload: this.currentProject });
      resolve(this.currentProject);
    });
  }

  closeProject(): void {
    if (!this.currentProjectId) return;
    const projectId = this.currentProjectId;
    this.stopWatchingAll(projectId);
    this.currentProject = null;
    this.currentProjectId = null;
    this.fileContentCache.clear();
    globalEventBus.emit({ type: 'project:close', payload: { projectId } });
  }

  saveProject(): void {
    if (!this.currentProjectId) return;
    const flat = this.projects.get(this.currentProjectId);
    if (flat) {
      flat.updatedAt = new Date().toISOString();
      this.saveProjectConfig(flat);
      this.saveProjectSettings(this.currentProjectId);
    }
    globalEventBus.emit({
      type: 'project:save',
      payload: { projectId: this.currentProjectId },
    });
  }

  getProject(id: string): FlatProject | null {
    return this.projects.get(id) ?? null;
  }

  getAllProjects(): FlatProject[] {
    return [...this.projects.values()];
  }

  updateProject(id: string, partial: Partial<FlatProject>): FlatProject | null {
    const project = this.projects.get(id);
    if (!project) return null;
    const updated: FlatProject = {
      ...project,
      ...partial,
      id: project.id,
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, updated);
    if (this.currentProjectId === id) {
      this.currentProject = this.toMeta(updated);
    }
    const idx = this.recentProjects.findIndex((p) => p.id === id);
    if (idx >= 0) this.recentProjects[idx] = updated;
    this.saveRecentProjectsToStorage();
    return updated;
  }

  deleteProject(id: string, deleteFromDisk = false): boolean {
    const project = this.projects.get(id);
    if (!project) return false;

    if (deleteFromDisk && existsSync(project.path)) {
      try {
        rmSync(project.path, { recursive: true, force: true });
      } catch {
        // 忽略删除错误
      }
    }

    this.stopWatchingAll(id);
    this.projects.delete(id);
    this.projectSettings.delete(id);
    this.environmentConfigs.delete(id);

    if (this.currentProjectId === id) {
      this.currentProjectId = null;
      this.currentProject = null;
    }
    this.recentProjects = this.recentProjects.filter((p) => p.id !== id);
    this.saveRecentProjectsToStorage();
    return true;
  }

  setCurrentProject(id: string | null): void {
    if (id === null) {
      this.currentProjectId = null;
      this.currentProject = null;
      return;
    }
    this.currentProjectId = id;
    const flat = this.projects.get(id);
    if (flat) {
      flat.updatedAt = new Date().toISOString();
      flat.lastOpenedAt = new Date().toISOString();
      this.currentProject = this.toMeta(flat);
      this.touchRecent(flat);
    }
  }

  async importProject(data: { name: string; path: string }): Promise<ProjectMeta | null> {
    if (!data.name || !data.path) return null;
    if (!existsSync(data.path)) return null;

    const existing = [...this.projects.values()].find((p) => p.path === data.path);
    if (existing) {
      this.currentProjectId = existing.id;
      this.currentProject = this.toMeta(existing);
      this.touchRecent(existing);
      return this.toMeta(existing);
    }

    return this.createProject({
      name: data.name,
      path: data.path,
      template: 'default',
    });
  }

  exportProject(id: string): Record<string, unknown> | null {
    const project = this.projects.get(id);
    if (!project) return null;
    return { ...project };
  }

  getRecentProjects(): FlatProject[] {
    return [...this.projects.values()]
      .sort((a, b) => {
        const aTime = new Date(a.lastOpenedAt || a.updatedAt).getTime();
        const bTime = new Date(b.lastOpenedAt || b.updatedAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 10);
  }

  clearRecentProjects(): void {
    this.recentProjects = [];
    this.projects.clear();
    this.projectSettings.clear();
    this.environmentConfigs.clear();
    this.saveRecentProjectsToStorage();
  }

  getTemplates(): ProjectTemplate[] {
    return [...DEFAULT_TEMPLATES];
  }

  searchProjects(query: string): FlatProject[] {
    if (!query) return [];
    const lower = query.toLowerCase();
    return [...this.projects.values()].filter(
      (p) => p.name.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower)
    );
  }

  getFileTree(projectPath: string): FileNode[] {
    if (!existsSync(projectPath)) {
      return this.getDefaultFileTree();
    }
    try {
      return this.buildFileTree(projectPath, projectPath);
    } catch {
      return this.getDefaultFileTree();
    }
  }

  private buildFileTree(rootPath: string, currentPath: string): FileNode[] {
    const nodes: FileNode[] = [];
    const entries = readdirSync(currentPath, { withFileTypes: true });

    const ignoreDirs = new Set([
      'node_modules',
      '.git',
      'dist',
      'build',
      '.cache',
      '.vscode',
      '.idea',
    ]);

    const ignoreFiles = new Set(['.DS_Store', 'Thumbs.db']);

    for (const entry of entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })) {
      if (entry.isDirectory() && ignoreDirs.has(entry.name)) continue;
      if (entry.isFile() && ignoreFiles.has(entry.name)) continue;

      const fullPath = join(currentPath, entry.name);
      const relativePath = relative(rootPath, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        let children: FileNode[] = [];
        try {
          children = this.buildFileTree(rootPath, fullPath);
        } catch {
          // 忽略无法读取的目录
        }
        nodes.push({
          name: entry.name,
          path: relativePath || entry.name,
          type: 'directory',
          children,
        });
      } else {
        nodes.push({
          name: entry.name,
          path: relativePath || entry.name,
          type: 'file',
          extension: extname(entry.name).slice(1).toLowerCase() || undefined,
        });
      }
    }

    return nodes;
  }

  private getDefaultFileTree(): FileNode[] {
    return [
      {
        name: 'Assets',
        path: 'Assets',
        type: 'directory',
        children: [
          { name: 'Scripts', path: 'Assets/Scripts', type: 'directory', children: [] },
          { name: 'Scenes', path: 'Assets/Scenes', type: 'directory', children: [] },
          { name: 'Resources', path: 'Assets/Resources', type: 'directory', children: [] },
        ],
      },
      {
        name: 'ProjectSettings',
        path: 'ProjectSettings',
        type: 'directory',
        children: [
          {
            name: 'ProjectSettings.asset',
            path: 'ProjectSettings/ProjectSettings.asset',
            type: 'file',
            extension: 'asset',
          },
        ],
      },
      {
        name: 'tapdev.config.json',
        path: 'tapdev.config.json',
        type: 'file',
        extension: 'json',
      },
    ];
  }

  readFile(filePath: string, projectPath?: string): string {
    const fullPath = projectPath ? join(projectPath, filePath) : filePath;
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const stat = statSync(fullPath);
      this.fileContentCache.set(fullPath, {
        content,
        mtime: stat.mtime.getTime(),
      });
      return content;
    } catch (error) {
      throw new Error(`无法读取文件: ${fullPath}`);
    }
  }

  writeFile(filePath: string, content: string, projectPath?: string): void {
    const fullPath = projectPath ? join(projectPath, filePath) : filePath;
    try {
      this.ensureDirectory(dirname(fullPath));
      writeFileSync(fullPath, content, 'utf-8');
      this.fileContentCache.set(fullPath, {
        content,
        mtime: Date.now(),
      });
    } catch (error) {
      throw new Error(`无法写入文件: ${fullPath}`);
    }
  }

  createFile(filePath: string, content = '', projectPath?: string): boolean {
    const fullPath = projectPath ? join(projectPath, filePath) : filePath;
    if (existsSync(fullPath)) return false;
    try {
      this.ensureDirectory(dirname(fullPath));
      writeFileSync(fullPath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  createDirectory(dirPath: string, projectPath?: string): boolean {
    const fullPath = projectPath ? join(projectPath, dirPath) : dirPath;
    try {
      mkdirSync(fullPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  deleteFile(filePath: string, projectPath?: string): boolean {
    const fullPath = projectPath ? join(projectPath, filePath) : filePath;
    try {
      rmSync(fullPath, { recursive: true, force: true });
      this.fileContentCache.delete(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  renameFile(oldPath: string, newPath: string, projectPath?: string): boolean {
    const oldFullPath = projectPath ? join(projectPath, oldPath) : oldPath;
    const newFullPath = projectPath ? join(projectPath, newPath) : newPath;
    try {
      if (!existsSync(oldFullPath)) return false;
      this.ensureDirectory(dirname(newFullPath));
      renameSync(oldFullPath, newFullPath);
      this.fileContentCache.delete(oldFullPath);
      return true;
    } catch {
      return false;
    }
  }

  moveFile(sourcePath: string, targetPath: string, projectPath?: string): boolean {
    return this.renameFile(sourcePath, targetPath, projectPath);
  }

  copyFile(sourcePath: string, targetPath: string, projectPath?: string): boolean {
    const sourceFullPath = projectPath ? join(projectPath, sourcePath) : sourcePath;
    const targetFullPath = projectPath ? join(projectPath, targetPath) : targetPath;
    try {
      if (!existsSync(sourceFullPath)) return false;
      this.ensureDirectory(dirname(targetFullPath));
      copyFileSync(sourceFullPath, targetFullPath);
      return true;
    } catch {
      return false;
    }
  }

  fileExists(filePath: string, projectPath?: string): boolean {
    const fullPath = projectPath ? join(projectPath, filePath) : filePath;
    return existsSync(fullPath);
  }

  getFileStats(
    filePath: string,
    projectPath?: string
  ): {
    size: number;
    mtime: number;
    isDirectory: boolean;
  } | null {
    const fullPath = projectPath ? join(projectPath, filePath) : filePath;
    try {
      const stat = statSync(fullPath);
      return {
        size: stat.size,
        mtime: stat.mtime.getTime(),
        isDirectory: stat.isDirectory(),
      };
    } catch {
      return null;
    }
  }

  searchFiles(searchPath: string, options: FileSearchOptions): FileSearchResult[] {
    const results: FileSearchResult[] = [];
    const maxResults = options.maxResults || 100;
    const query = options.query.toLowerCase();

    const ignorePatterns = options.ignorePatterns || [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.cache',
    ];

    const shouldIgnore = (path: string): boolean => {
      return ignorePatterns.some((pattern) => path.toLowerCase().includes(pattern.toLowerCase()));
    };

    const matchesExtension = (path: string): boolean => {
      if (!options.fileExtensions || options.fileExtensions.length === 0) return true;
      const ext = extname(path).slice(1).toLowerCase();
      return options.fileExtensions.some((e) => e.toLowerCase() === ext);
    };

    const searchInDirectory = (dirPath: string): void => {
      if (results.length >= maxResults) return;
      if (shouldIgnore(dirPath)) return;

      try {
        const entries = readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= maxResults) break;

          const fullPath = join(dirPath, entry.name);
          const relativePath = relative(searchPath, fullPath).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            if (entry.name.toLowerCase().includes(query)) {
              results.push({
                path: relativePath,
                name: entry.name,
                type: 'directory',
              });
            }
            searchInDirectory(fullPath);
          } else if (entry.isFile()) {
            if (shouldIgnore(relativePath)) continue;
            if (!matchesExtension(relativePath)) continue;

            const nameMatches = entry.name.toLowerCase().includes(query);
            let contentMatches: FileSearchResult['matches'] | undefined;

            if (options.searchContent && !nameMatches) {
              try {
                const content = readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');
                const matches: { line: number; column: number; content: string }[] = [];

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  const lowerLine = line.toLowerCase();
                  let idx = lowerLine.indexOf(query);
                  while (idx !== -1 && matches.length < 10) {
                    matches.push({
                      line: i + 1,
                      column: idx + 1,
                      content: line.trim(),
                    });
                    idx = lowerLine.indexOf(query, idx + 1);
                  }
                }

                if (matches.length > 0) {
                  contentMatches = matches;
                }
              } catch {
                // 忽略无法读取的文件
              }
            }

            if (nameMatches || contentMatches) {
              results.push({
                path: relativePath,
                name: entry.name,
                type: 'file',
                matches: contentMatches,
              });
            }
          }
        }
      } catch {
        // 忽略无法读取的目录
      }
    };

    if (existsSync(searchPath)) {
      searchInDirectory(searchPath);
    }

    return results.slice(0, maxResults);
  }

  watchPath(watchKey: string, path: string, callback: FileWatchCallback): () => void {
    if (!this.fileWatchers.has(watchKey)) {
      const callbacks = new Set<FileWatchCallback>();
      let watcher: FSWatcher | null = null;

      try {
        watcher = watch(path, { recursive: true, persistent: false }, (eventType, filename) => {
          if (!filename) return;
          const event: FileWatchEvent = {
            type: eventType === 'rename' ? 'rename' : 'update',
            path: filename as string,
            timestamp: Date.now(),
          };
          callbacks.forEach((cb) => cb(event));
        });
      } catch {
        return () => {};
      }

      this.fileWatchers.set(watchKey, { watcher, callbacks });
    }

    const watcherInfo = this.fileWatchers.get(watchKey)!;
    watcherInfo.callbacks.add(callback);

    return () => {
      watcherInfo.callbacks.delete(callback);
      if (watcherInfo.callbacks.size === 0) {
        watcherInfo.watcher.close();
        this.fileWatchers.delete(watchKey);
      }
    };
  }

  private stopWatchingAll(projectId: string): void {
    const prefix = `${projectId}:`;
    for (const [key, info] of this.fileWatchers.entries()) {
      if (key.startsWith(prefix)) {
        info.watcher.close();
        this.fileWatchers.delete(key);
      }
    }
  }

  loadProjectConfig(projectPath: string): TapProjectConfig | null {
    const configPath = join(projectPath, 'tapdev.config.json');
    try {
      if (!existsSync(configPath)) return null;
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content) as TapProjectConfig;
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        console.warn('配置验证警告:', validation.errors);
      }
      return config;
    } catch {
      return null;
    }
  }

  saveProjectConfig(project: FlatProject): void {
    const configPath = join(project.path, 'tapdev.config.json');
    const engine = (project as FlatProject & { __engine?: EngineType }).__engine ?? 'native-js';
    const config: TapProjectConfig = {
      id: project.id,
      name: project.name,
      description: project.description,
      engine,
      buildPath: join(project.path, 'build'),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
    try {
      this.ensureDirectory(project.path);
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch {
      // 忽略保存错误
    }
  }

  private createProjectConfig(project: FlatProject, engine: EngineType): void {
    const config: TapProjectConfig = {
      id: project.id,
      name: project.name,
      description: project.description,
      engine,
      buildPath: join(project.path, 'build'),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
    const configPath = join(project.path, 'tapdev.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  validateConfig(config: unknown): ValidatedConfig<TapProjectConfig> {
    const errors: string[] = [];

    if (typeof config !== 'object' || config === null) {
      return { valid: false, errors: ['配置必须是一个对象'] };
    }

    const cfg = config as Record<string, unknown>;

    for (const field of CONFIG_SCHEMA.required) {
      if (!(field in cfg)) {
        errors.push(`缺少必填字段: ${field}`);
      }
    }

    for (const [field, type] of Object.entries(CONFIG_SCHEMA.types)) {
      if (field in cfg && cfg[field] !== undefined) {
        if (typeof cfg[field] !== type) {
          errors.push(`字段 ${field} 类型错误，期望 ${type}，实际 ${typeof cfg[field]}`);
        }
      }
    }

    if (
      cfg.engine &&
      !['unity', 'cocos', 'laya', 'native-js', 'custom'].includes(cfg.engine as string)
    ) {
      errors.push(`无效的引擎类型: ${cfg.engine}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? (cfg as unknown as TapProjectConfig) : undefined,
    };
  }

  getEnvironmentConfig(projectId: string, environment: EnvironmentType): ProjectEnvironmentConfig {
    const configs = this.environmentConfigs.get(projectId);
    if (!configs) {
      return this.getDefaultEnvironmentConfig(environment);
    }
    return { ...configs[environment] };
  }

  setEnvironmentConfig(
    projectId: string,
    environment: EnvironmentType,
    config: Partial<ProjectEnvironmentConfig>
  ): void {
    let configs = this.environmentConfigs.get(projectId);
    if (!configs) {
      configs = {
        development: this.getDefaultEnvironmentConfig('development'),
        testing: this.getDefaultEnvironmentConfig('testing'),
        production: this.getDefaultEnvironmentConfig('production'),
      };
    }
    configs[environment] = { ...configs[environment], ...config };
    this.environmentConfigs.set(projectId, configs);
    this.saveEnvironmentConfigs(projectId);
  }

  getAllEnvironmentConfigs(projectId: string): Record<EnvironmentType, ProjectEnvironmentConfig> {
    const configs = this.environmentConfigs.get(projectId);
    if (!configs) {
      return {
        development: this.getDefaultEnvironmentConfig('development'),
        testing: this.getDefaultEnvironmentConfig('testing'),
        production: this.getDefaultEnvironmentConfig('production'),
      };
    }
    return {
      development: { ...configs.development },
      testing: { ...configs.testing },
      production: { ...configs.production },
    };
  }

  private getDefaultEnvironmentConfig(env: EnvironmentType): ProjectEnvironmentConfig {
    const base: ProjectEnvironmentConfig = {
      apiBaseUrl: '',
      debugMode: false,
      logLevel: 'info',
      buildOptions: {},
    };

    switch (env) {
      case 'development':
        return {
          ...base,
          debugMode: true,
          logLevel: 'debug',
        };
      case 'testing':
        return {
          ...base,
          debugMode: true,
          logLevel: 'info',
        };
      case 'production':
        return {
          ...base,
          debugMode: false,
          logLevel: 'warn',
        };
    }
  }

  private initializeEnvironmentConfigs(projectId: string): void {
    this.environmentConfigs.set(projectId, {
      development: this.getDefaultEnvironmentConfig('development'),
      testing: this.getDefaultEnvironmentConfig('testing'),
      production: this.getDefaultEnvironmentConfig('production'),
    });
  }

  private loadEnvironmentConfigs(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    const configPath = join(project.path, '.tapdev', 'environments.json');
    try {
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf-8');
        const configs = JSON.parse(content);
        this.environmentConfigs.set(projectId, configs);
        return;
      }
    } catch {
      // 忽略加载错误
    }
    this.initializeEnvironmentConfigs(projectId);
  }

  private saveEnvironmentConfigs(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    const configs = this.environmentConfigs.get(projectId);
    if (!configs) return;

    const configDir = join(project.path, '.tapdev');
    const configPath = join(configDir, 'environments.json');
    try {
      this.ensureDirectory(configDir);
      writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf-8');
    } catch {
      // 忽略保存错误
    }
  }

  getProjectSettings(projectId: string): ProjectSettings {
    const settings = this.projectSettings.get(projectId);
    if (!settings) {
      return { ...DEFAULT_PROJECT_SETTINGS };
    }
    return JSON.parse(JSON.stringify(settings));
  }

  updateProjectSettings(projectId: string, partial: Partial<ProjectSettings>): void {
    const currentSettings = this.projectSettings.get(projectId);
    const settings: ProjectSettings = currentSettings
      ? JSON.parse(JSON.stringify(currentSettings))
      : JSON.parse(JSON.stringify(DEFAULT_PROJECT_SETTINGS));

    if (partial.editor) {
      settings.editor = { ...settings.editor, ...partial.editor };
    }
    if (partial.build) {
      settings.build = { ...settings.build, ...partial.build };
    }
    if (partial.debug) {
      settings.debug = { ...settings.debug, ...partial.debug };
    }
    if (partial.plugins) {
      settings.plugins = { ...settings.plugins, ...partial.plugins };
    }

    this.projectSettings.set(projectId, settings);
    this.saveProjectSettings(projectId);
  }

  getEditorSettings(projectId: string): EditorSettings {
    return { ...this.getProjectSettings(projectId).editor };
  }

  updateEditorSettings(projectId: string, partial: Partial<EditorSettings>): void {
    const current = this.getEditorSettings(projectId);
    this.updateProjectSettings(projectId, {
      editor: { ...current, ...partial },
    });
  }

  getBuildSettings(projectId: string): BuildSettings {
    return { ...this.getProjectSettings(projectId).build };
  }

  updateBuildSettings(projectId: string, partial: Partial<BuildSettings>): void {
    const current = this.getBuildSettings(projectId);
    this.updateProjectSettings(projectId, {
      build: { ...current, ...partial },
    });
  }

  getDebugSettings(projectId: string): DebugSettings {
    return { ...this.getProjectSettings(projectId).debug };
  }

  updateDebugSettings(projectId: string, partial: Partial<DebugSettings>): void {
    const current = this.getDebugSettings(projectId);
    this.updateProjectSettings(projectId, {
      debug: { ...current, ...partial },
    });
  }

  getPluginSettings(projectId: string): PluginSettings {
    return { ...this.getProjectSettings(projectId).plugins };
  }

  updatePluginSettings(projectId: string, partial: Partial<PluginSettings>): void {
    const current = this.getPluginSettings(projectId);
    this.updateProjectSettings(projectId, {
      plugins: { ...current, ...partial },
    });
  }

  private initializeProjectSettings(projectId: string): void {
    this.projectSettings.set(projectId, JSON.parse(JSON.stringify(DEFAULT_PROJECT_SETTINGS)));
  }

  private loadProjectSettings(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    const settingsPath = join(project.path, '.tapdev', 'settings.json');
    try {
      if (existsSync(settingsPath)) {
        const content = readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(content);
        this.projectSettings.set(projectId, {
          ...JSON.parse(JSON.stringify(DEFAULT_PROJECT_SETTINGS)),
          ...settings,
        });
        return;
      }
    } catch {
      // 忽略加载错误
    }
    this.initializeProjectSettings(projectId);
  }

  private saveProjectSettings(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    const settings = this.projectSettings.get(projectId);
    if (!settings) return;

    const settingsDir = join(project.path, '.tapdev');
    const settingsPath = join(settingsDir, 'settings.json');
    try {
      this.ensureDirectory(settingsDir);
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch {
      // 忽略保存错误
    }
  }

  toggleFavorite(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    project.favorite = !project.favorite;
    this.saveRecentProjectsToStorage();
    return project.favorite;
  }

  setProjectGroup(projectId: string, group: string): void {
    const project = this.projects.get(projectId);
    if (project) {
      project.group = group;
      this.saveRecentProjectsToStorage();
    }
  }

  getProjectGroups(): string[] {
    const groups = new Set<string>();
    for (const project of this.projects.values()) {
      if (project.group) {
        groups.add(project.group);
      }
    }
    return Array.from(groups).sort();
  }

  getProjectsByGroup(group: string): FlatProject[] {
    return [...this.projects.values()].filter((p) => p.group === group);
  }

  getFavoriteProjects(): FlatProject[] {
    return [...this.projects.values()].filter((p) => p.favorite);
  }

  private toMeta(flat: FlatProject): ProjectMeta {
    const engine = (flat as FlatProject & { __engine?: EngineType }).__engine ?? 'native-js';
    const now = flat.updatedAt;
    const config: TapProjectConfig = {
      id: flat.id,
      name: flat.name,
      description: flat.description,
      engine,
      buildPath: `${flat.path}/build`,
      createdAt: flat.createdAt,
      updatedAt: now,
    };
    return {
      config,
      path: flat.path,
      status: 'idle',
      lastOpenedAt: flat.lastOpenedAt || now,
      name: flat.name,
    };
  }

  private addRecentProject(project: FlatProject): void {
    this.recentProjects = [
      project,
      ...this.recentProjects.filter((p) => p.id !== project.id),
    ].slice(0, MAX_RECENT_PROJECTS);
    this.settings.recentProjects = this.recentProjects.map((p) => p.path);
    this.saveRecentProjectsToStorage();
  }

  private touchRecent(project: FlatProject): void {
    project.lastOpenedAt = new Date().toISOString();
    this.recentProjects = [
      project,
      ...this.recentProjects.filter((p) => p.id !== project.id),
    ].slice(0, MAX_RECENT_PROJECTS);
    this.settings.recentProjects = this.recentProjects.map((p) => p.path);
    this.saveRecentProjectsToStorage();
  }

  private saveRecentProjectsToStorage(): void {
    try {
      const data = JSON.stringify([...this.projects.values()]);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, data);
      }
    } catch {
      // 忽略持久化错误
    }
  }

  loadRecentProjectsFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY);
      if (!data) return;

      const projects = JSON.parse(data) as FlatProject[];
      for (const project of projects) {
        this.projects.set(project.id, project);
      }
      this.recentProjects = projects
        .sort(
          (a, b) =>
            new Date(b.lastOpenedAt || b.updatedAt).getTime() -
            new Date(a.lastOpenedAt || a.updatedAt).getTime()
        )
        .slice(0, MAX_RECENT_PROJECTS);
      this.settings.recentProjects = this.recentProjects.map((p) => p.path);
    } catch {
      // 忽略加载错误
    }
  }

  private saveSettingsToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tapdev:settings', JSON.stringify(this.settings));
      }
    } catch {
      // 忽略保存错误
    }
  }

  private loadSettingsFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = localStorage.getItem('tapdev:settings');
      if (!data) return;
      const saved = JSON.parse(data) as Partial<AppSettings>;
      this.settings = { ...this.settings, ...saved };
    } catch {
      // 忽略加载错误
    }
  }

  private ensureProjectDirectory(projectPath: string): void {
    this.ensureDirectory(projectPath);
    this.ensureDirectory(join(projectPath, '.tapdev'));
  }

  private ensureDirectory(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  constructor() {
    this.loadSettingsFromStorage();
    this.loadRecentProjectsFromStorage();
  }
}

export const projectManager = new ProjectManager();
