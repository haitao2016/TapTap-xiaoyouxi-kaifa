import type { BuildConfig, BuildTask, BuildResult, BuildStep, BuildPlatformConfig, BuildCacheInfo } from '@tapdev/types';
import { globalEventBus } from './event-bus';
import { getNativeBridge } from './debug-service';
import { randomUUID, createHash } from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 两次构建结果的对比信息
 */
export interface BuildComparison {
  /** 第一次构建结果 */
  build1: BuildResult;
  /** 第二次构建结果 */
  build2: BuildResult;
  /** 构建时长对比 */
  duration: {
    build1: number;
    build2: number;
    difference: number;
    percentChange: string;
    faster: boolean;
  };
  /** 错误数量对比 */
  errors: {
    build1: number;
    build2: number;
    added: number;
  };
  /** 警告数量对比 */
  warnings: {
    build1: number;
    build2: number;
    added: number;
  };
  /** 输出文件对比 */
  outputFiles: {
    build1: number;
    build2: number;
    added: string[];
    removed: string[];
    common: string[];
  };
  /** 缓存命中对比 */
  cache: {
    build1Hit: boolean;
    build2Hit: boolean;
    difference: number;
  };
  /** 时间戳差异 */
  timestampDiff: number;
}

const PLATFORM_CONFIGS: Record<string, BuildPlatformConfig> = {
  webgl: {
    platform: 'webgl',
    supported: true,
    buildCommand: 'WebGL',
    outputExtension: '.zip',
  },
  android: {
    platform: 'android',
    supported: true,
    buildCommand: 'Android',
    outputExtension: '.apk',
    requiresNative: true,
  },
  ios: {
    platform: 'ios',
    supported: true,
    buildCommand: 'iOS',
    outputExtension: '.ipa',
    requiresNative: true,
  },
};

const BUILD_STEPS: BuildStep[] = [
  { name: '验证项目配置', weight: 10, cacheable: false },
  { name: '检测 TapTap Unity SDK', weight: 15, cacheable: false },
  { name: 'Unity BatchMode 初始化', weight: 5, cacheable: false },
  { name: '编译 WebGL/WASM', weight: 40, cacheable: true },
  { name: 'TapTap SDK 打包', weight: 15, cacheable: true },
  { name: 'WASM 分包优化', weight: 10, cacheable: true },
  { name: '生成输出文件', weight: 5, cacheable: true },
];

/**
 * 构建服务类
 * 负责管理构建任务、缓存、历史记录等功能
 */
export class BuildService {
  private tasks = new Map<string, BuildTask>();
  private activeTaskId: string | null = null;
  private platformConfigs = PLATFORM_CONFIGS;
  private cacheDir = '.tapdev/build-cache';
  private cacheValidityDays = 7;
  private historyDir = '.tapdev/build-history';
  private maxHistoryItems = 100;

  /**
   * 根据任务ID获取构建任务
   * @param taskId 任务ID
   * @returns 构建任务对象，如果不存在则返回 undefined
   */
  getTask(taskId: string): BuildTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有构建任务
   * @returns 按开始时间降序排列的任务列表
   */
  getAllTasks(): BuildTask[] {
    return [...this.tasks.values()].sort(
      (a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)
    );
  }

  /**
   * 获取当前活跃的构建任务
   * @returns 当前活跃任务，如果没有则返回 null
   */
  getActiveTask(): BuildTask | null {
    return this.activeTaskId ? this.tasks.get(this.activeTaskId) ?? null : null;
  }

  /**
   * 获取所有平台配置
   * @returns 平台配置数组
   */
  getPlatformConfigs(): BuildPlatformConfig[] {
    return Object.values(this.platformConfigs);
  }

  /**
   * 获取支持的平台列表
   * @returns 支持的平台名称数组
   */
  getSupportedPlatforms(): string[] {
    return Object.values(this.platformConfigs)
      .filter((p) => p.supported)
      .map((p) => p.platform);
  }

  /**
   * 获取构建历史记录
   * @param projectId 项目ID，可选参数，不传则获取所有项目的构建历史
   * @returns 构建结果数组
   */
  async getBuildHistory(projectId?: string): Promise<BuildResult[]> {
    try {
      const history: BuildResult[] = [];
      const dirs = fs.readdirSync(this.historyDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort((a, b) => Number(b) - Number(a));

      for (const dir of dirs) {
        const filePath = path.join(this.historyDir, dir, 'result.json');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const result = JSON.parse(content) as BuildResult;
          
          if (!projectId || result.projectId === projectId) {
            history.push(result);
          }
          
          if (history.length >= this.maxHistoryItems) {
            break;
          }
        }
      }
      
      return history;
    } catch {
      return [];
    }
  }

  /**
   * 根据构建ID获取构建结果
   * @param buildId 构建ID
   * @returns 构建结果，如果不存在则返回 null
   */
  async getBuildResultById(buildId: string): Promise<BuildResult | null> {
    try {
      const filePath = path.join(this.historyDir, buildId, 'result.json');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as BuildResult;
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * 删除指定构建记录
   * @param buildId 构建ID
   */
  async deleteBuildHistory(buildId: string): Promise<void> {
    const dirPath = path.join(this.historyDir, buildId);
    this.rmdirSync(dirPath);
    globalEventBus.emit({ type: 'build:historyDeleted', payload: { buildId } });
  }

  /**
   * 清除构建历史记录
   * @param projectId 项目ID，可选参数，不传则清除所有项目的构建历史
   */
  async clearBuildHistory(projectId?: string): Promise<void> {
    if (projectId) {
      const history = await this.getBuildHistory(projectId);
      history.forEach(result => {
        this.deleteBuildHistory(result.id);
      });
    } else {
      this.rmdirSync(this.historyDir);
    }
    globalEventBus.emit({ type: 'build:historyCleared', payload: { projectId } });
  }

  /**
   * 对比两次构建结果
   * @param buildId1 第一次构建ID
   * @param buildId2 第二次构建ID
   * @returns 构建对比信息，如果任一构建不存在则返回 null
   */
  async compareBuilds(buildId1: string, buildId2: string): Promise<BuildComparison | null> {
    const build1 = await this.getBuildResultById(buildId1);
    const build2 = await this.getBuildResultById(buildId2);
    
    if (!build1 || !build2) {
      return null;
    }

    const durationDiff = build2.duration - build1.duration;
    const durationPercent = build1.duration > 0 
      ? ((durationDiff / build1.duration) * 100).toFixed(2) 
      : 'N/A';

    const errorsAdded = build2.errors.length - build1.errors.length;
    const warningsAdded = build2.warnings.length - build1.warnings.length;

    const filesAdded = build2.outputFiles.filter(f => !build1.outputFiles.includes(f));
    const filesRemoved = build1.outputFiles.filter(f => !build2.outputFiles.includes(f));
    const filesCommon = build1.outputFiles.filter(f => build2.outputFiles.includes(f));

    const cacheHitDiff = (build2.cacheInfo?.hit ? 1 : 0) - (build1.cacheInfo?.hit ? 1 : 0);

    return {
      build1,
      build2,
      duration: {
        build1: build1.duration,
        build2: build2.duration,
        difference: durationDiff,
        percentChange: durationPercent,
        faster: durationDiff < 0,
      },
      errors: {
        build1: build1.errors.length,
        build2: build2.errors.length,
        added: errorsAdded,
      },
      warnings: {
        build1: build1.warnings.length,
        build2: build2.warnings.length,
        added: warningsAdded,
      },
      outputFiles: {
        build1: build1.outputFiles.length,
        build2: build2.outputFiles.length,
        added: filesAdded,
        removed: filesRemoved,
        common: filesCommon,
      },
      cache: {
        build1Hit: build1.cacheInfo?.hit ?? false,
        build2Hit: build2.cacheInfo?.hit ?? false,
        difference: cacheHitDiff,
      },
      timestampDiff: build2.timestamp - build1.timestamp,
    };
  }

  /**
   * 开始构建任务
   * @param config 构建配置
   * @returns 构建任务对象
   */
  async startBuild(config: BuildConfig): Promise<BuildTask> {
    const task: BuildTask = {
      id: randomUUID(),
      config,
      status: 'pending',
      progress: 0,
      startedAt: Date.now(),
      cacheInfo: {
        enabled: config.useCache !== false,
        hit: false,
        skippedSteps: [],
      },
    };

    this.tasks.set(task.id, task);
    this.activeTaskId = task.id;
    globalEventBus.emit({ type: 'build:start', payload: task });

    const bridge = getNativeBridge();
    if (bridge?.isAvailable()) {
      this.runNativeBuild(task, bridge).catch(() => {
        task.status = 'failed';
        task.finishedAt = Date.now();
        this.activeTaskId = null;
        globalEventBus.emit({ type: 'build:complete', payload: {
          id: randomUUID(),
          projectId: task.config.projectId,
          success: false,
          outputFiles: [],
          duration: task.finishedAt - (task.startedAt || Date.now()),
          errors: ['构建失败'],
          warnings: [],
          timestamp: Date.now(),
        } satisfies BuildResult });
      });
    } else {
      this.runSimulatedBuild(task).catch(() => {
        task.status = 'failed';
        task.finishedAt = Date.now();
        this.activeTaskId = null;
        globalEventBus.emit({ type: 'build:complete', payload: {
          id: randomUUID(),
          projectId: task.config.projectId,
          success: false,
          outputFiles: [],
          duration: task.finishedAt - (task.startedAt || Date.now()),
          errors: ['构建失败'],
          warnings: [],
          timestamp: Date.now(),
        } satisfies BuildResult });
      });
    }

    return task;
  }

  /**
   * 取消构建任务
   * @param taskId 任务ID
   */
  cancelBuild(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && (task.status === 'running' || task.status === 'pending')) {
      task.status = 'cancelled';
      task.finishedAt = Date.now();
      if (this.activeTaskId === taskId) this.activeTaskId = null;
      getNativeBridge()?.cancelUnityBuild(taskId);
    }
  }

  /**
   * 处理原生构建进度
   * @param taskId 任务ID
   * @param progress 进度百分比
   * @param message 进度消息
   */
  handleNativeProgress(taskId: string, progress: number, message?: string): void {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'cancelled') return;
    task.status = 'running';
    task.progress = progress;
    task.progressMessage = message;
    globalEventBus.emit({ type: 'build:progress', payload: { taskId, progress, message } });
  }

  /**
   * 处理原生构建完成
   * @param result 构建结果
   */
  handleNativeComplete(result: BuildResult): void {
    const task = [...this.tasks.values()].find((t) => t.config.projectId === result.projectId && t.status === 'running');
    if (!task) return;
    task.result = result;
    task.status = result.success ? 'success' : 'failed';
    task.progress = 100;
    task.finishedAt = Date.now();
    this.activeTaskId = null;
    globalEventBus.emit({ type: 'build:complete', payload: result });
  }

  /**
   * 验证构建配置
   * @param config 构建配置
   * @returns 验证结果，包含是否有效和错误信息列表
   */
  validateConfig(config: BuildConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.projectPath || !config.projectPath.trim()) {
      errors.push('项目路径不能为空');
    }

    if (!config.outputPath || !config.outputPath.trim()) {
      errors.push('输出路径不能为空');
    }

    if (!config.version || !config.version.trim()) {
      errors.push('版本号不能为空');
    }

    if (!config.targetPlatform || config.targetPlatform.length === 0) {
      errors.push('至少选择一个目标平台');
    }

    for (const platform of config.targetPlatform) {
      if (!this.platformConfigs[platform] || !this.platformConfigs[platform].supported) {
        errors.push(`不支持的平台: ${platform}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 获取缓存信息
   * @param projectId 项目ID
   * @returns 缓存信息，如果不存在则返回 null
   */
  async getCacheInfo(projectId: string): Promise<BuildCacheInfo | null> {
    const cachePath = this.getCachePath(projectId);
    try {
      const stats = fs.statSync(cachePath);
      const cacheFile = path.join(cachePath, 'cache.json');
      
      if (fs.existsSync(cacheFile)) {
        const content = fs.readFileSync(cacheFile, 'utf-8');
        const cacheInfo = JSON.parse(content) as BuildCacheInfo;
        cacheInfo.lastModified = stats.mtime.getTime();
        cacheInfo.valid = !this.isCacheExpired(stats.mtime.getTime());
        return cacheInfo;
      }
    } catch {
      // Cache directory doesn't exist
    }
    return null;
  }

  async clearCache(projectId?: string): Promise<void> {
    if (projectId) {
      const cachePath = this.getCachePath(projectId);
      this.rmdirSync(cachePath);
    } else {
      this.rmdirSync(this.cacheDir);
    }
    globalEventBus.emit({ type: 'build:cacheCleared', payload: { projectId } });
  }

  private getCachePath(projectId: string): string {
    return path.join(this.cacheDir, projectId);
  }

  private isCacheExpired(lastModified: number): boolean {
    const now = Date.now();
    const daysDiff = (now - lastModified) / (1000 * 60 * 60 * 24);
    return daysDiff > this.cacheValidityDays;
  }

  private async generateBuildHash(config: BuildConfig): Promise<string> {
    let hashContent = JSON.stringify({
      version: config.version,
      targetPlatform: config.targetPlatform,
      wasmSplit: config.wasmSplit,
      compress: config.compress,
    });

    if (config.projectPath) {
      try {
        const projectFiles = this.getProjectFiles(config.projectPath);
        hashContent += JSON.stringify(projectFiles.map(f => ({
          name: f.name,
          size: f.size,
          mtime: f.mtime,
        })));
      } catch {
        // Ignore errors when reading project files
      }
    }

    return this.sha256(hashContent);
  }

  private getProjectFiles(dir: string): Array<{ name: string; size: number; mtime: number }> {
    const files: Array<{ name: string; size: number; mtime: number }> = [];
    const excludeDirs = ['node_modules', '.git', 'Library', 'Temp', 'obj', 'bin', '.tapdev'];
    
    const walk = (currentDir: string, relativePath: string = '') => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (excludeDirs.includes(entry.name)) continue;
        
        const fullPath = path.join(currentDir, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
        
        if (entry.isDirectory()) {
          walk(fullPath, relPath);
        } else {
          const stats = fs.statSync(fullPath);
          files.push({
            name: relPath,
            size: stats.size,
            mtime: stats.mtime.getTime(),
          });
        }
      }
    };
    
    walk(dir);
    return files;
  }

  private sha256(str: string): string {
    return createHash('sha256').update(str).digest('hex');
  }

  private rmdirSync(dir: string): void {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // Ignore errors
    }
  }

  private async runNativeBuild(task: BuildTask, bridge: NonNullable<ReturnType<typeof getNativeBridge>>): Promise<void> {
    task.status = 'running';

    const { taskId } = await bridge.startUnityBuild(task.config);

    const unsubProgress = bridge.onBuildProgress(({ taskId: tid, progress, message }) => {
      if (tid === taskId) {
        task.progress = progress;
        task.progressMessage = message;
        globalEventBus.emit({ type: 'build:progress', payload: { taskId, progress, message } });
      }
    });

    const unsubComplete = bridge.onBuildComplete((result) => {
      task.result = result;
      task.status = result.success ? 'success' : 'failed';
      task.progress = 100;
      task.finishedAt = Date.now();
      this.activeTaskId = null;
      globalEventBus.emit({ type: 'build:complete', payload: result });
      unsubProgress();
      unsubComplete();
    });
  }

  private async runSimulatedBuild(task: BuildTask): Promise<void> {
    task.status = 'running';
    
    const useCache = task.cacheInfo?.enabled ?? true;
    let cacheHit = false;
    const skippedSteps: string[] = [];
    const buildHash = await this.generateBuildHash(task.config);
    
    if (useCache) {
      const cacheInfo = await this.getCacheInfo(task.config.projectId);
      if (cacheInfo && cacheInfo.hash === buildHash && cacheInfo.valid) {
        cacheHit = true;
        skippedSteps.push(...BUILD_STEPS.filter(s => s.cacheable).map(s => s.name));
        task.progressMessage = '使用缓存构建';
        await this.delay(500);
      }
    }
    
    task.cacheInfo = {
      enabled: useCache,
      hit: cacheHit,
      skippedSteps,
      hash: buildHash,
    };

    const steps = cacheHit ? BUILD_STEPS.filter(s => !s.cacheable) : BUILD_STEPS;

    let progress = 0;
    const warnings: string[] = [
      '当前为 Web 模拟模式。Unity 真实构建请使用 Electron 桌面端 (pnpm dev:desktop)',
    ];
    if (cacheHit) {
      warnings.push('已使用增量构建缓存');
    }
    const outputFiles: string[] = [];

    for (const step of steps) {
      const current = this.tasks.get(task.id);
      if (current?.status === 'cancelled') return;
      
      task.progressMessage = step.name;
      await this.delay(400 + Math.random() * 600);
      progress += step.weight ?? 0;
      task.progress = Math.min(progress, 100);
      globalEventBus.emit({ 
        type: 'build:progress', 
        payload: { taskId: task.id, progress: task.progress, message: step.name } 
      });
    }

    for (const platform of task.config.targetPlatform) {
      const platformConfig = this.platformConfigs[platform];
      if (platformConfig) {
        if (task.config.compress) {
          outputFiles.push(`${task.config.outputPath}/game_${platform}.zip`);
        }
        if (task.config.wasmSplit && platform === 'webgl') {
          outputFiles.push(`${task.config.outputPath}/game_wasm_split.zip`);
        }
        outputFiles.push(`${task.config.outputPath}/game_${platform}.json`);
      }
    }

    if (useCache && !cacheHit) {
      this.saveCache(task.config.projectId, buildHash);
    }

    const result: BuildResult = {
      id: randomUUID(),
      projectId: task.config.projectId,
      success: true,
      outputFiles,
      duration: Date.now() - (task.startedAt ?? Date.now()),
      errors: [],
      warnings,
      timestamp: Date.now(),
      buildNumber: `build-${Date.now()}`,
      buildHash: Math.random().toString(36).substring(2, 10),
      cacheInfo: task.cacheInfo,
    };

    this.saveBuildHistory(result);

    task.result = result;
    task.status = 'success';
    task.progress = 100;
    task.finishedAt = Date.now();
    this.activeTaskId = null;
    globalEventBus.emit({ type: 'build:complete', payload: result });
  }

  private saveBuildHistory(result: BuildResult): void {
    try {
      const historyPath = path.join(this.historyDir, result.id);
      fs.mkdirSync(historyPath, { recursive: true });
      
      fs.writeFileSync(path.join(historyPath, 'result.json'), JSON.stringify(result, null, 2));
      
      this.cleanupOldHistory();
    } catch {
      // Ignore errors
    }
  }

  private cleanupOldHistory(): void {
    try {
      const dirs = fs.readdirSync(this.historyDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => ({ name: d.name, path: path.join(this.historyDir, d.name) }))
        .sort((a, b) => Number(b.name) - Number(a.name));

      if (dirs.length > this.maxHistoryItems) {
        const toDelete = dirs.slice(this.maxHistoryItems);
        toDelete.forEach(dir => {
          this.rmdirSync(dir.path);
        });
      }
    } catch {
      // Ignore errors
    }
  }

  private saveCache(projectId: string, hash: string): void {
    try {
      const cachePath = this.getCachePath(projectId);
      fs.mkdirSync(cachePath, { recursive: true });
      
      const cacheInfo: BuildCacheInfo = {
        enabled: true,
        hit: false,
        hash,
        lastModified: Date.now(),
        valid: true,
        hitCount: 0,
      };
      
      fs.writeFileSync(path.join(cachePath, 'cache.json'), JSON.stringify(cacheInfo, null, 2));
    } catch {
      // Ignore cache save errors
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const buildService = new BuildService();