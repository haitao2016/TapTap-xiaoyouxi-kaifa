import { monitorService } from '../packages/core/src/monitor-service';

describe('MonitorService', () => {
  beforeEach(() => {
    monitorService.stopMonitoring();
    (monitorService as any).metricsHistory = [];
    (monitorService as any).alerts = [];
    (monitorService as any).networkRequests = [];
  });

  describe('startMonitoring', () => {
    it('should start monitoring and collect metrics', async () => {
      monitorService.startMonitoring(100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(monitorService.isMonitoringActive()).toBe(true);
      expect(monitorService.getMetricsHistory().length).toBeGreaterThan(0);
      
      monitorService.stopMonitoring();
    });

    it('should not start if already monitoring', () => {
      monitorService.startMonitoring(100);
      const initialLength = monitorService.getMetricsHistory().length;
      
      monitorService.startMonitoring(100);
      
      expect(monitorService.isMonitoringActive()).toBe(true);
      
      monitorService.stopMonitoring();
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring', async () => {
      monitorService.startMonitoring(100);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      monitorService.stopMonitoring();
      
      expect(monitorService.isMonitoringActive()).toBe(false);
    });
  });

  describe('getLatestMetrics', () => {
    it('should return null when no metrics are collected', () => {
      expect(monitorService.getLatestMetrics()).toBe(null);
    });

    it('should return the latest metrics', async () => {
      monitorService.startMonitoring(100);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const latest = monitorService.getLatestMetrics();
      
      expect(latest).not.toBe(null);
      expect(latest?.fps).toBeDefined();
      expect(latest?.memory).toBeDefined();
      expect(latest?.timestamp).toBeDefined();
      
      monitorService.stopMonitoring();
    });
  });

  describe('recordNetworkRequest', () => {
    it('should record network requests', () => {
      monitorService.recordNetworkRequest({
        url: 'https://api.example.com/test',
        method: 'GET',
        status: 200,
        duration: 100,
        size: 1024,
        type: 'fetch',
      });
      
      const requests = monitorService.getNetworkRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].url).toBe('https://api.example.com/test');
      expect(requests[0].method).toBe('GET');
      expect(requests[0].status).toBe(200);
    });

    it('should create alert for failed requests', () => {
      monitorService.recordNetworkRequest({
        url: 'https://api.example.com/fail',
        method: 'POST',
        status: 500,
        duration: 5000,
        size: 0,
        type: 'fetch',
      });
      
      const alerts = monitorService.getUnresolvedAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      monitorService.startMonitoring(100);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats = monitorService.getStats();
      
      expect(stats.avgFps).toBeDefined();
      expect(stats.avgMemoryUsage).toBeDefined();
      expect(stats.totalRequests).toBeDefined();
      expect(stats.uptime).toBeGreaterThan(0);
      
      monitorService.stopMonitoring();
    });
  });

  describe('setThresholds', () => {
    it('should update thresholds', () => {
      const original = monitorService.getThresholds();
      
      monitorService.setThresholds({ fps: 25, memoryRatio: 0.9 });
      
      const updated = monitorService.getThresholds();
      expect(updated.fps).toBe(25);
      expect(updated.memoryRatio).toBe(0.9);
      expect(updated.cpuUsage).toBe(original.cpuUsage);
    });
  });

  describe('resolveAlert', () => {
    it('should mark alert as resolved', async () => {
      monitorService.startMonitoring(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const alerts = monitorService.getUnresolvedAlerts();
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        monitorService.resolveAlert(alertId);
        
        const resolved = monitorService.getAlerts().find(a => a.id === alertId);
        expect(resolved?.resolved).toBe(true);
      }
      
      monitorService.stopMonitoring();
    });
  });
});