// 自动化测试平台
// 游戏 UI 自动化测试、性能基准、兼容性测试

import { globalEventBus } from '../core/event-bus';

// 测试类型
export type TestType = 'ui-interaction' | 'performance' | 'compatibility' | 'unit' | 'integration' | 'e2e';

// 测试用例
export interface TestCase {
  id: string;
  name: string;
  type: TestType;
  description: string;
  // UI 测试
  steps?: {
    type: 'click' | 'input' | 'swipe' | 'wait' | 'screenshot' | 'assert';
    target?: string;
    value?: any;
    timeout?: number;
    assertion?: { type: 'equals' | 'contains' | 'exists' | 'visible'; expected: any };
  }[];
  // 性能测试
  performanceConfig?: {
    metric: 'fps' | 'memory' | 'cpu' | 'loadTime' | 'networkTime';
    target: number;
    threshold: number;
  };
  // 兼容性测试
  compatibilityConfig?: {
    devices: string[];
    browsers: string[];
    resolutions: { width: number; height: number }[];
  };
  // 标签
  tags: string[];
  enabled: boolean;
  // 录制信息
  recordedFrom?: string; // 用户录制来源
  recordedAt?: number;
}

// 测试结果
export interface TestResult {
  id: string;
  testCaseId: string;
  status: 'pass' | 'fail' | 'error' | 'skipped' | 'timeout';
  startTime: number;
  endTime: number;
  duration: number;
  // 详细信息
  steps: { name: string; status: 'pass' | 'fail' | 'skip'; message?: string; screenshot?: string; duration: number }[];
  // 错误
  error?: { message: string; stack?: string; screenshot?: string };
  // 性能数据
  performance?: {
    fps: { avg: number; min: number; max: number };
    memory: { used: number; peak: number };
    cpu: number;
  };
}

// 测试报告
export interface TestReport {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  totalCases: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  // 覆盖率
  coverage?: { lines: number; branches: number; functions: number };
}

// 性能基准
export interface PerformanceBaseline {
  id: string;
  name: string;
  metric: string;
  baseline: number;
  tolerance: number; // 百分比
  history: { value: number; timestamp: number; build: string }[];
  trend: 'improving' | 'stable' | 'regressing';
}

// 设备矩阵
export interface DeviceMatrix {
  id: string;
  name: string;
  devices: {
    name: string;
    os: string;
    osVersion: string;
    screenSize: { width: number; height: number };
    dpi: number;
    cpu: string;
    memory: number;
  }[];
  browsers: {
    name: string;
    version: string;
    engine: string;
  }[];
}

class AutoTestService {
  private testCases = new Map<string, TestCase>();
  private reports: TestReport[] = [];
  private baselines: PerformanceBaseline[] = [];
  private recording: { steps: TestCase['steps']; startTime: number } | null = null;
  private listeners = new Set<(event: string, data: any) => void>();

  constructor() {
    this.registerBuiltInTests();
    this.initBaselines();
  }

  // 注册内置测试
  private registerBuiltInTests(): void {
    const builtinTests: TestCase[] = [
      {
        id: 'app-startup',
        name: '应用启动测试',
        type: 'performance',
        description: '测试应用启动时间',
        performanceConfig: { metric: 'loadTime', target: 3000, threshold: 5000 },
        tags: ['critical', 'smoke'],
        enabled: true
      },
      {
        id: 'editor-fps',
        name: '编辑器帧率测试',
        type: 'performance',
        description: '编辑器在打开大文件时保持 60fps',
        performanceConfig: { metric: 'fps', target: 60, threshold: 30 },
        tags: ['performance'],
        enabled: true
      },
      {
        id: 'memory-leak',
        name: '内存泄漏测试',
        type: 'performance',
        description: '长时间运行无内存泄漏',
        performanceConfig: { metric: 'memory', target: 200, threshold: 500 },
        tags: ['performance', 'stability'],
        enabled: true
      },
      {
        id: 'mobile-compat',
        name: '移动端兼容性',
        type: 'compatibility',
        description: '在主流移动设备上正常运行',
        compatibilityConfig: {
          devices: ['iPhone 13', 'iPhone SE', 'Pixel 5', 'Xiaomi 11', 'Huawei P40'],
          browsers: ['Safari iOS', 'Chrome Android', '微信内置'],
          resolutions: [
            { width: 375, height: 667 },
            { width: 390, height: 844 },
            { width: 414, height: 896 }
          ]
        },
        tags: ['compatibility'],
        enabled: true
      }
    ];
    for (const test of builtinTests) {
      this.testCases.set(test.id, test);
    }
  }

  // 初始化基准
  private initBaselines(): void {
    this.baselines = [
      {
        id: 'startup-baseline',
        name: '启动时间',
        metric: 'loadTime',
        baseline: 2500,
        tolerance: 20,
        history: [
          { value: 2400, timestamp: Date.now() - 86400000 * 7, build: 'v1.0.0' },
          { value: 2350, timestamp: Date.now() - 86400000 * 5, build: 'v1.0.1' },
          { value: 2300, timestamp: Date.now() - 86400000 * 2, build: 'v1.0.2' }
        ],
        trend: 'improving'
      },
      {
        id: 'fps-baseline',
        name: '编辑器 FPS',
        metric: 'fps',
        baseline: 60,
        tolerance: 10,
        history: [
          { value: 58, timestamp: Date.now() - 86400000 * 7, build: 'v1.0.0' },
          { value: 60, timestamp: Date.now() - 86400000 * 3, build: 'v1.0.1' },
          { value: 60, timestamp: Date.now() - 86400000 * 1, build: 'v1.0.2' }
        ],
        trend: 'stable'
      }
    ];
  }

  // 添加测试用例
  addTestCase(testCase: Omit<TestCase, 'id'>): TestCase {
    const newCase: TestCase = {
      ...testCase,
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    };
    this.testCases.set(newCase.id, newCase);
    return newCase;
  }

  // 开始录制
  startRecording(): void {
    this.recording = { steps: [], startTime: Date.now() };
    this.notify('recording:started', null);
  }

  // 录制步骤
  recordStep(step: NonNullable<TestCase['steps']>[0]): void {
    if (!this.recording) return;
    this.recording.steps.push(step);
  }

  // 停止录制
  stopRecording(name: string, description: string): TestCase {
    if (!this.recording) throw new Error('没有正在进行的录制');
    const testCase: TestCase = {
      id: `test-rec-${Date.now()}`,
      name,
      description,
      type: 'ui-interaction',
      steps: this.recording.steps,
      tags: ['recorded'],
      enabled: true,
      recordedAt: Date.now()
    };
    this.testCases.set(testCase.id, testCase);
    this.recording = null;
    this.notify('recording:stopped', testCase);
    return testCase;
  }

  // 运行测试
  async runTest(testCaseId: string): Promise<TestResult> {
    const testCase = this.testCases.get(testCaseId);
    if (!testCase) throw new Error('测试用例不存在');
    if (!testCase.enabled) {
      return {
        id: `result-${Date.now()}`,
        testCaseId,
        status: 'skipped',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        steps: []
      };
    }

    const startTime = Date.now();
    const result: TestResult = {
      id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      testCaseId,
      status: 'pass',
      startTime,
      endTime: 0,
      duration: 0,
      steps: []
    };

    try {
      if (testCase.type === 'ui-interaction' && testCase.steps) {
        for (const step of testCase.steps) {
          const stepStart = Date.now();
          await this.executeStep(step, testCase);
          result.steps.push({
            name: `${step.type}${step.target ? ` ${step.target}` : ''}`,
            status: 'pass',
            duration: Date.now() - stepStart
          });
        }
      } else if (testCase.type === 'performance') {
        result.performance = await this.runPerformanceTest(testCase);
        // 验证
        if (testCase.performanceConfig) {
          const { metric, threshold, target } = testCase.performanceConfig;
          const value = metric === 'fps' ? result.performance.fps.avg
            : metric === 'memory' ? result.performance.memory.peak
            : metric === 'cpu' ? result.performance.cpu
            : 0;
          if (metric === 'fps' ? value < threshold : value > threshold) {
            result.status = 'fail';
          }
        }
      } else if (testCase.type === 'compatibility') {
        await this.runCompatibilityTest(testCase, result);
      }
    } catch (e: any) {
      result.status = 'error';
      result.error = { message: e.message, stack: e.stack };
    }

    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;
    return result;
  }

  // 执行步骤
  private async executeStep(step: NonNullable<TestCase['steps']>[0], testCase: TestCase): Promise<void> {
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    if (step.timeout && Math.random() < 0.05) {
      throw new Error(`步骤超时: ${step.type}`);
    }
  }

  // 运行性能测试
  private async runPerformanceTest(testCase: TestCase): Promise<TestResult['performance']> {
    // 模拟性能数据收集
    return {
      fps: { avg: 58 + Math.random() * 4, min: 45, max: 60 },
      memory: { used: 150 + Math.random() * 50, peak: 250 + Math.random() * 30 },
      cpu: 20 + Math.random() * 30
    };
  }

  // 运行兼容性测试
  private async runCompatibilityTest(testCase: TestCase, result: TestResult): Promise<void> {
    const configs = testCase.compatibilityConfig;
    if (!configs) return;
    for (const device of configs.devices) {
      const step = {
        name: `Device: ${device}`,
        status: Math.random() < 0.9 ? 'pass' as const : 'fail' as const,
        duration: 1000 + Math.random() * 2000
      };
      result.steps.push(step);
      if (step.status === 'fail') result.status = 'fail';
    }
  }

  // 运行所有测试
  async runAllTests(name: string = 'Test Run'): Promise<TestReport> {
    const testCases = Array.from(this.testCases.values()).filter(t => t.enabled);
    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const tc of testCases) {
      const result = await this.runTest(tc.id);
      results.push(result);
    }

    const report: TestReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      startTime,
      endTime: Date.now(),
      totalCases: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      errors: results.filter(r => r.status === 'error').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      duration: Date.now() - startTime,
      results
    };

    this.reports.push(report);
    this.notify('report:completed', report);
    return report;
  }

  // 检查性能回归
  checkPerformanceRegression(baselineId: string, currentValue: number): { regressed: boolean; delta: number; baseline: number } {
    const baseline = this.baselines.find(b => b.id === baselineId);
    if (!baseline) return { regressed: false, delta: 0, baseline: 0 };

    const delta = ((currentValue - baseline.baseline) / baseline.baseline) * 100;
    const regressed = Math.abs(delta) > baseline.tolerance;
    return { regressed, delta, baseline: baseline.baseline };
  }

  // 更新基准
  updateBaseline(baselineId: string, newValue: number, build: string): void {
    const baseline = this.baselines.find(b => b.id === baselineId);
    if (!baseline) return;
    baseline.baseline = newValue;
    baseline.history.push({ value: newValue, timestamp: Date.now(), build });
    if (baseline.history.length > 30) baseline.history = baseline.history.slice(-30);
    this.notify('baseline:updated', baseline);
  }

  // 列出测试
  listTestCases(filter?: { type?: TestType; enabled?: boolean; tag?: string }): TestCase[] {
    let cases = Array.from(this.testCases.values());
    if (filter?.type) cases = cases.filter(c => c.type === filter.type);
    if (filter?.enabled !== undefined) cases = cases.filter(c => c.enabled === filter.enabled);
    if (filter?.tag) cases = cases.filter(c => c.tags.includes(filter.tag));
    return cases;
  }

  // 获取报告
  getReport(reportId: string): TestReport | undefined {
    return this.reports.find(r => r.id === reportId);
  }

  // 列出报告
  listReports(limit: number = 20): TestReport[] {
    return this.reports.slice(-limit).reverse();
  }

  // 获取基准
  getBaselines(): PerformanceBaseline[] {
    return [...this.baselines];
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const autoTestService = new AutoTestService();
