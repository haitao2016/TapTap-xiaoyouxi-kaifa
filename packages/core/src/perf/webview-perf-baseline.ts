/**
 * WebView 性能基线与回归测试
 * - 性能指标采集
 * - 基线对比
 * - 回归告警
 */
import { globalEventBus } from '../event-bus';

export interface WebViewPerfMetrics {
  /** 首次内容绘制 (ms) */
  fcp: number;
  /** 最大内容绘制 (ms) */
  lcp: number;
  /** 首次输入延迟 (ms) */
  fid: number;
  /** 累计布局偏移 */
  cls: number;
  /** FPS */
  fps: number;
  /** 内存 (MB) */
  memoryMB: number;
  /** JS 堆 (MB) */
  heapMB: number;
  /** 时间戳 */
  timestamp: number;
}

export interface PerfBaseline {
  name: string;
  metrics: WebViewPerfMetrics;
  createdAt: number;
}

const REGRESSION_THRESHOLD = 0.2; // 20% 退化视为回归

export class WebViewPerfBaseline {
  private baselines = new Map<string, PerfBaseline>();
  private samples: WebViewPerfMetrics[] = [];

  setBaseline(name: string, metrics: WebViewPerfMetrics): void {
    this.baselines.set(name, { name, metrics, createdAt: Date.now() });
  }

  getBaseline(name: string): PerfBaseline | null {
    return this.baselines.get(name) ?? null;
  }

  recordSample(metrics: WebViewPerfMetrics): void {
    this.samples.push(metrics);
    if (this.samples.length > 100) this.samples.shift();
  }

  /**
   * 对比基线
   */
  compareToBaseline(name: string, metrics: WebViewPerfMetrics): {
    passed: boolean;
    regressions: { key: keyof WebViewPerfMetrics; baseline: number; current: number; ratio: number }[];
  } {
    const baseline = this.baselines.get(name);
    if (!baseline) return { passed: true, regressions: [] };
    const regressions: { key: keyof WebViewPerfMetrics; baseline: number; current: number; ratio: number }[] = [];
    const keys: (keyof WebViewPerfMetrics)[] = ['fcp', 'lcp', 'fid', 'cls'];
    for (const k of keys) {
      const baseVal = baseline.metrics[k] as number;
      const curVal = metrics[k] as number;
      if (typeof baseVal !== 'number' || typeof curVal !== 'number') continue;
      if (baseVal === 0) continue;
      const ratio = (curVal - baseVal) / baseVal;
      if (ratio > REGRESSION_THRESHOLD) {
        regressions.push({ key: k, baseline: baseVal, current: curVal, ratio });
      }
    }
    const passed = regressions.length === 0;
    if (!passed) {
      globalEventBus.emit({ type: 'perf:regression', payload: { name, regressions } });
    }
    return { passed, regressions };
  }

  /**
   * 自动采集 Web Vitals
   */
  async collectWebVitals(): Promise<Partial<WebViewPerfMetrics>> {
    const result: Partial<WebViewPerfMetrics> = {};
    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') result.fcp = entry.startTime;
        }
      });
      obs.observe({ type: 'paint', buffered: true });
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          result.lcp = entries[entries.length - 1]!.startTime;
        }
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
      await new Promise((r) => setTimeout(r, 1000));
      obs.disconnect();
      lcpObs.disconnect();
    } catch {
      // 浏览器不支持
    }
    return result;
  }
}

export const webViewPerfBaseline = new WebViewPerfBaseline();
