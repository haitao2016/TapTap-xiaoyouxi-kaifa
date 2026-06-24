import { globalEventBus } from './event-bus';

export interface PluginSandboxOptions {
  allowFileSystem?: boolean;
  allowNetwork?: boolean;
  allowProcess?: boolean;
  memoryLimitMB?: number;
  cpuLimitPercent?: number;
}

export interface PluginRuntime {
  pluginId: string;
  version: string;
  status: 'loading' | 'running' | 'paused' | 'error';
  memoryUsage?: number;
  cpuUsage?: number;
  error?: string;
}

export class PluginSandboxService {
  private sandboxes = new Map<string, PluginRuntime>();
  private defaultOptions: PluginSandboxOptions = {
    allowFileSystem: false,
    allowNetwork: true,
    allowProcess: false,
    memoryLimitMB: 50,
    cpuLimitPercent: 20,
  };

  getSandboxOptions(pluginId: string): PluginSandboxOptions {
    return { ...this.defaultOptions };
  }

  setSandboxOptions(pluginId: string, options: Partial<PluginSandboxOptions>): void {
    const current = this.getSandboxOptions(pluginId);
    Object.assign(current, options);
  }

  async startPlugin(pluginId: string, options?: PluginSandboxOptions): Promise<void> {
    const sandboxOptions = { ...this.defaultOptions, ...options };
    
    const runtime: PluginRuntime = {
      pluginId,
      version: this.getPluginVersion(pluginId),
      status: 'loading',
    };

    this.sandboxes.set(pluginId, runtime);
    globalEventBus.emit({ type: 'plugin:start', payload: { pluginId } });

    await this.delay(500);

    runtime.status = 'running';
    globalEventBus.emit({ type: 'plugin:started', payload: { pluginId } });
  }

  async stopPlugin(pluginId: string): Promise<void> {
    const runtime = this.sandboxes.get(pluginId);
    if (runtime) {
      runtime.status = 'paused';
      globalEventBus.emit({ type: 'plugin:stop', payload: { pluginId } });
      
      await this.delay(200);
      
      this.sandboxes.delete(pluginId);
      globalEventBus.emit({ type: 'plugin:stopped', payload: { pluginId } });
    }
  }

  getPluginRuntime(pluginId: string): PluginRuntime | undefined {
    return this.sandboxes.get(pluginId);
  }

  getAllRuntimes(): PluginRuntime[] {
    return Array.from(this.sandboxes.values());
  }

  isPluginRunning(pluginId: string): boolean {
    const runtime = this.sandboxes.get(pluginId);
    return runtime?.status === 'running';
  }

  terminatePlugin(pluginId: string): void {
    const runtime = this.sandboxes.get(pluginId);
    if (runtime) {
      runtime.status = 'error';
      runtime.error = 'Plugin terminated';
      this.sandboxes.delete(pluginId);
      globalEventBus.emit({ type: 'plugin:terminated', payload: { pluginId } });
    }
  }

  private getPluginVersion(pluginId: string): string {
    return '1.0.0';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const pluginSandboxService = new PluginSandboxService();