/**
 * A/B测试服务
 * - 实验管理：创建/编辑/删除/启停实验
 * - 实验配置：实验名称、描述、流量占比、实验分组
 * - 变量管理：实验变量、变量类型（数字/字符串/布尔/JSON）、默认值
 * - 流量分桶：用户分桶算法、哈希分配、流量控制
 * - 指标管理：核心指标、次要指标、指标类型（转化率/均值/留存）
 * - 实验数据：用户数、转化数、转化率、置信度、p值
 * - 统计显著性：Z检验、T检验、置信区间计算
 * - 多实验并行：互斥组、流量分配
 * - 实验结果：结论建议、数据可视化数据
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';
export type VariableType = 'number' | 'string' | 'boolean' | 'json';
export type MetricType = 'conversion' | 'mean' | 'retention';
export type MetricRole = 'primary' | 'secondary' | 'guardrail';
export type ConfidenceLevel = '90%' | '95%' | '99%';
export type ExperimentConclusion = 'positive' | 'negative' | 'neutral' | 'inconclusive';

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  trafficPercentage: number;
  variables: Record<string, ExperimentVariable>;
  isControl: boolean;
}

export interface ExperimentVariable {
  key: string;
  type: VariableType;
  value: number | string | boolean | Record<string, unknown>;
  description: string;
}

export interface ExperimentMetric {
  id: string;
  name: string;
  type: MetricType;
  role: MetricRole;
  description: string;
  eventName?: string;
}

export interface MetricData {
  users: number;
  conversions: number;
  conversionRate: number;
  mean?: number;
  stdDev?: number;
  retention?: number[];
}

export interface VariantResult {
  variantId: string;
  variantName: string;
  isControl: boolean;
  data: MetricData;
  uplift: number;
  upliftPercent: number;
  pValue: number;
  confidenceInterval: [number, number];
  isStatisticallySignificant: boolean;
  confidenceLevel: ConfidenceLevel;
}

export interface ExperimentResult {
  experimentId: string;
  metrics: Record<string, {
    primary: VariantResult[];
    secondary: VariantResult[];
    guardrail: VariantResult[];
  }>;
  conclusion: ExperimentConclusion;
  recommendation: string;
  startDate: number;
  updatedAt: number;
  totalUsers: number;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  trafficPercentage: number;
  variants: ExperimentVariant[];
  metrics: ExperimentMetric[];
  tags: string[];
  exclusionGroup?: string;
  startDate?: number;
  endDate?: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface MutexGroup {
  id: string;
  name: string;
  description: string;
  experimentIds: string[];
  maxTraffic: number;
}

export interface BucketResult {
  variantId: string;
  variantName: string;
  variables: Record<string, ExperimentVariable>;
  isControl: boolean;
}

const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-001',
    name: '新手引导优化',
    description: '测试新的新手引导流程对用户留存的影响',
    status: 'running',
    trafficPercentage: 50,
    variants: [
      { id: 'var-control', name: '对照组', description: '原有引导流程', trafficPercentage: 50, variables: { tutorial_version: { key: 'tutorial_version', type: 'string', value: 'v1', description: '引导版本' } }, isControl: true },
      { id: 'var-a', name: '实验组A', description: '简化引导流程A', trafficPercentage: 50, variables: { tutorial_version: { key: 'tutorial_version', type: 'string', value: 'v2', description: '引导版本' } }, isControl: false },
    ],
    metrics: [
      { id: 'm1', name: '次日留存', type: 'retention', role: 'primary', description: '用户次日留存率', eventName: 'retention_d1' },
      { id: 'm2', name: '新手完成率', type: 'conversion', role: 'secondary', description: '新手引导完成率', eventName: 'tutorial_complete' },
      { id: 'm3', name: '崩溃率', type: 'mean', role: 'guardrail', description: '用户崩溃率', eventName: 'crash_rate' },
    ],
    tags: ['新手引导', '留存优化'],
    exclusionGroup: 'onboarding',
    startDate: Date.now() - 7 * 86400000,
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 86400000,
    createdBy: 'admin',
  },
  {
    id: 'exp-002',
    name: '支付按钮颜色测试',
    description: '测试不同颜色的支付按钮对转化率的影响',
    status: 'completed',
    trafficPercentage: 30,
    variants: [
      { id: 'var-control2', name: '对照组', description: '蓝色按钮', trafficPercentage: 34, variables: { button_color: { key: 'button_color', type: 'string', value: 'blue', description: '按钮颜色' } }, isControl: true },
      { id: 'var-b1', name: '实验组-绿色', description: '绿色按钮', trafficPercentage: 33, variables: { button_color: { key: 'button_color', type: 'string', value: 'green', description: '按钮颜色' } }, isControl: false },
      { id: 'var-b2', name: '实验组-红色', description: '红色按钮', trafficPercentage: 33, variables: { button_color: { key: 'button_color', type: 'string', value: 'red', description: '按钮颜色' } }, isControl: false },
    ],
    metrics: [
      { id: 'm4', name: '支付转化率', type: 'conversion', role: 'primary', description: '支付按钮转化率', eventName: 'purchase_click' },
      { id: 'm5', name: '支付金额', type: 'mean', role: 'secondary', description: '平均支付金额', eventName: 'purchase_amount' },
    ],
    tags: ['支付', '转化率'],
    startDate: Date.now() - 30 * 86400000,
    endDate: Date.now() - 7 * 86400000,
    createdAt: Date.now() - 45 * 86400000,
    updatedAt: Date.now() - 7 * 86400000,
    createdBy: 'admin',
  },
  {
    id: 'exp-003',
    name: '关卡难度调整',
    description: '调整前10关难度对留存和付费的影响',
    status: 'draft',
    trafficPercentage: 0,
    variants: [
      { id: 'var-control3', name: '对照组', description: '原有难度', trafficPercentage: 50, variables: { difficulty: { key: 'difficulty', type: 'number', value: 1, description: '难度系数' } }, isControl: true },
      { id: 'var-c', name: '实验组', description: '降低难度', trafficPercentage: 50, variables: { difficulty: { key: 'difficulty', type: 'number', value: 0.8, description: '难度系数' } }, isControl: false },
    ],
    metrics: [
      { id: 'm6', name: '7日留存', type: 'retention', role: 'primary', description: '7日留存率' },
      { id: 'm7', name: '关卡通过率', type: 'conversion', role: 'secondary', description: '关卡10通过率' },
    ],
    tags: ['关卡', '难度'],
    createdAt: Date.now() - 2 * 86400000,
    updatedAt: Date.now() - 86400000,
    createdBy: 'designer',
  },
];

const MOCK_MUTEX_GROUPS: MutexGroup[] = [
  { id: 'mg-001', name: '新手引导组', description: '所有新手引导相关实验', experimentIds: ['exp-001'], maxTraffic: 100 },
  { id: 'mg-002', name: '支付优化组', description: '所有支付相关实验', experimentIds: ['exp-002'], maxTraffic: 50 },
];

export class ABTestService {
  private experiments = new Map<string, Experiment>();
  private mutexGroups = new Map<string, MutexGroup>();
  private resultsCache = new Map<string, ExperimentResult>();
  private userBuckets = new Map<string, Map<string, string>>();

  constructor() {
    MOCK_EXPERIMENTS.forEach((exp) => this.experiments.set(exp.id, exp));
    MOCK_MUTEX_GROUPS.forEach((g) => this.mutexGroups.set(g.id, g));
  }

  async createExperiment(options: {
    name: string;
    description: string;
    createdBy: string;
    trafficPercentage: number;
    variants: Omit<ExperimentVariant>[];
    metrics: Omit<ExperimentMetric, 'id'>[];
    tags?: string[];
    exclusionGroup?: string;
  }): Promise<Experiment> {
    const experiment: Experiment = {
      id: `exp-${randomUUID().slice(0, 8)}`,
      name: options.name,
      description: options.description,
      status: 'draft',
      trafficPercentage: options.trafficPercentage,
      variants: options.variants.map((v, i) => ({ ...v, id: `var-${i}` })),
      metrics: options.metrics.map((m) => ({ ...m, id: `m-${randomUUID().slice(0, 6)}` })),
      tags: options.tags ?? [],
      exclusionGroup: options.exclusionGroup,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: options.createdBy,
    };

    this.experiments.set(experiment.id, experiment);
    globalEventBus.emit({ type: 'abtest:experimentCreated', payload: experiment });
    return experiment;
  }

  async updateExperiment(experimentId: string, updates: Partial<Experiment>): Promise<Experiment | null> {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;
    if (exp.status === 'running') {
      return null;
    }

    Object.assign(exp, updates, { updatedAt: Date.now() });
    globalEventBus.emit({ type: 'abtest:experimentUpdated', payload: exp });
    return exp;
  }

  async deleteExperiment(experimentId: string): Promise<boolean> {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    if (exp.status === 'running') return false;

    this.experiments.delete(experimentId);
    this.resultsCache.delete(experimentId);

    if (exp.exclusionGroup) {
      const group = this.mutexGroups.get(exp.exclusionGroup);
      if (group) {
        group.experimentIds = group.experimentIds.filter((id) => id !== experimentId);
      }
    }

    globalEventBus.emit({ type: 'abtest:experimentDeleted', payload: experimentId });
    return true;
  }

  async startExperiment(experimentId: string): Promise<boolean> {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    if (exp.status !== 'draft' && exp.status !== 'paused') return false;

    exp.status = 'running';
    exp.startDate = Date.now();
    exp.updatedAt = Date.now();

    globalEventBus.emit({ type: 'abtest:experimentStarted', payload: exp });
    return true;
  }

  async pauseExperiment(experimentId: string): Promise<boolean> {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    if (exp.status !== 'running') return false;

    exp.status = 'paused';
    exp.updatedAt = Date.now();

    globalEventBus.emit({ type: 'abtest:experimentPaused', payload: exp });
    return true;
  }

  async stopExperiment(experimentId: string): Promise<boolean> {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    if (exp.status !== 'running' && exp.status !== 'paused') return false;

    exp.status = 'completed';
    exp.endDate = Date.now();
    exp.updatedAt = Date.now();

    globalEventBus.emit({ type: 'abtest:experimentStopped', payload: exp });
    return true;
  }

  async listExperiments(options?: {
    status?: ExperimentStatus;
    tag?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ experiments: Experiment[]; total: number }> {
    let experiments = Array.from(this.experiments.values());

    if (options?.status) {
      experiments = experiments.filter((e) => e.status === options.status);
    }
    if (options?.tag) {
      experiments = experiments.filter((e) => e.tags.includes(options.tag!));
    }
    if (options?.search) {
      const keyword = options.search.toLowerCase();
      experiments = experiments.filter(
        (e) => e.name.toLowerCase().includes(keyword) || e.description.toLowerCase().includes(keyword),
      );
    }

    experiments.sort((a, b) => b.updatedAt - a.updatedAt);

    const total = experiments.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    experiments = experiments.slice(start, start + pageSize);

    return { experiments, total };
  }

  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  async getExperimentResult(experimentId: string): Promise<ExperimentResult | null> {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;

    if (this.resultsCache.has(experimentId)) {
      return this.resultsCache.get(experimentId)!;
    }

    const result = this.generateMockResult(exp);
    this.resultsCache.set(experimentId, result);
    return result;
  }

  private generateMockResult(exp: Experiment): ExperimentResult {
    const controlVariant = exp.variants.find((v) => v.isControl) ?? exp.variants[0];
    const metrics: ExperimentResult['metrics'] = {
      primary: [],
      secondary: [],
      guardrail: [],
    };

    for (const metric of exp.metrics) {
      const variantResults: VariantResult[] = exp.variants.map((variant) => {
        const isControl = variant.isControl;
        const baseUsers = 5000 + Math.floor(Math.random() * 2000);
        const baseConversion = isControl ? 0.35 : 0.35 + (Math.random() - 0.4) * 0.15;
        const conversions = Math.floor(baseUsers * baseConversion);
        const conversionRate = conversions / baseUsers;
        const controlRate = 0.35;
        const uplift = conversionRate - controlRate;
        const upliftPercent = controlRate > 0 ? (uplift / controlRate) * 100 : 0;
        const pValue = Math.random() * 0.3;
        const ciLow = uplift - 0.05;
        const ciHigh = uplift + 0.05;
        const isSignificant = pValue < 0.05;

        return {
          variantId: variant.id,
          variantName: variant.name,
          isControl,
          data: {
            users: baseUsers,
            conversions,
            conversionRate,
            mean: metric.type === 'mean' ? 50 + Math.random() * 20 : undefined,
            stdDev: metric.type === 'mean' ? 15 + Math.random() * 5 : undefined,
            retention: metric.type === 'retention' ? [0.45, 0.28, 0.18, 0.12, 0.08] : undefined,
          },
          uplift,
          upliftPercent,
          pValue,
          confidenceInterval: [ciLow, ciHigh],
          isStatisticallySignificant: isSignificant,
          confidenceLevel: pValue < 0.01 ? '99%' : pValue < 0.05 ? '95%' : '90%',
        };
      });

      metrics[metric.role].push(...variantResults);
    }

    const primaryResults = metrics.primary;
    const bestVariant = primaryResults.reduce((best, curr) =>
      curr.uplift > best.uplift ? curr : best, primaryResults[0]);
    const worstVariant = primaryResults.reduce((worst, curr) =>
      curr.uplift < worst.uplift ? curr : worst, primaryResults[0]);

    let conclusion: ExperimentConclusion = 'inconclusive';
    let recommendation = '继续收集数据';

    if (bestVariant.isStatisticallySignificant && bestVariant.uplift > 0) {
      conclusion = 'positive';
      recommendation = `建议全量发布 ${bestVariant.variantName}`;
    } else if (worstVariant.isStatisticallySignificant && worstVariant.uplift < 0 && !worstVariant.isControl) {
      conclusion = 'negative';
      recommendation = `建议停止 ${worstVariant.variantName}`;
    } else if (exp.status === 'completed') {
      conclusion = 'neutral';
      recommendation = '实验结果不显著，建议保留对照组';
    }

    return {
      experimentId: exp.id,
      metrics,
      conclusion,
      recommendation,
      startDate: exp.startDate ?? Date.now(),
      updatedAt: Date.now(),
      totalUsers: exp.variants.reduce((sum, v) => sum + 5000, 0),
    };
  }

  getUserBucket(userId: string, experimentId: string): BucketResult | null {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;
    if (exp.status !== 'running') return null;

    let userExperiments = this.userBuckets.get(userId);
    if (!userExperiments) {
      userExperiments = new Map();
      this.userBuckets.set(userId, userExperiments);
    }

    if (userExperiments.has(experimentId)) {
      const variantId = userExperiments.get(experimentId)!;
      const variant = exp.variants.find((v) => v.id === variantId);
      if (variant) {
        return {
          variantId: variant.id,
          variantName: variant.name,
          variables: variant.variables,
          isControl: variant.isControl,
        };
      }
    }

    const hash = this.hashString(`${userId}-${experimentId}`);
    const trafficBucket = hash % 100;

    if (trafficBucket >= exp.trafficPercentage) {
      return null;
    }

    const variantHash = this.hashString(`${userId}-${experimentId}-variant`);
    let cumulative = 0;
    let selectedVariant = exp.variants[0];

    for (const variant of exp.variants) {
      cumulative += variant.trafficPercentage;
      if (variantHash % 100 < cumulative) {
        selectedVariant = variant;
        break;
      }
    }

    userExperiments.set(experimentId, selectedVariant.id);

    return {
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      variables: selectedVariant.variables,
      isControl: selectedVariant.isControl,
    };
  }

  getVariableValue<T = unknown>(
    userId: string,
    experimentId: string,
    variableKey: string,
    defaultValue: T,
  ): T {
    const bucket = this.getUserBucket(userId, experimentId);
    if (!bucket) return defaultValue;

    const variable = bucket.variables[variableKey];
    if (!variable) return defaultValue;

    return variable.value as T;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  calculateZTest(
    controlConversions: number,
    controlUsers: number,
    variantConversions: number,
    variantUsers: number,
  ): { zScore: number; pValue: number; significant: boolean } {
    const p1 = controlConversions / controlUsers;
    const p2 = variantConversions / variantUsers;
    const p = (controlConversions + variantConversions) / (controlUsers + variantUsers);
    const se = Math.sqrt(p * (1 - p) * (1 / controlUsers + 1 / variantUsers));
    const zScore = se === 0 ? 0 : (p2 - p1) / se;
    const pValue = this.normalCDF(-Math.abs(zScore)) * 2;

    return {
      zScore,
      pValue,
      significant: pValue < 0.05,
    };
  }

  calculateTTest(
    controlMean: number,
    controlStd: number,
    controlN: number,
    variantMean: number,
    variantStd: number,
    variantN: number,
  ): { tScore: number; pValue: number; significant: boolean; df: number } {
    const se = Math.sqrt((controlStd ** 2) / controlN + (variantStd ** 2) / variantN);
    const tScore = se === 0 ? 0 : (variantMean - controlMean) / se;
    const df = Math.round(((controlStd ** 2 / controlN + variantStd ** 2 / variantN) ** 2) /
      (((controlStd ** 2 / controlN) ** 2 / (controlN - 1)) +
      ((variantStd ** 2 / variantN) ** 2 / (variantN - 1))));
    const pValue = this.tDistributionCDF(-Math.abs(tScore), df) * 2;

    return {
      tScore,
      pValue,
      significant: pValue < 0.05,
      df,
    };
  }

  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  private tDistributionCDF(t: number, df: number): number {
    const x = df / (df + t * t);
    const a = df / 2;
    const b = 0.5;
    const betacdf = this.betacdf(x, a, b);
    if (t > 0) {
      return 1 - 0.5 * betacdf;
    }
    return 0.5 * betacdf;
  }

  private betacdf(x: number, a: number, b: number): number {
    let bt = x === 0 || x === 1 ? 0 : Math.exp(this.gammaln(a + b) - this.gammaln(a) - this.gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) {
      return bt * this.betacf(a, b, x) / a;
    }
    return 1 - bt * this.betacf(b, a, 1 - x) / b;
  }

  private betacf(a: number, b: number, x: number): number {
    const maxIter = 200;
    const eps = 3e-7;
    let qab = a + b;
    let qap = a + 1;
    let qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= maxIter; m++) {
      let m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < eps) break;
    }
    return h;
  }

  private gammaln(x: number): number {
    const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j <= 5; j++) ser += cof[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  calculateConfidenceInterval(
    conversionRate: number,
    users: number,
    confidence: number = 0.95,
  ): [number, number] {
    const z = confidence === 0.99 ? 2.576 : confidence === 0.9 ? 1.645 : 1.96;
    const se = Math.sqrt((conversionRate * (1 - conversionRate)) / users);
    const margin = z * se;
    return [conversionRate - margin, conversionRate + margin];
  }

  listMutexGroups(): MutexGroup[] {
    return Array.from(this.mutexGroups.values());
  }

  async createMutexGroup(name: string, description: string, maxTraffic: number): Promise<MutexGroup> {
    const group: MutexGroup = {
      id: `mg-${randomUUID().slice(0, 8)}`,
      name,
      description,
      experimentIds: [],
      maxTraffic,
    };
    this.mutexGroups.set(group.id, group);
    return group;
  }

  async addToMutexGroup(groupId: string, experimentId: string): Promise<boolean> {
    const group = this.mutexGroups.get(groupId);
    const exp = this.experiments.get(experimentId);
    if (!group || !exp) return false;

    if (!group.experimentIds.includes(experimentId)) {
      group.experimentIds.push(experimentId);
      exp.exclusionGroup = groupId;
    }
    return true;
  }

  async removeFromMutexGroup(groupId: string, experimentId: string): Promise<boolean> {
    const group = this.mutexGroups.get(groupId);
    const exp = this.experiments.get(experimentId);
    if (!group || !exp) return false;

    group.experimentIds = group.experimentIds.filter((id) => id !== experimentId);
    if (exp.exclusionGroup === groupId) {
      exp.exclusionGroup = undefined;
    }
    return true;
  }

  listExperimentTags(): string[] {
    const tags = new Set<string>();
    for (const exp of this.experiments.values()) {
      exp.tags.forEach((t) => tags.add(t));
    }
    return Array.from(tags);
  }

  generateChartData(result: ExperimentResult, metricId: string): { labels: string[]; series: { name: string; data: number[] }[] } {
    const allVariants = [...result.metrics.primary, ...result.metrics.secondary, ...result.metrics.guardrail];
    const metricVariants = allVariants.filter((v) => {
      const exp = this.experiments.get(result.experimentId);
      if (!exp) return false;
      return true;
    });

    return {
      labels: metricVariants.map((v) => v.variantName),
      series: [
        { name: '转化率', data: metricVariants.map((v) => v.data.conversionRate * 100) },
      ],
    };
  }
}

export const abTestService = new ABTestService();
