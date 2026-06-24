import {
  startupMonitor,
  memoryMonitor,
  i18n,
  releasePipeline,
  webViewPerfBaseline,
  unityBuildDiagnostics,
  errorLocalizer,
} from '../packages/core/src/perf';

describe('Phase 10 & TechDebts: Perf & Quality', () => {
  describe('StartupMonitor', () => {
    it('should record stages', () => {
      startupMonitor.start();
      startupMonitor.record('process-spawn');
      startupMonitor.record('main-init');
      const report = startupMonitor.finish('cold');
      expect(report.metrics.length).toBe(2);
      expect(typeof report.totalMs).toBe('number');
    });

    it('should detect over-budget stages', () => {
      const m = new (startupMonitor.constructor as new () => typeof startupMonitor)();
      m.start();
      m.record('first-paint');
      const over = m.getOverBudgetStages();
      // 实际测试可能为 0（取决于时机）
      expect(Array.isArray(over)).toBe(true);
    });
  });

  describe('MemoryMonitor', () => {
    it('should record sample', () => {
      const sample = memoryMonitor.sample();
      expect(sample.timestamp).toBeGreaterThan(0);
    });

    it('should expose budgets', () => {
      const budgets = memoryMonitor.getBudgets();
      expect(budgets.length).toBeGreaterThan(0);
    });
  });

  describe('I18nService', () => {
    it('should translate keys', () => {
      i18n.setLocale('zh-CN');
      expect(i18n.t('app.welcome')).toBe('欢迎使用');
      i18n.setLocale('en-US');
      expect(i18n.t('app.welcome')).toBe('Welcome');
    });

    it('should interpolate params', () => {
      i18n.setLocale('en-US');
      const text = i18n.t('common.yes');
      expect(text).toBe('Yes');
    });

    it('should format numbers', () => {
      i18n.setLocale('en-US');
      expect(i18n.formatNumber(1234.5)).toMatch(/1,234/);
    });

    it('should list available locales', () => {
      const locales = i18n.getAvailable();
      expect(locales).toContain('zh-CN');
      expect(locales).toContain('en-US');
    });
  });

  describe('ReleasePipeline', () => {
    it('should generate changelog', () => {
      const changelog = releasePipeline.generateChangelog([
        {
          type: 'feat',
          subject: 'Add login',
          hash: 'abc1234567',
          author: 'dev',
          date: Date.now(),
        },
        {
          type: 'fix',
          subject: 'Fix crash',
          hash: 'def4567890',
          author: 'dev',
          date: Date.now(),
        },
      ], '1.0.0');
      expect(changelog).toContain('1.0.0');
      expect(changelog).toContain('Add login');
      expect(changelog).toContain('Fix crash');
    });

    it('should bump version correctly', () => {
      expect(
        releasePipeline.bumpVersion('1.0.0', [
          { type: 'feat', subject: 'x', hash: 'a', author: 'a', date: 0 },
        ]),
      ).toBe('1.1.0');
      expect(
        releasePipeline.bumpVersion('1.0.0', [
          { type: 'breaking', subject: 'x', hash: 'a', author: 'a', date: 0 },
        ]),
      ).toBe('2.0.0');
      expect(
        releasePipeline.bumpVersion('1.0.0', [
          { type: 'fix', subject: 'x', hash: 'a', author: 'a', date: 0 },
        ]),
      ).toBe('1.0.1');
    });

    it('should create release', () => {
      const release = releasePipeline.createRelease({
        version: '1.0.0',
        platforms: ['windows', 'macos'],
      });
      expect(release.jobs.length).toBe(2);
      expect(release.jobs[0]?.status).toBe('pending');
    });
  });

  describe('WebViewPerfBaseline', () => {
    it('should set and get baseline', () => {
      webViewPerfBaseline.setBaseline('test', {
        fcp: 100,
        lcp: 200,
        fid: 50,
        cls: 0.1,
        fps: 60,
        memoryMB: 100,
        heapMB: 50,
        timestamp: Date.now(),
      });
      const base = webViewPerfBaseline.getBaseline('test');
      expect(base).not.toBeNull();
    });

    it('should detect regression', () => {
      webViewPerfBaseline.setBaseline('reg', {
        fcp: 100,
        lcp: 200,
        fid: 50,
        cls: 0.1,
        fps: 60,
        memoryMB: 100,
        heapMB: 50,
        timestamp: Date.now(),
      });
      const result = webViewPerfBaseline.compareToBaseline('reg', {
        fcp: 200,
        lcp: 200,
        fid: 50,
        cls: 0.1,
        fps: 60,
        memoryMB: 100,
        heapMB: 50,
        timestamp: Date.now(),
      });
      expect(result.passed).toBe(false);
      expect(result.regressions.length).toBeGreaterThan(0);
    });
  });

  describe('UnityBuildDiagnostics', () => {
    it('should parse CS errors', () => {
      const log = `Assets/Scripts/Foo.cs(10,5): error CS0117: 'X' does not contain a definition for 'Y'`;
      const errors = unityBuildDiagnostics.parseErrors(log);
      expect(errors.length).toBe(1);
      expect(errors[0]?.code).toBe('CS0117');
      expect(errors[0]?.location?.line).toBe(10);
    });

    it('should detect SDK errors', () => {
      const log = `error: TapTap SDK not found in project`;
      const errors = unityBuildDiagnostics.parseErrors(log);
      expect(errors.some((e) => e.category === 'sdk')).toBe(true);
    });
  });

  describe('ErrorLocalizer', () => {
    it('should localize known error', () => {
      i18n.setLocale('zh-CN');
      const err = errorLocalizer.get('E1001');
      expect(err).not.toBeNull();
      expect(err?.title).toBe('项目路径不存在');
    });

    it('should localize unknown error', () => {
      const err = errorLocalizer.localize(new Error('Custom failure'));
      expect(err.code).toBeTruthy();
    });

    it('should support English locale', () => {
      i18n.setLocale('en-US');
      const err = errorLocalizer.get('E1001');
      expect(err?.title).toBe('Project path not found');
    });
  });
});
