// Analytics & QA types

// Player Analytics types
export interface PlayerEvent {
  playerId: string;
  sessionId: string;
  eventName: string;
  properties: Record<string, unknown>;
  timestamp: number;
  platform: 'android' | 'ios' | 'web' | 'desktop';
}

export interface PlayerSession {
  id: string;
  playerId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  platform: 'android' | 'ios' | 'web' | 'desktop';
  deviceInfo: {
    os: string;
    osVersion: string;
    deviceModel?: string;
    screenResolution?: string;
    networkType?: string;
  };
  events: PlayerEvent[];
}

export interface PlayerMetrics {
  dau: number;
  mau: number;
  newUsers: number;
  retainedUsers: number;
  avgSessionDuration: number;
  totalSessions: number;
  totalPlaytime: number;
}

export interface RetentionCohortAnalysis {
  cohortDate: string;
  cohortSize: number;
  retentionByDay: Record<number, number>;
  avgLifespan: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  arpu: number;
  payingUsers: number;
  conversionRate: number;
  avgOrderValue: number;
}

// QA Automation types
export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  tests: TestCase[];
  status: 'draft' | 'ready' | 'running' | 'completed';
  lastRunAt?: number;
  lastRunResult?: TestSuiteResult;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  status: 'draft' | 'ready' | 'running' | 'passed' | 'failed' | 'skipped';
  steps: TestStep[];
  expectedResult: string;
  actualResult?: string;
  duration?: number;
  error?: string;
}

export interface TestStep {
  id: string;
  action: string;
  target?: string;
  value?: string;
  screenshot?: string;
}

export interface TestSuiteResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

export interface TestReport {
  suiteId: string;
  suiteName: string;
  runAt: number;
  result: TestSuiteResult;
  failedTests: TestCase[];
  screenshots: Record<string, string>;
}
