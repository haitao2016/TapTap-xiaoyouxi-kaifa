/**
 * 小游戏数据分析服务
 * - TapTap 数据 API 集成
 * - 多维度指标：用户、留存、付费、行为、性能
 * - 图表数据生成：折线图、柱状图、饼图、漏斗图
 * - 实时数据模拟与流式更新
 * - 自定义时间范围与粒度
 * - 同比环比分析
 */
import { globalEventBus } from '../event-bus';
import { tapTapAuthService } from './taptap-auth-service';

export interface AnalyticsQuery {
  appId: string;
  startDate: string;
  endDate: string;
  metrics: MetricType[];
  granularity: 'hour' | 'day' | 'week' | 'month';
  dimensions?: DimensionType[];
  filters?: Record<string, string>;
}

export type MetricType =
  | 'dau'
  | 'mau'
  | 'new_users'
  | 'retention_d1'
  | 'retention_d3'
  | 'retention_d7'
  | 'retention_d14'
  | 'retention_d30'
  | 'revenue'
  | 'arppu'
  | 'arpu'
  | 'paying_users'
  | 'pay_rate'
  | 'crash_rate'
  | 'anr_rate'
  | 'session_duration'
  | 'session_count'
  | 'page_views'
  | 'unique_devices'
  | 'avg_online_time'
  | 'level_completion_rate'
  | 'tutorial_completion_rate'
  | 'ad_impressions'
  | 'ad_clicks'
  | 'ad_revenue'
  | 'share_count'
  | 'invite_count';

export type DimensionType =
  | 'platform'
  | 'channel'
  | 'region'
  | 'version'
  | 'device_model'
  | 'os_version'
  | 'network_type'
  | 'user_level'
  | 'pay_level';

export interface DataPoint {
  date: string;
  values: Partial<Record<MetricType, number>>;
  dimensions?: Partial<Record<DimensionType, string>>;
}

export interface AnalyticsResult {
  appId: string;
  range: { start: string; end: string };
  granularity: string;
  series: DataPoint[];
  changes: {
    daily: Partial<Record<MetricType, number>>;
    weekly: Partial<Record<MetricType, number>>;
    monthly: Partial<Record<MetricType, number>>;
  };
  totals: Partial<Record<MetricType, number>>;
  averages: Partial<Record<MetricType, number>>;
  peaks: Partial<Record<MetricType, { value: number; date: string }>>;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'funnel' | 'area';
  title: string;
  xAxis?: string[];
  series: { name: string; data: number[]; color?: string }[];
  legend?: string[];
}

export interface RealtimeMetric {
  metric: MetricType;
  value: number;
  timestamp: number;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
}

const METRIC_LABELS: Record<MetricType, string> = {
  dau: '日活',
  mau: '月活跃用户',
  new_users: '新增用户',
  retention_d1: '次日留存率',
  retention_d3: '3日留存率',
  retention_d7: '7日留存率',
  retention_d14: '14日留存率',
  retention_d30: '30日留存率',
  revenue: '总收入',
  arppu: '每付费用户平均收入',
  arpu: '每用户平均收入',
  paying_users: '付费用户数',
  pay_rate: '付费率',
  crash_rate: '崩溃率',
  anr_rate: 'ANR率',
  session_duration: '平均单次时长(秒)',
  session_count: '会话次数',
  page_views: '页面浏览量',
  unique_devices: '独立设备数',
  avg_online_time: '平均在线时长(分)',
  level_completion_rate: '关卡完成率',
  tutorial_completion_rate: '新手完成率',
  ad_impressions: '广告曝光量',
  ad_clicks: '广告点击量',
  ad_revenue: '广告收入',
  share_count: '分享次数',
  invite_count: '邀请次数',
};

const METRIC_CATEGORIES: Record<string, MetricType[]> = {
  用户: ['dau', 'mau', 'new_users', 'unique_devices'],
  留存: ['retention_d1', 'retention_d3', 'retention_d7', 'retention_d14', 'retention_d30'],
  付费: ['revenue', 'arppu', 'arpu', 'paying_users', 'pay_rate'],
  行为: ['session_duration', 'session_count', 'page_views', 'avg_online_time'],
  性能: ['crash_rate', 'anr_rate'],
  游戏: ['level_completion_rate', 'tutorial_completion_rate'],
  广告: ['ad_impressions', 'ad_clicks', 'ad_revenue'],
  社交: ['share_count', 'invite_count'],
};

const DIMENSION_LABELS: Record<DimensionType, string> = {
  platform: '平台',
  channel: '渠道',
  region: '地区',
  version: '版本',
  device_model: '设备型号',
  os_version: '系统版本',
  network_type: '网络类型',
  user_level: '用户等级',
  pay_level: '付费等级',
};

export class AnalyticsService {
  private realtimeTimers = new Map<string, ReturnType<typeof setInterval>>();
  private realtimeCache = new Map<string, RealtimeMetric[]>();

  async query(q: AnalyticsQuery): Promise<AnalyticsResult> {
    const account = tapTapAuthService.getActiveAccount();
    if (!account) {
      return this.mockData(q);
    }
    try {
      const url = new URL('https://api.taptap.cn/minigame/v1/analytics');
      url.searchParams.set('app_id', q.appId);
      url.searchParams.set('start_date', q.startDate);
      url.searchParams.set('end_date', q.endDate);
      url.searchParams.set('granularity', q.granularity);
      url.searchParams.set('metrics', q.metrics.join(','));
      if (q.dimensions?.length) {
        url.searchParams.set('dimensions', q.dimensions.join(','));
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      });
      if (!res.ok) return this.mockData(q);
      const data = (await res.json()) as {
        data: {
          series: DataPoint[];
          totals: Partial<Record<MetricType, number>>;
          changes: {
            daily: Partial<Record<MetricType, number>>;
            weekly: Partial<Record<MetricType, number>>;
            monthly: Partial<Record<MetricType, number>>;
          };
        };
      };
      return {
        appId: q.appId,
        range: { start: q.startDate, end: q.endDate },
        granularity: q.granularity,
        series: data.data.series,
        changes: data.data.changes,
        totals: data.data.totals,
        averages: this.calculateAverages(data.data.series, q.metrics),
        peaks: this.calculatePeaks(data.data.series, q.metrics),
      };
    } catch {
      return this.mockData(q);
    }
  }

  getMetricLabel(metric: MetricType): string {
    return METRIC_LABELS[metric];
  }

  listMetrics(): { type: MetricType; label: string; category: string }[] {
    const result: { type: MetricType; label: string; category: string }[] = [];
    for (const [category, metrics] of Object.entries(METRIC_CATEGORIES)) {
      for (const m of metrics) {
        result.push({ type: m, label: METRIC_LABELS[m], category });
      }
    }
    return result;
  }

  listMetricCategories(): string[] {
    return Object.keys(METRIC_CATEGORIES);
  }

  getMetricsByCategory(category: string): MetricType[] {
    return METRIC_CATEGORIES[category] ?? [];
  }

  getDimensionLabel(dimension: DimensionType): string {
    return DIMENSION_LABELS[dimension];
  }

  listDimensions(): { type: DimensionType; label: string }[] {
    return Object.entries(DIMENSION_LABELS).map(([type, label]) => ({
      type: type as DimensionType,
      label,
    }));
  }

  generateLineChart(result: AnalyticsResult, metrics: MetricType[]): ChartData {
    return {
      type: 'line',
      title: metrics.map((m) => METRIC_LABELS[m]).join(' vs '),
      xAxis: result.series.map((p) => p.date),
      series: metrics.map((metric) => ({
        name: METRIC_LABELS[metric],
        data: result.series.map((p) => p.values[metric] ?? 0),
      })),
      legend: metrics.map((m) => METRIC_LABELS[m]),
    };
  }

  generateBarChart(result: AnalyticsResult, metric: MetricType): ChartData {
    return {
      type: 'bar',
      title: METRIC_LABELS[metric] + ' 分布',
      xAxis: result.series.map((p) => p.date),
      series: [
        {
          name: METRIC_LABELS[metric],
          data: result.series.map((p) => p.values[metric] ?? 0),
        },
      ],
    };
  }

  generatePieChart(
    result: AnalyticsResult,
    metric: MetricType,
    dimension: DimensionType
  ): ChartData {
    const dimensionData = new Map<string, number>();
    for (const point of result.series) {
      const dimValue = point.dimensions?.[dimension] ?? '未知';
      const current = dimensionData.get(dimValue) ?? 0;
      dimensionData.set(dimValue, current + (point.values[metric] ?? 0));
    }
    const entries = Array.from(dimensionData.entries()).sort((a, b) => b[1] - a[1]);
    return {
      type: 'pie',
      title: `${METRIC_LABELS[metric]} - ${DIMENSION_LABELS[dimension]}分布`,
      series: [
        {
          name: METRIC_LABELS[metric],
          data: entries.map(([, v]) => v),
        },
      ],
      legend: entries.map(([k]) => k),
    };
  }

  generateFunnelChart(steps: { name: string; value: number }[]): ChartData {
    return {
      type: 'funnel',
      title: '转化漏斗',
      series: [
        {
          name: '用户数',
          data: steps.map((s) => s.value),
        },
      ],
      legend: steps.map((s) => s.name),
    };
  }

  startRealtimeStream(
    appId: string,
    metrics: MetricType[],
    callback: (metrics: RealtimeMetric[]) => void
  ): () => void {
    const key = `${appId}-${metrics.join(',')}`;
    if (this.realtimeTimers.has(key)) {
      return () => this.stopRealtimeStream(appId, metrics);
    }

    const generateSnapshot = (): RealtimeMetric[] => {
      return metrics.map((metric) => {
        const baseValue = this.getMockBaseValue(metric);
        const variation = baseValue * (Math.random() * 0.2 - 0.1);
        const value = Math.max(0, baseValue + variation);
        const changePercent = Math.random() * 20 - 10;
        return {
          metric,
          value: Math.round(value * 100) / 100,
          timestamp: Date.now(),
          trend: changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'flat',
          changePercent: Math.round(changePercent * 100) / 100,
        };
      });
    };

    const initial = generateSnapshot();
    this.realtimeCache.set(key, initial);
    callback(initial);

    const timer = setInterval(() => {
      const snapshot = generateSnapshot();
      this.realtimeCache.set(key, snapshot);
      callback(snapshot);
      globalEventBus.emit({ type: 'analytics:realtime', payload: { appId, metrics: snapshot } });
    }, 5000);

    this.realtimeTimers.set(key, timer);

    return () => this.stopRealtimeStream(appId, metrics);
  }

  stopRealtimeStream(appId: string, metrics: MetricType[]): void {
    const key = `${appId}-${metrics.join(',')}`;
    const timer = this.realtimeTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.realtimeTimers.delete(key);
    }
    this.realtimeCache.delete(key);
  }

  getRealtimeCache(appId: string, metrics: MetricType[]): RealtimeMetric[] | undefined {
    const key = `${appId}-${metrics.join(',')}`;
    return this.realtimeCache.get(key);
  }

  private calculateAverages(
    series: DataPoint[],
    metrics: MetricType[]
  ): Partial<Record<MetricType, number>> {
    const averages: Partial<Record<MetricType, number>> = {};
    for (const m of metrics) {
      const values = series.map((p) => p.values[m] ?? 0).filter((v) => v > 0);
      if (values.length > 0) {
        averages[m] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    }
    return averages;
  }

  private calculatePeaks(
    series: DataPoint[],
    metrics: MetricType[]
  ): Partial<Record<MetricType, { value: number; date: string }>> {
    const peaks: Partial<Record<MetricType, { value: number; date: string }>> = {};
    for (const m of metrics) {
      let peak = { value: 0, date: '' };
      for (const p of series) {
        const v = p.values[m] ?? 0;
        if (v > peak.value) {
          peak = { value: v, date: p.date };
        }
      }
      if (peak.value > 0) {
        peaks[m] = peak;
      }
    }
    return peaks;
  }

  private getMockBaseValue(metric: MetricType): number {
    const baseValues: Record<MetricType, number> = {
      dau: 5000,
      mau: 50000,
      new_users: 800,
      retention_d1: 0.45,
      retention_d3: 0.3,
      retention_d7: 0.2,
      retention_d14: 0.15,
      retention_d30: 0.1,
      revenue: 15000,
      arppu: 89,
      arpu: 3,
      paying_users: 168,
      pay_rate: 0.0336,
      crash_rate: 0.005,
      anr_rate: 0.002,
      session_duration: 240,
      session_count: 15000,
      page_views: 45000,
      unique_devices: 4800,
      avg_online_time: 32,
      level_completion_rate: 0.65,
      tutorial_completion_rate: 0.78,
      ad_impressions: 80000,
      ad_clicks: 2400,
      ad_revenue: 3200,
      share_count: 450,
      invite_count: 280,
    };
    return baseValues[metric] ?? 0;
  }

  private mockData(q: AnalyticsQuery): AnalyticsResult {
    const start = new Date(q.startDate);
    const end = new Date(q.endDate);
    const series: DataPoint[] = [];
    const cursor = new Date(start);
    let day = 0;

    const stepMs =
      q.granularity === 'hour'
        ? 3600_000
        : q.granularity === 'week'
          ? 7 * 86400_000
          : q.granularity === 'month'
            ? 30 * 86400_000
            : 86400_000;

    while (cursor <= end) {
      const baseDau = 1000 + Math.sin(day / 5) * 300 + day * 10;
      const values: Partial<Record<MetricType, number>> = {};
      for (const m of q.metrics) {
        values[m] = this.generateMockMetric(m, baseDau, day);
      }
      series.push({
        date: cursor.toISOString().slice(0, q.granularity === 'hour' ? 16 : 10),
        values,
      });
      cursor.setTime(cursor.getTime() + stepMs);
      day++;
    }

    const totals: Partial<Record<MetricType, number>> = {};
    for (const m of q.metrics) {
      totals[m] = series.reduce((sum, p) => sum + (p.values[m] ?? 0), 0);
    }

    return {
      appId: q.appId,
      range: { start: q.startDate, end: q.endDate },
      granularity: q.granularity,
      series,
      changes: {
        daily: Object.fromEntries(
          q.metrics.map((m) => [m, 0.12 + Math.random() * 0.05])
        ) as Partial<Record<MetricType, number>>,
        weekly: Object.fromEntries(
          q.metrics.map((m) => [m, 0.08 + Math.random() * 0.04])
        ) as Partial<Record<MetricType, number>>,
        monthly: Object.fromEntries(
          q.metrics.map((m) => [m, 0.15 + Math.random() * 0.06])
        ) as Partial<Record<MetricType, number>>,
      },
      totals,
      averages: this.calculateAverages(series, q.metrics),
      peaks: this.calculatePeaks(series, q.metrics),
    };
  }

  private generateMockMetric(metric: MetricType, baseDau: number, day: number): number {
    const rand = () => 0.9 + Math.random() * 0.2;
    switch (metric) {
      case 'dau':
        return Math.round(baseDau);
      case 'mau':
        return Math.round(baseDau * 12);
      case 'new_users':
        return Math.round(baseDau * 0.2);
      case 'unique_devices':
        return Math.round(baseDau * 0.96);
      case 'retention_d1':
        return 0.4 + Math.random() * 0.1;
      case 'retention_d3':
        return 0.28 + Math.random() * 0.08;
      case 'retention_d7':
        return 0.18 + Math.random() * 0.06;
      case 'retention_d14':
        return 0.12 + Math.random() * 0.04;
      case 'retention_d30':
        return 0.08 + Math.random() * 0.03;
      case 'revenue':
        return Math.round(baseDau * 0.5 * rand());
      case 'arppu':
        return 25 + Math.random() * 10;
      case 'arpu':
        return 2 + Math.random() * 1;
      case 'paying_users':
        return Math.round(baseDau * 0.03 * rand());
      case 'pay_rate':
        return 0.03 + Math.random() * 0.01;
      case 'crash_rate':
        return Math.random() * 0.015;
      case 'anr_rate':
        return Math.random() * 0.008;
      case 'session_duration':
        return 180 + Math.random() * 120;
      case 'session_count':
        return Math.round(baseDau * 3 * rand());
      case 'page_views':
        return Math.round(baseDau * 9 * rand());
      case 'avg_online_time':
        return 25 + Math.random() * 15;
      case 'level_completion_rate':
        return 0.6 + Math.random() * 0.15;
      case 'tutorial_completion_rate':
        return 0.75 + Math.random() * 0.1;
      case 'ad_impressions':
        return Math.round(baseDau * 16 * rand());
      case 'ad_clicks':
        return Math.round(baseDau * 0.5 * rand());
      case 'ad_revenue':
        return Math.round(baseDau * 0.6 * rand());
      case 'share_count':
        return Math.round(baseDau * 0.09 * rand());
      case 'invite_count':
        return Math.round(baseDau * 0.05 * rand());
      default:
        return 0;
    }
  }
}

export const analyticsService = new AnalyticsService();
