import type { LogLevel, DebugLogEntry } from '@tapdev/types';
import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

export type DevicePlatform = 'android' | 'ios';
export type DeviceStatus = 'disconnected' | 'connecting' | 'connected' | 'offline';

export interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  platform: DevicePlatform;
  osVersion: string;
  resolution: {
    width: number;
    height: number;
  };
  pixelRatio: number;
  totalMemory: number;
  usedMemory?: number;
  cpuCores: number;
  cpuUsage?: number;
  batteryLevel?: number;
  status: DeviceStatus;
  connectedAt?: number;
  deviceId: string;
  manufacturer?: string;
  isEmulator?: boolean;
}

export interface DeviceLogFilter {
  level?: LogLevel;
  tag?: string;
  keyword?: string;
  startTime?: number;
  endTime?: number;
}

export interface DeviceScreenshot {
  id: string;
  deviceId: string;
  timestamp: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface QRCodeConnection {
  id: string;
  code: string;
  qrDataUrl: string;
  expiresAt: number;
  projectId: string;
  serverUrl: string;
}

export interface HotPushOptions {
  deviceId: string;
  files: {
    path: string;
    content: string;
  }[];
  fullReload?: boolean;
}

export interface HotPushResult {
  id: string;
  deviceId: string;
  status: 'success' | 'failed' | 'partial';
  filesPushed: number;
  totalFiles: number;
  duration: number;
  error?: string;
}

export class DeviceDebugService {
  private devices = new Map<string, DeviceInfo>();
  private logs = new Map<string, DebugLogEntry[]>();
  private screenshots = new Map<string, DeviceScreenshot[]>();
  private activeDeviceId: string | null = null;
  private isScanning = false;
  private qrCode: QRCodeConnection | null = null;
  private maxLogsPerDevice = 1000;

  getDevices(): DeviceInfo[] {
    return Array.from(this.devices.values()).sort((a, b) => {
      const statusOrder = { connected: 0, connecting: 1, offline: 2, disconnected: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }

  getDevice(id: string): DeviceInfo | undefined {
    return this.devices.get(id);
  }

  getActiveDevice(): DeviceInfo | null {
    return this.activeDeviceId ? (this.devices.get(this.activeDeviceId) ?? null) : null;
  }

  setActiveDevice(id: string | null): void {
    this.activeDeviceId = id;
    globalEventBus.emit({ type: 'device:activeChanged', payload: { deviceId: id } });
  }

  async scanDevices(): Promise<DeviceInfo[]> {
    if (this.isScanning) return this.getDevices();

    this.isScanning = true;
    globalEventBus.emit({ type: 'device:scanStart', payload: {} });

    try {
      await this.delay(1500);

      const mockDevices = this.generateMockDevices();
      mockDevices.forEach((device) => {
        const existing = this.devices.get(device.id);
        if (!existing) {
          this.devices.set(device.id, device);
          this.logs.set(device.id, []);
          this.screenshots.set(device.id, []);
        } else {
          Object.assign(existing, device);
        }
      });

      globalEventBus.emit({ type: 'device:scanComplete', payload: { devices: this.getDevices() } });
      return this.getDevices();
    } catch (error) {
      globalEventBus.emit({
        type: 'device:scanError',
        payload: { error: error instanceof Error ? error.message : '扫描失败' },
      });
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  async connectDevice(deviceId: string): Promise<DeviceInfo> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('设备不存在');
    }

    if (device.status === 'connected') return device;

    device.status = 'connecting';
    globalEventBus.emit({ type: 'device:connecting', payload: { deviceId } });

    try {
      await this.delay(1000 + Math.random() * 1000);

      device.status = 'connected';
      device.connectedAt = Date.now();
      device.usedMemory = Math.floor(device.totalMemory * 0.4);
      device.cpuUsage = Math.floor(Math.random() * 30) + 10;
      device.batteryLevel = Math.floor(Math.random() * 50) + 50;

      this.startDeviceLogStream(deviceId);
      this.startDeviceMetricsUpdate(deviceId);

      globalEventBus.emit({ type: 'device:connected', payload: device });
      return device;
    } catch (error) {
      device.status = 'disconnected';
      globalEventBus.emit({
        type: 'device:connectFailed',
        payload: { deviceId, error: error instanceof Error ? error.message : '连接失败' },
      });
      throw error;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) return;

    device.status = 'disconnected';
    device.connectedAt = undefined;
    device.usedMemory = undefined;
    device.cpuUsage = undefined;

    globalEventBus.emit({ type: 'device:disconnected', payload: { deviceId } });
  }

  async generateQRCode(projectId: string, serverUrl: string): Promise<QRCodeConnection> {
    const code = randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    this.qrCode = {
      id: randomUUID(),
      code,
      qrDataUrl: this.generateMockQRCodeDataUrl(`${serverUrl}?code=${code}`),
      expiresAt,
      projectId,
      serverUrl,
    };

    globalEventBus.emit({ type: 'device:qrCodeGenerated', payload: this.qrCode });
    return this.qrCode;
  }

  getQRCode(): QRCodeConnection | null {
    return this.qrCode;
  }

  async connectByQRCode(code: string): Promise<DeviceInfo> {
    if (!this.qrCode || this.qrCode.code !== code) {
      throw new Error('二维码无效或已过期');
    }

    if (Date.now() > this.qrCode.expiresAt) {
      throw new Error('二维码已过期');
    }

    const mockDevice: DeviceInfo = {
      id: `qr_${randomUUID()}`,
      name: 'QR Connected Device',
      model: 'Mobile Device',
      platform: Math.random() > 0.5 ? 'android' : 'ios',
      osVersion: Math.random() > 0.5 ? '14.0' : '16.0',
      resolution: { width: 1080, height: 2340 },
      pixelRatio: 3,
      totalMemory: 8 * 1024 * 1024 * 1024,
      cpuCores: 8,
      status: 'connecting',
      deviceId: code,
      manufacturer: 'Unknown',
    };

    this.devices.set(mockDevice.id, mockDevice);
    this.logs.set(mockDevice.id, []);
    this.screenshots.set(mockDevice.id, []);

    return this.connectDevice(mockDevice.id);
  }

  getLogs(deviceId: string, filter?: DeviceLogFilter): DebugLogEntry[] {
    const deviceLogs = this.logs.get(deviceId) || [];

    if (!filter) return [...deviceLogs];

    let result = [...deviceLogs];

    if (filter.level) {
      result = result.filter((log) => log.level === filter.level);
    }
    if (filter.tag) {
      result = result.filter((log) => log.source === filter.tag);
    }
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      result = result.filter((log) => log.message.toLowerCase().includes(keyword));
    }
    if (filter.startTime) {
      result = result.filter((log) => log.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      result = result.filter((log) => log.timestamp <= filter.endTime!);
    }

    return result;
  }

  clearLogs(deviceId: string): void {
    this.logs.set(deviceId, []);
    globalEventBus.emit({ type: 'device:logsCleared', payload: { deviceId } });
  }

  async takeScreenshot(deviceId: string): Promise<DeviceScreenshot> {
    const device = this.devices.get(deviceId);
    if (!device || device.status !== 'connected') {
      throw new Error('设备未连接');
    }

    globalEventBus.emit({ type: 'device:screenshotStart', payload: { deviceId } });

    await this.delay(500);

    const screenshot: DeviceScreenshot = {
      id: randomUUID(),
      deviceId,
      timestamp: Date.now(),
      dataUrl: this.generateMockScreenshot(device),
      width: device.resolution.width,
      height: device.resolution.height,
    };

    const deviceScreenshots = this.screenshots.get(deviceId) || [];
    deviceScreenshots.push(screenshot);
    if (deviceScreenshots.length > 20) deviceScreenshots.shift();
    this.screenshots.set(deviceId, deviceScreenshots);

    globalEventBus.emit({ type: 'device:screenshotTaken', payload: screenshot });
    return screenshot;
  }

  getScreenshots(deviceId: string): DeviceScreenshot[] {
    return this.screenshots.get(deviceId) || [];
  }

  getDeviceInfo(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  async refreshDeviceInfo(deviceId: string): Promise<DeviceInfo> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('设备不存在');
    }

    device.usedMemory = Math.floor(device.totalMemory * (0.3 + Math.random() * 0.4));
    device.cpuUsage = Math.floor(Math.random() * 60) + 10;
    device.batteryLevel = Math.max(0, (device.batteryLevel || 50) - Math.floor(Math.random() * 2));

    globalEventBus.emit({ type: 'device:infoUpdated', payload: device });
    return device;
  }

  async hotPush(options: HotPushOptions): Promise<HotPushResult> {
    const device = this.devices.get(options.deviceId);
    if (!device || device.status !== 'connected') {
      throw new Error('设备未连接');
    }

    const startTime = Date.now();
    const pushId = randomUUID();

    globalEventBus.emit({
      type: 'device:hotPushStart',
      payload: { id: pushId, deviceId: options.deviceId, totalFiles: options.files.length },
    });

    await this.delay(500 + Math.random() * 1000);

    const successCount = Math.floor(options.files.length * (0.9 + Math.random() * 0.1));
    const duration = Date.now() - startTime;

    const result: HotPushResult = {
      id: pushId,
      deviceId: options.deviceId,
      status: successCount === options.files.length ? 'success' : 'partial',
      filesPushed: successCount,
      totalFiles: options.files.length,
      duration,
    };

    if (options.fullReload) {
      this.addLog(options.deviceId, 'info', '热更新完成，正在重新加载...', 'hotpush');
    } else {
      this.addLog(
        options.deviceId,
        'info',
        `热更新完成: ${successCount}/${options.files.length} 个文件`,
        'hotpush'
      );
    }

    globalEventBus.emit({ type: 'device:hotPushComplete', payload: result });
    return result;
  }

  searchLogs(deviceId: string, keyword: string): DebugLogEntry[] {
    return this.getLogs(deviceId, { keyword });
  }

  getAvailableTags(deviceId: string): string[] {
    const deviceLogs = this.logs.get(deviceId) || [];
    const tags = new Set<string>();
    deviceLogs.forEach((log) => {
      if (log.source) tags.add(log.source);
    });
    return Array.from(tags);
  }

  getStats(): {
    totalDevices: number;
    connectedDevices: number;
    totalLogs: number;
    screenshotsCount: number;
  } {
    let totalLogs = 0;
    let screenshotsCount = 0;
    let connectedDevices = 0;

    this.devices.forEach((device, id) => {
      if (device.status === 'connected') connectedDevices++;
      totalLogs += this.logs.get(id)?.length || 0;
      screenshotsCount += this.screenshots.get(id)?.length || 0;
    });

    return {
      totalDevices: this.devices.size,
      connectedDevices,
      totalLogs,
      screenshotsCount,
    };
  }

  clear(): void {
    this.devices.clear();
    this.logs.clear();
    this.screenshots.clear();
    this.activeDeviceId = null;
    this.qrCode = null;
    globalEventBus.emit({ type: 'device:cleared', payload: {} });
  }

  isScanningDevices(): boolean {
    return this.isScanning;
  }

  private startDeviceLogStream(deviceId: string): void {
    const streamLogs = () => {
      const device = this.devices.get(deviceId);
      if (!device || device.status !== 'connected') return;

      const mockLog = this.generateMockLog();
      this.addLog(deviceId, mockLog.level, mockLog.message, mockLog.source, mockLog.data);

      setTimeout(streamLogs, 1000 + Math.random() * 3000);
    };

    setTimeout(streamLogs, 500);
  }

  private startDeviceMetricsUpdate(deviceId: string): void {
    const updateMetrics = () => {
      const device = this.devices.get(deviceId);
      if (!device || device.status !== 'connected') return;

      this.refreshDeviceInfo(deviceId).catch(() => {});
      setTimeout(updateMetrics, 2000 + Math.random() * 2000);
    };

    setTimeout(updateMetrics, 1000);
  }

  private addLog(
    deviceId: string,
    level: LogLevel,
    message: string,
    source?: string,
    data?: unknown
  ): void {
    const entry: DebugLogEntry = {
      id: randomUUID(),
      level,
      message,
      source,
      timestamp: Date.now(),
      data,
    };

    const deviceLogs = this.logs.get(deviceId) || [];
    deviceLogs.push(entry);
    if (deviceLogs.length > this.maxLogsPerDevice) deviceLogs.shift();
    this.logs.set(deviceId, deviceLogs);

    globalEventBus.emit({ type: 'device:log', payload: { deviceId, log: entry } });
  }

  private generateMockDevices(): DeviceInfo[] {
    return [
      {
        id: 'dev_001',
        name: 'Pixel 7 Pro',
        model: 'Google Pixel 7 Pro',
        platform: 'android',
        osVersion: '14',
        resolution: { width: 1440, height: 3120 },
        pixelRatio: 3.5,
        totalMemory: 12 * 1024 * 1024 * 1024,
        cpuCores: 8,
        status: 'offline',
        deviceId: 'ANDROID_001',
        manufacturer: 'Google',
        isEmulator: false,
      },
      {
        id: 'dev_002',
        name: 'iPhone 15 Pro',
        model: 'Apple iPhone 15 Pro',
        platform: 'ios',
        osVersion: '17.0',
        resolution: { width: 1179, height: 2556 },
        pixelRatio: 3,
        totalMemory: 8 * 1024 * 1024 * 1024,
        cpuCores: 6,
        status: 'offline',
        deviceId: 'IOS_002',
        manufacturer: 'Apple',
        isEmulator: false,
      },
      {
        id: 'dev_003',
        name: 'Android Emulator',
        model: 'Android SDK Emulator',
        platform: 'android',
        osVersion: '13',
        resolution: { width: 1080, height: 2340 },
        pixelRatio: 3,
        totalMemory: 4 * 1024 * 1024 * 1024,
        cpuCores: 4,
        status: 'disconnected',
        deviceId: 'EMU_003',
        manufacturer: 'Google',
        isEmulator: true,
      },
    ];
  }

  private generateMockLog(): Omit<DebugLogEntry, 'id' | 'timestamp'> {
    const levels: LogLevel[] = ['debug', 'info', 'info', 'info', 'warn', 'error'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const sources = ['App', 'Network', 'Render', 'Audio', 'Input', 'Physics', 'UI', 'HotReload'];
    const source = sources[Math.floor(Math.random() * sources.length)];

    const messages: Record<LogLevel, string[]> = {
      debug: ['资源加载完成', '对象池已回收 10 个对象', '帧时间: 16.5ms', '内存使用: 256MB'],
      info: ['游戏场景已加载', '用户登录成功', '网络请求完成', '动画播放完成', '配置已更新'],
      warn: ['图片尺寸超过建议值', '帧率下降到 45fps', '网络延迟较高', '内存接近警告阈值'],
      error: ['资源加载失败', '网络连接超时', '空指针异常', '文件读取错误'],
    };

    const message = messages[level][Math.floor(Math.random() * messages[level].length)];

    return { level, message, source };
  }

  private generateMockQRCodeDataUrl(content: string): string {
    const size = 200;
    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12" fill="black">QR: ${content.substring(0, 20)}...</text></svg>`)}`;
  }

  private generateMockScreenshot(device: DeviceInfo): string {
    const width = device.resolution.width / 4;
    const height = device.resolution.height / 4;
    const platformColor = device.platform === 'ios' ? '#007AFF' : '#3DDC84';

    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${platformColor}" opacity="0.2"/><rect x="10" y="10" width="${width - 20}" height="${height - 20}" fill="white" rx="8"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14" fill="#666">${device.name}</text><text x="50%" y="${height / 2 + 20}" text-anchor="middle" font-size="10" fill="#999">${new Date().toLocaleTimeString()}</text></svg>`)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const deviceDebugService = new DeviceDebugService();
