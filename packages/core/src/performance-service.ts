import { globalEventBus } from './event-bus';

export interface WebVitals {
  lcp: number;
  fid: number;
  cls: number;
  inp: number;
  ttfcp: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  webVitals: WebVitals;
  memoryUsage: number;
  cpuUsage: number;
  frameRate: number;
}

export interface PerformanceReport {
  id: string;
  timestamp: number;
  duration: number;
  metrics: PerformanceMetrics[];
  summary: {
    avgFrameRate: number;
    avgMemoryUsage: number;
    avgCpuUsage: number;
    webVitals: WebVitals;
  };
}

export class PerformanceService {
  private isMonitoring = false;
  private intervalId: number | null = null;
  private metricsBuffer: PerformanceMetrics[] = [];
  private maxBufferSize = 60;
  private startTime = 0;

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startTime = Date.now();
    this.metricsBuffer = [];
    
    this.intervalId = window.setInterval(() => {
      if (!this.isMonitoring) return;
      
      const metrics = this.collectMetrics();
      this.metricsBuffer.push(metrics);
      
      if (this.metricsBuffer.length > this.maxBufferSize) {
        this.metricsBuffer.shift();
      }
      
      globalEventBus.emit({ type: 'performance:update', payload: metrics });
    }, 1000);

    this.startWebVitalsObserver();
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    globalEventBus.emit({ type: 'performance:stopped', payload: this.generateReport() });
  }

  getCurrentMetrics(): PerformanceMetrics | null {
    if (!this.isMonitoring || this.metricsBuffer.length === 0) {
      return null;
    }
    return this.metricsBuffer[this.metricsBuffer.length - 1];
  }

  generateReport(): PerformanceReport {
    if (this.metricsBuffer.length === 0) {
      return {
        id: `${Date.now()}`,
        timestamp: Date.now(),
        duration: Date.now() - this.startTime,
        metrics: [],
        summary: {
          avgFrameRate: 0,
          avgMemoryUsage: 0,
          avgCpuUsage: 0,
          webVitals: {
            lcp: 0,
            fid: 0,
            cls: 0,
            inp: 0,
            ttfcp: 0,
          },
        },
      };
    }

    const duration = Date.now() - this.startTime;
    const avgFrameRate = this.metricsBuffer.reduce((sum, m) => sum + m.frameRate, 0) / this.metricsBuffer.length;
    const avgMemoryUsage = this.metricsBuffer.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metricsBuffer.length;
    const avgCpuUsage = this.metricsBuffer.reduce((sum, m) => sum + m.cpuUsage, 0) / this.metricsBuffer.length;

    const latestMetrics = this.metricsBuffer[this.metricsBuffer.length - 1];

    return {
      id: `${Date.now()}`,
      timestamp: Date.now(),
      duration,
      metrics: [...this.metricsBuffer],
      summary: {
        avgFrameRate: Math.round(avgFrameRate * 100) / 100,
        avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
        avgCpuUsage: Math.round(avgCpuUsage * 100) / 100,
        webVitals: latestMetrics.webVitals,
      },
    };
  }

  private collectMetrics(): PerformanceMetrics {
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCpuUsage();
    const frameRate = this.getFrameRate();

    return {
      timestamp: Date.now(),
      webVitals: this.getWebVitals(),
      memoryUsage,
      cpuUsage,
      frameRate,
    };
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      return (memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }

  private getCpuUsage(): number {
    return 0;
  }

  private getFrameRate(): number {
    if (typeof window !== 'undefined' && window.performance) {
      const now = performance.now();
      const lastTime = (window as any)._lastFrameTime || now;
      const delta = now - lastTime;
      (window as any)._lastFrameTime = now;
      return delta > 0 ? Math.round(1000 / delta) : 60;
    }
    return 60;
  }

  private getWebVitals(): WebVitals {
    return {
      lcp: (window as any)._lcpValue || 0,
      fid: (window as any)._fidValue || 0,
      cls: (window as any)._clsValue || 0,
      inp: (window as any)._inpValue || 0,
      ttfcp: (window as any)._ttfcpValue || 0,
    };
  }

  private startWebVitalsObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const entryAny = entry as any;
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              (window as any)._lcpValue = entry.startTime;
              break;
            case 'first-input':
              (window as any)._fidValue = entryAny.processingStart - entry.startTime;
              break;
            case 'layout-shift':
              if (!entryAny.hadRecentInput) {
                const currentCls = (window as any)._clsValue || 0;
                (window as any)._clsValue = currentCls + entryAny.value;
              }
              break;
            case 'interaction':
              (window as any)._inpValue = entry.duration;
              break;
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                (window as any)._ttfcpValue = entry.startTime;
              }
              break;
          }
        }
      });

      observer.observe({
        type: 'largest-contentful-paint',
        buffered: true,
      });

      observer.observe({
        type: 'first-input',
        buffered: true,
      });

      observer.observe({
        type: 'layout-shift',
        buffered: true,
      });

      observer.observe({
        type: 'interaction',
        buffered: true,
      });

      observer.observe({
        type: 'paint',
        buffered: true,
      });
    }
  }
}

export const performanceService = new PerformanceService();