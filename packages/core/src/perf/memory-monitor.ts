/**
 * 内存与性能监控服务
 * - 实时内存使用监控
 * - 大文件编辑性能
 * - 长列表虚拟滚动指标
 * - Worker 卸载统计
 */
import { globalEventBus } from '../event-bus';

export interface MemorySample {
  timestamp: number;
  /** JS 堆内存（MB） */
  heapUsedMB: number;
  heapTotalMB: number;
  /** 渲染进程总内存 */
  rssMB: number;
  /** DOM 节点数 */
  domNodes: number;
  /** 监听器数 */
  listenerCount: number;
}

export interface PerformanceBudget {
  metric: string;
  value: number;
  warning: number;
  exceeded: number;
  unit: string;
}

const DEFAULT_BUDGETS: PerformanceBudget[] = [
  { metric: 'heap.used', value: 0, warning: 200, exceeded: 400, unit: 'MB' },
  { metric: 'rss', value: 0, warning: 500, exceeded: 800, unit: 'MB' },
  { metric: 'dom.nodes', value: 0, warning: 5000, exceeded: 10000, unit: 'count' },
  { metric: 'fps', value: 60, warning: 30, exceeded: 15, unit: 'fps' },
];

export class MemoryMonitor {
  private samples: MemorySample[] = [];
  private readonly maxSamples = 600;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;
  private readonly budgets: PerformanceBudget[];

  constructor(intervalMs = 1000, customBudgets?: PerformanceBudget[]) {
    this.intervalMs = intervalMs;
    this.budgets = customBudgets ?? DEFAULT_BUDGETS;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.sample(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  sample(): MemorySample {
    const mem = (
      performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
    ).memory;
    const doc = typeof document !== 'undefined' ? document : null;
    const sample: MemorySample = {
      timestamp: Date.now(),
      heapUsedMB: mem ? mem.usedJSHeapSize / 1024 / 1024 : 0,
      heapTotalMB: mem ? mem.totalJSHeapSize / 1024 / 1024 : 0,
      rssMB: (process?.memoryUsage?.().rss ?? 0) / 1024 / 1024,
      domNodes: doc?.querySelectorAll('*').length ?? 0,
      listenerCount: this.estimateListeners(),
    };
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) this.samples.shift();
    this.checkBudgets(sample);
    globalEventBus.emit({ type: 'perf:sample', payload: sample });
    return sample;
  }

  getLatest(): MemorySample | null {
    return this.samples[this.samples.length - 1] ?? null;
  }

  getHistory(): MemorySample[] {
    return [...this.samples];
  }

  getAverage(field: keyof MemorySample): number {
    if (this.samples.length === 0) return 0;
    const sum = this.samples.reduce((s, x) => s + (x[field] as number), 0);
    return sum / this.samples.length;
  }

  getPeak(field: keyof MemorySample): number {
    return this.samples.reduce((max, x) => Math.max(max, x[field] as number), 0);
  }

  getBudgets(): PerformanceBudget[] {
    return [...this.budgets];
  }

  /**
   * 触发 GC（仅在暴露时有效）
   */
  triggerGC(): boolean {
    const w = window as unknown as { gc?: () => void };
    if (typeof w.gc === 'function') {
      w.gc();
      return true;
    }
    return false;
  }

  private checkBudgets(sample: MemorySample): void {
    for (const b of this.budgets) {
      const value = this.getMetricValue(b.metric, sample);
      if (value >= b.exceeded) {
        globalEventBus.emit({ type: 'perf:budget-exceeded', payload: { budget: b, value } });
      } else if (value >= b.warning) {
        globalEventBus.emit({ type: 'perf:budget-warning', payload: { budget: b, value } });
      }
    }
  }

  private getMetricValue(metric: string, sample: MemorySample): number {
    switch (metric) {
      case 'heap.used':
        return sample.heapUsedMB;
      case 'rss':
        return sample.rssMB;
      case 'dom.nodes':
        return sample.domNodes;
      default:
        return 0;
    }
  }

  private estimateListeners(): number {
    // 启发式估算
    if (typeof window === 'undefined') return 0;
    return (window as unknown as { __tapdev_listener_count?: number }).__tapdev_listener_count ?? 0;
  }
}

export const memoryMonitor = new MemoryMonitor();
