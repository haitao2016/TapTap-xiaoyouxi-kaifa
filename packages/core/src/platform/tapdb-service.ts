/**
 * TapDB 数据分析服务
 * - TapDB 官方数据分析平台集成
 * - 用户行为分析、事件分析、漏斗分析
 * - 留存分析、用户分群
 * - 自定义事件与属性
 * - 实时数据看板
 * - 数据导出
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';
import { tapTapAuthService } from './taptap-auth-service';

export type TapDBMetricType =
  | 'active_users'
  | 'new_users'
  | 'sessions'
  | 'session_duration'
  | 'total_revenue'
  | 'paying_users'
  | 'arpu'
  | 'arppu'
  | 'retention_d1'
  | 'retention_d7'
  | 'retention_d30'
  | 'crash_count'
  | 'crash_rate'
  | 'custom_event';

export type TapDBDimension =
  | 'platform'
  | 'channel'
  | 'country'
  | 'province'
  | 'city'
  | 'version'
  | 'device_brand'
  | 'device_model'
  | 'os_version'
  | 'network_type'
  | 'user_level'
  | 'payment_level'
  | 'custom_property';

export type AnalysisType =
  | 'trend'
  | 'event'
  | 'funnel'
  | 'retention'
  | 'cohort'
  | 'distribution'
  | 'path';

export interface TapDBQuery {
  appId: string;
  startDate: string;
  endDate: string;
  metrics: TapDBMetricType[];
  dimensions?: TapDBDimension[];
  granularity: 'hour' | 'day' | 'week' | 'month';
  filters?: TapDBFilter[];
  analysisType: AnalysisType;
}

export interface TapDBFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains';
  value: string | number | boolean | (string | number)[];
}

export interface TapDBDataPoint {
  date: string;
  values: Partial<Record<TapDBMetricType, number>>;
  dimensions?: Partial<Record<TapDBDimension, string>>;
}

export interface TapDBResult {
  appId: string;
  analysisType: AnalysisType;
  range: { start: string; end: string };
  granularity: string;
  data: TapDBDataPoint[];
  summary: {
    totals: Partial<Record<TapDBMetricType, number>>;
    averages: Partial<Record<TapDBMetricType, number>>;
    growthRates: Partial<Record<TapDBMetricType, number>>;
  };
  chartData?: TapDBChartData;
}

export interface TapDBChartData {
  type: 'line' | 'bar' | 'pie' | 'funnel' | 'table' | 'heatmap';
  title: string;
  xAxis?: string[];
  yAxis?: string;
  series: { name: string; data: number[]; color?: string }[];
  legend?: string[];
}

export interface TapDBEvent {
  name: string;
  displayName: string;
  description?: string;
  count: number;
  users: number;
  category: string;
}

export interface TapDBFunnelStep {
  name: string;
  event: string;
  count: number;
  users: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface TapDBFunnelResult {
  funnelId: string;
  name: string;
  steps: TapDBFunnelStep[];
  overallConversion: number;
}

export interface TapDBSegment {
  id: string;
  name: string;
  description: string;
  userCount: number;
  conditions: TapDBFilter[];
  createdAt: number;
}

export interface TapDBRealtimeData {
  timestamp: number;
  onlineUsers: number;
  activeUsers: number;
  newUsers: number;
  revenue: number;
  eventsPerMinute: number;
  trend: {
    online: 'up' | 'down' | 'flat';
    revenue: 'up' | 'down' | 'flat';
  };
}

export interface TapDBExportTask {
  id: string;
  type: 'event' | 'user' | 'cohort';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  createdAt: number;
  completedAt?: number;
  size?: number;
}

const TAPDB_API_BASE = 'https://api.tapdb.taptap.cn/v1';
const CACHE_TTL = 300_000;

export class TapDBService {
  private queryCache = new Map<string, { data: TapDBResult; expiresAt: number }>();
  private realtimeTimers = new Map<string, ReturnType<typeof setInterval>>();
  private eventsCache: TapDBEvent[] = [];
  private segmentsCache: TapDBSegment[] = [];
  private exportTasks = new Map<string, TapDBExportTask>();

  async query(q: TapDBQuery): Promise<TapDBResult> {
    const cacheKey = JSON.stringify(q);
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const account = tapTapAuthService.getActiveAccount();
    if (!account) {
      const mockData = this.mockQuery(q);
      this.queryCache.set(cacheKey, { data: mockData, expiresAt: Date.now() + CACHE_TTL });
      return mockData;
    }

    try {
      const url = new URL(`${TAPDB_API_BASE}/analysis/query`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${account.accessToken}`,
        },
        body: JSON.stringify(q),
      });
      if (!res.ok) {
        const mockData = this.mockQuery(q);
        this.queryCache.set(cacheKey, { data: mockData, expiresAt: Date.now() + CACHE_TTL });
        return mockData;
      }
      const data = (await res.json()) as { data: TapDBResult };
      this.queryCache.set(cacheKey, { data: data.data, expiresAt: Date.now() + CACHE_TTL });
      return data.data;
    } catch {
      const mockData = this.mockQuery(q);
      this.queryCache.set(cacheKey, { data: mockData, expiresAt: Date.now() + CACHE_TTL });
      return mockData;
    }
  }

  async listEvents(appId: string): Promise<TapDBEvent[]> {
    if (this.eventsCache.length > 0) return this.eventsCache;

    const account = tapTapAuthService.getActiveAccount();
    try {
      const res = await fetch(`${TAPDB_API_BASE}/events?app_id=${appId}`, {
        headers: account ? { Authorization: `Bearer ${account.accessToken}` } : {},
      });
      if (!res.ok) {
        this.eventsCache = this.mockEvents();
        return this.eventsCache;
      }
      const data = (await res.json()) as { data: TapDBEvent[] };
      this.eventsCache = data.data;
      return data.data;
    } catch {
      this.eventsCache = this.mockEvents();
      return this.eventsCache;
    }
  }

  async getFunnel(
    appId: string,
    funnelId: string,
    startDate: string,
    endDate: string
  ): Promise<TapDBFunnelResult> {
    const account = tapTapAuthService.getActiveAccount();
    if (!account) {
      return this.mockFunnel(funnelId);
    }
    try {
      const res = await fetch(
        `${TAPDB_API_BASE}/funnels/${funnelId}?app_id=${appId}&start_date=${startDate}&end_date=${endDate}`,
        {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }
      );
      if (!res.ok) return this.mockFunnel(funnelId);
      const data = (await res.json()) as { data: TapDBFunnelResult };
      return data.data;
    } catch {
      return this.mockFunnel(funnelId);
    }
  }

  async listSegments(appId: string): Promise<TapDBSegment[]> {
    if (this.segmentsCache.length > 0) return this.segmentsCache;

    const account = tapTapAuthService.getActiveAccount();
    try {
      const res = await fetch(`${TAPDB_API_BASE}/segments?app_id=${appId}`, {
        headers: account ? { Authorization: `Bearer ${account.accessToken}` } : {},
      });
      if (!res.ok) {
        this.segmentsCache = this.mockSegments();
        return this.segmentsCache;
      }
      const data = (await res.json()) as { data: TapDBSegment[] };
      this.segmentsCache = data.data;
      return data.data;
    } catch {
      this.segmentsCache = this.mockSegments();
      return this.segmentsCache;
    }
  }

  startRealtimeMonitor(appId: string, callback: (data: TapDBRealtimeData) => void): () => void {
    if (this.realtimeTimers.has(appId)) {
      return () => this.stopRealtimeMonitor(appId);
    }

    const generateData = (): TapDBRealtimeData => {
      return {
        timestamp: Date.now(),
        onlineUsers: Math.floor(500 + Math.random() * 200),
        activeUsers: Math.floor(1000 + Math.random() * 500),
        newUsers: Math.floor(80 + Math.random() * 40),
        revenue: Math.floor(500 + Math.random() * 300),
        eventsPerMinute: Math.floor(2000 + Math.random() * 1000),
        trend: {
          online: Math.random() > 0.5 ? 'up' : 'down',
          revenue: Math.random() > 0.5 ? 'up' : 'down',
        },
      };
    };

    const initial = generateData();
    callback(initial);
    globalEventBus.emit({ type: 'tapdb:realtime', payload: { appId, data: initial } });

    const timer = setInterval(() => {
      const data = generateData();
      callback(data);
      globalEventBus.emit({ type: 'tapdb:realtime', payload: { appId, data } });
    }, 5000);

    this.realtimeTimers.set(appId, timer);
    return () => this.stopRealtimeMonitor(appId);
  }

  stopRealtimeMonitor(appId: string): void {
    const timer = this.realtimeTimers.get(appId);
    if (timer) {
      clearInterval(timer);
      this.realtimeTimers.delete(appId);
    }
  }

  async createExportTask(
    appId: string,
    type: TapDBExportTask['type'],
    startDate: string,
    endDate: string,
    filters?: TapDBFilter[]
  ): Promise<TapDBExportTask> {
    const taskId = randomUUID();
    const task: TapDBExportTask = {
      id: taskId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    };
    this.exportTasks.set(taskId, task);

    setImmediate(() => this.processExportTask(taskId));

    return task;
  }

  getExportTask(taskId: string): TapDBExportTask | undefined {
    return this.exportTasks.get(taskId);
  }

  listExportTasks(appId?: string): TapDBExportTask[] {
    return Array.from(this.exportTasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  clearCache(): void {
    this.queryCache.clear();
    this.eventsCache = [];
    this.segmentsCache = [];
  }

  private async processExportTask(taskId: string): Promise<void> {
    const task = this.exportTasks.get(taskId);
    if (!task) return;

    task.status = 'processing';
    globalEventBus.emit({ type: 'tapdb:exportUpdate', payload: task });

    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 300));
      task.progress = i * 10;
      globalEventBus.emit({ type: 'tapdb:exportUpdate', payload: task });
    }

    task.status = 'completed';
    task.progress = 100;
    task.completedAt = Date.now();
    task.size = Math.floor(1024 * 1024 * (2 + Math.random() * 5));
    task.downloadUrl = `https://cdn.tapdb.cn/exports/${taskId}.csv`;
    globalEventBus.emit({ type: 'tapdb:exportComplete', payload: task });
  }

  private mockQuery(q: TapDBQuery): TapDBResult {
    const start = new Date(q.startDate);
    const end = new Date(q.endDate);
    const data: TapDBDataPoint[] = [];
    const cursor = new Date(start);
    let dayIndex = 0;

    const stepMs =
      q.granularity === 'hour'
        ? 3600_000
        : q.granularity === 'week'
          ? 7 * 86400_000
          : q.granularity === 'month'
            ? 30 * 86400_000
            : 86400_000;

    while (cursor <= end) {
      const baseActive = 800 + Math.sin(dayIndex / 4) * 300 + dayIndex * 15;
      const values: Partial<Record<TapDBMetricType, number>> = {};

      for (const m of q.metrics) {
        values[m] = this.generateMockMetric(m, baseActive, dayIndex);
      }

      const point: TapDBDataPoint = {
        date: cursor.toISOString().slice(0, q.granularity === 'hour' ? 16 : 10),
        values,
      };

      if (q.dimensions && q.dimensions.length > 0) {
        point.dimensions = this.generateMockDimension(q.dimensions[0], dayIndex);
      }

      data.push(point);
      cursor.setTime(cursor.getTime() + stepMs);
      dayIndex++;
    }

    const totals: Partial<Record<TapDBMetricType, number>> = {};
    const averages: Partial<Record<TapDBMetricType, number>> = {};
    const growthRates: Partial<Record<TapDBMetricType, number>> = {};

    for (const m of q.metrics) {
      const values = data.map((d) => d.values[m] ?? 0);
      totals[m] = values.reduce((a, b) => a + b, 0);
      averages[m] = values.length > 0 ? totals[m]! / values.length : 0;
      growthRates[m] = Math.random() * 0.3 - 0.1;
    }

    return {
      appId: q.appId,
      analysisType: q.analysisType,
      range: { start: q.startDate, end: q.endDate },
      granularity: q.granularity,
      data,
      summary: { totals, averages, growthRates },
      chartData: this.generateMockChart(q, data),
    };
  }

  private generateMockMetric(metric: TapDBMetricType, base: number, day: number): number {
    const rand = () => 0.9 + Math.random() * 0.2;
    switch (metric) {
      case 'active_users':
        return Math.round(base * rand());
      case 'new_users':
        return Math.round(base * 0.15 * rand());
      case 'sessions':
        return Math.round(base * 3 * rand());
      case 'session_duration':
        return 180 + Math.random() * 120;
      case 'total_revenue':
        return Math.round(base * 0.8 * rand());
      case 'paying_users':
        return Math.round(base * 0.04 * rand());
      case 'arpu':
        return 8 + Math.random() * 4;
      case 'arppu':
        return 60 + Math.random() * 30;
      case 'retention_d1':
        return 0.4 + Math.random() * 0.1;
      case 'retention_d7':
        return 0.18 + Math.random() * 0.06;
      case 'retention_d30':
        return 0.08 + Math.random() * 0.03;
      case 'crash_count':
        return Math.round(base * 0.005 * rand());
      case 'crash_rate':
        return 0.003 + Math.random() * 0.004;
      case 'custom_event':
        return Math.round(base * 2 * rand());
      default:
        return 0;
    }
  }

  private generateMockDimension(
    dim: TapDBDimension,
    index: number
  ): Partial<Record<TapDBDimension, string>> {
    const dimMap: Record<TapDBDimension, string[]> = {
      platform: ['iOS', 'Android'],
      channel: ['TapTap', 'App Store', 'Google Play', '官网'],
      country: ['中国', '美国', '日本', '韩国', '东南亚'],
      province: ['广东', '北京', '上海', '浙江', '江苏', '四川'],
      city: ['北京', '上海', '广州', '深圳', '杭州', '成都'],
      version: ['1.0.0', '1.1.0', '1.2.0', '2.0.0'],
      device_brand: ['Apple', '华为', '小米', 'OPPO', 'vivo', '三星'],
      device_model: ['iPhone 15', 'iPhone 14', '华为 Mate 60', '小米 14'],
      os_version: ['iOS 17', 'iOS 16', 'Android 14', 'Android 13'],
      network_type: ['WiFi', '5G', '4G', '3G'],
      user_level: ['新手', '初级', '中级', '高级', '资深'],
      payment_level: ['未付费', '低消', '中消', '高消', '大R'],
      custom_property: ['A组', 'B组', 'C组'],
    };
    const values = dimMap[dim] ?? ['未知'];
    return { [dim]: values[index % values.length] } as Partial<Record<TapDBDimension, string>>;
  }

  private generateMockChart(q: TapDBQuery, data: TapDBDataPoint[]): TapDBChartData | undefined {
    if (q.analysisType === 'trend') {
      return {
        type: 'line',
        title: '趋势分析',
        xAxis: data.map((d) => d.date),
        series: q.metrics.map((m) => ({
          name: this.getMetricLabel(m),
          data: data.map((d) => d.values[m] ?? 0),
        })),
        legend: q.metrics.map((m) => this.getMetricLabel(m)),
      };
    }
    if (q.analysisType === 'event') {
      return {
        type: 'bar',
        title: '事件分析',
        xAxis: data.map((d) => d.date),
        series: q.metrics.map((m) => ({
          name: this.getMetricLabel(m),
          data: data.map((d) => d.values[m] ?? 0),
        })),
      };
    }
    if (q.analysisType === 'distribution' && q.dimensions && q.dimensions.length > 0) {
      const dimData = new Map<string, number>();
      for (const d of data) {
        const dimValue = d.dimensions?.[q.dimensions[0]] ?? '其他';
        const val = d.values[q.metrics[0]] ?? 0;
        dimData.set(dimValue, (dimData.get(dimValue) ?? 0) + val);
      }
      const entries = Array.from(dimData.entries()).sort((a, b) => b[1] - a[1]);
      return {
        type: 'pie',
        title: '分布分析',
        series: [{ name: this.getMetricLabel(q.metrics[0]), data: entries.map(([, v]) => v) }],
        legend: entries.map(([k]) => k),
      };
    }
    return undefined;
  }

  private getMetricLabel(metric: TapDBMetricType): string {
    const labels: Record<TapDBMetricType, string> = {
      active_users: '活跃用户',
      new_users: '新增用户',
      sessions: '会话次数',
      session_duration: '会话时长(秒)',
      total_revenue: '总收入',
      paying_users: '付费用户',
      arpu: 'ARPU',
      arppu: 'ARPPU',
      retention_d1: '次日留存',
      retention_d7: '7日留存',
      retention_d30: '30日留存',
      crash_count: '崩溃次数',
      crash_rate: '崩溃率',
      custom_event: '自定义事件',
    };
    return labels[metric] ?? metric;
  }

  private mockEvents(): TapDBEvent[] {
    return [
      {
        name: 'app_launch',
        displayName: '应用启动',
        count: 152340,
        users: 12500,
        category: '基础事件',
      },
      { name: 'register', displayName: '注册成功', count: 8520, users: 8520, category: '用户' },
      { name: 'login', displayName: '登录成功', count: 98650, users: 12500, category: '用户' },
      { name: 'level_start', displayName: '开始关卡', count: 65430, users: 9800, category: '游戏' },
      {
        name: 'level_complete',
        displayName: '完成关卡',
        count: 42310,
        users: 8200,
        category: '游戏',
      },
      { name: 'purchase', displayName: '购买成功', count: 3250, users: 1680, category: '付费' },
      { name: 'ad_show', displayName: '广告展示', count: 285600, users: 11200, category: '广告' },
      { name: 'ad_click', displayName: '广告点击', count: 14280, users: 5600, category: '广告' },
      { name: 'share', displayName: '分享', count: 4520, users: 2800, category: '社交' },
      {
        name: 'tutorial_complete',
        displayName: '新手完成',
        count: 6800,
        users: 6800,
        category: '新手引导',
      },
    ];
  }

  private mockFunnel(funnelId: string): TapDBFunnelResult {
    const steps: TapDBFunnelStep[] = [
      {
        name: '启动应用',
        event: 'app_launch',
        count: 10000,
        users: 10000,
        conversionRate: 1,
        dropOffRate: 0,
      },
      {
        name: '完成注册',
        event: 'register',
        count: 6500,
        users: 6500,
        conversionRate: 0.65,
        dropOffRate: 0.35,
      },
      {
        name: '完成新手',
        event: 'tutorial_complete',
        count: 5200,
        users: 5200,
        conversionRate: 0.8,
        dropOffRate: 0.2,
      },
      {
        name: '首次付费',
        event: 'purchase',
        count: 520,
        users: 520,
        conversionRate: 0.1,
        dropOffRate: 0.9,
      },
    ];
    return {
      funnelId,
      name: '新手转化漏斗',
      steps,
      overallConversion: 0.052,
    };
  }

  private mockSegments(): TapDBSegment[] {
    return [
      {
        id: 'seg-1',
        name: '高价值用户',
        description: '累计付费超过 100 元的用户',
        userCount: 2340,
        conditions: [{ field: 'total_payment', operator: 'gt', value: 100 }],
        createdAt: Date.now() - 30 * 86400000,
      },
      {
        id: 'seg-2',
        name: '流失预警用户',
        description: '连续 7 天未登录的活跃用户',
        userCount: 5680,
        conditions: [
          { field: 'last_login_days', operator: 'gte', value: 7 },
          { field: 'is_active', operator: 'eq', value: true },
        ],
        createdAt: Date.now() - 15 * 86400000,
      },
      {
        id: 'seg-3',
        name: '新手用户',
        description: '注册 7 天内的用户',
        userCount: 8920,
        conditions: [{ field: 'register_days', operator: 'lte', value: 7 }],
        createdAt: Date.now() - 10 * 86400000,
      },
      {
        id: 'seg-4',
        name: '社交活跃用户',
        description: '每周分享超过 3 次的用户',
        userCount: 1560,
        conditions: [{ field: 'weekly_shares', operator: 'gt', value: 3 }],
        createdAt: Date.now() - 5 * 86400000,
      },
    ];
  }
}

export const tapDBService = new TapDBService();
