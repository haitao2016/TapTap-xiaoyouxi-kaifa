import {
  tapTapAuthService,
  publishService,
  analyticsService,
  sdkManagerService,
} from '../packages/core/src/platform';

describe('Phase 9: Platform Services', () => {
  beforeEach(() => {
    tapTapAuthService.enableMockMode(true);
  });

  describe('TapTapAuthService', () => {
    it('should list models and accounts (empty initially)', () => {
      expect(tapTapAuthService.listAccounts().length).toBe(0);
    });

    it('should generate authorize URL in mock mode', () => {
      tapTapAuthService.enableMockMode(true);
      const url = tapTapAuthService.getAuthorizeUrl();
      expect(url).toContain('client_id=mock-client');
    });

    it('should perform mock login via exchangeCode', async () => {
      const result = await tapTapAuthService.exchangeCode('mock-code');
      expect(result.success).toBe(true);
      expect(result.account?.nickname).toBe('Demo Developer');
    });

    it('should switch account', async () => {
      const result = await tapTapAuthService.exchangeCode('mock-code');
      expect(tapTapAuthService.getActiveAccount()?.id).toBe(result.account?.id);
    });
  });

  describe('PublishService', () => {
    it('should fail without login', async () => {
      tapTapAuthService.logout(tapTapAuthService.getActiveAccount()?.id ?? '');
      const task = await publishService.publish({
        appId: 'test-app',
        version: '1.0.0',
        changelog: 'init',
        buildPath: 'C:\\nonexistent',
        grayRelease: false,
        grayPercent: 0,
      });
      expect(task.error).toBeDefined();
      expect(task.stage).toBe('failed');
    });
  });

  describe('AnalyticsService', () => {
    it('should generate mock analytics data', async () => {
      const result = await analyticsService.query({
        appId: 'app1',
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        metrics: ['dau', 'new_users'],
        granularity: 'day',
      });
      expect(result.series.length).toBe(7);
      expect(result.totals.dau).toBeGreaterThan(0);
    });

    it('should list metrics with labels', () => {
      const metrics = analyticsService.listMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(analyticsService.getMetricLabel('dau')).toBe('日活');
    });
  });

  describe('SDKManagerService', () => {
    it('should list mock releases', async () => {
      const releases = await sdkManagerService.listAvailableVersions('@tapdev/minigame-sdk');
      expect(releases.length).toBeGreaterThan(0);
      expect(releases[0]?.version).toBeTruthy();
    });

    it('should fetch mock announcements', async () => {
      const list = await sdkManagerService.fetchAnnouncements();
      expect(list.length).toBeGreaterThan(0);
      expect(list.some((a) => a.category === 'breaking')).toBe(true);
    });

    it('should mark announcement as read', async () => {
      const list = await sdkManagerService.fetchAnnouncements();
      const id = list[0]?.id;
      if (id) sdkManagerService.markRead(id);
    });

    it('should generate compat report', async () => {
      await sdkManagerService.fetchAnnouncements();
      const report = await sdkManagerService.generateCompatReport();
      expect(typeof report.compatible).toBe('boolean');
      expect(Array.isArray(report.warnings)).toBe(true);
    });
  });
});
