/**
 * 启动性能监控与优化服务
 * - 启动时间分阶段测量
 * - 关键路径预加载
 * - 启动预算告警
 * - 冷启动 < 3s 目标
 */
import { globalEventBus } from '../event-bus';

export type StartupStage =
  | 'process-spawn'
  | 'main-init'
  | 'preload'
  | 'window-create'
  | 'renderer-load'
  | 'core-init'
  | 'workspace-load'
  | 'first-paint'
  | 'interactive';

export interface StartupMetric {
  stage: StartupStage;
  /** 开始时间（相对启动） */
  startMs: number;
  /** 持续时间 ms */
  durationMs: number;
  /** 详情 */
  details?: Record<string, unknown>;
}

export interface StartupReport {
  totalMs: number;
  metrics: StartupMetric[];
  /** 冷启动还是热启动 */
  type: 'cold' | 'warm';
  /** 是否达成预算 */
  withinBudget: boolean;
  /** 预算 ms */
  budget: number;
  /** 时间戳 */
  timestamp: number;
}

const DEFAULT_BUDGETS: Record<StartupStage, number> = {
  'process-spawn': 100,
  'main-init': 200,
  preload: 150,
  'window-create': 300,
  'renderer-load': 800,
  'core-init': 400,
  'workspace-load': 500,
  'first-paint': 1500,
  interactive: 3000,
};

export class StartupMonitor {
  private metrics: StartupMetric[] = [];
  private startTime = performance.now();
  private isRecording = false;
  private readonly budget: Record<StartupStage, number>;

  constructor(customBudgets?: Partial<Record<StartupStage, number>>) {
    this.budget = { ...DEFAULT_BUDGETS, ...customBudgets };
  }

  start(): void {
    this.isRecording = true;
    this.startTime = performance.now();
    this.metrics = [];
  }

  record(stage: StartupStage, details?: Record<string, unknown>): void {
    if (!this.isRecording) return;
    const now = performance.now();
    const start =
      this.metrics.length === 0 ? 0 : this.metrics.reduce((s, m) => s + m.durationMs, 0);
    this.metrics.push({
      stage,
      startMs: start,
      durationMs: now - this.startTime - start,
      details,
    });
    globalEventBus.emit({ type: 'startup:metric', payload: this.metrics[this.metrics.length - 1] });
  }

  finish(type: 'cold' | 'warm' = 'cold'): StartupReport {
    this.isRecording = false;
    const total = this.metrics.reduce((s, m) => s + m.durationMs, 0);
    const report: StartupReport = {
      totalMs: total,
      metrics: [...this.metrics],
      type,
      withinBudget: total <= this.budget.interactive,
      budget: this.budget.interactive,
      timestamp: Date.now(),
    };
    globalEventBus.emit({ type: 'startup:complete', payload: report });
    return report;
  }

  getMetrics(): StartupMetric[] {
    return [...this.metrics];
  }

  /**
   * 检查哪些阶段超出预算
   */
  getOverBudgetStages(): { stage: StartupStage; actual: number; budget: number }[] {
    const over: { stage: StartupStage; actual: number; budget: number }[] = [];
    for (const m of this.metrics) {
      const b = this.budget[m.stage];
      if (m.durationMs > b) {
        over.push({ stage: m.stage, actual: m.durationMs, budget: b });
      }
    }
    return over;
  }

  /**
   * 关键路径预加载建议
   */
  suggestPreload(): string[] {
    const suggestions: string[] = [];
    const over = this.getOverBudgetStages();
    for (const o of over) {
      switch (o.stage) {
        case 'renderer-load':
          suggestions.push('启用 Vite 拆包：拆分 vendor 库到独立 chunk');
          suggestions.push('使用动态 import 延迟加载非首屏路由');
          break;
        case 'core-init':
          suggestions.push('core 包拆分为 lazy chunk');
          break;
        case 'workspace-load':
          suggestions.push('工作区索引使用增量加载 + 缓存');
          break;
        case 'first-paint':
          suggestions.push('关键 CSS 内联；图标使用 SVG sprite');
          break;
      }
    }
    return suggestions;
  }
}

export const startupMonitor = new StartupMonitor();
