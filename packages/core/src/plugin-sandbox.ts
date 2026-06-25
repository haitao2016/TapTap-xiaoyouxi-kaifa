import { globalEventBus } from './event-bus';

export type SandboxType = 'worker' | 'iframe' | 'virtual';

export interface SandboxPermissions {
  allowConsole: boolean;
  allowFetch: boolean;
  allowSetTimeout: boolean;
  allowSetInterval: boolean;
  allowLocalStorage: boolean;
  allowDOM: boolean;
  allowWindowAccess: boolean;
}

export interface SandboxOptions {
  type?: SandboxType;
  permissions?: Partial<SandboxPermissions>;
  timeout?: number;
  memoryLimitMB?: number;
  allowedGlobals?: string[];
  blockedGlobals?: string[];
}

export interface SandboxMessage {
  type: string;
  payload?: unknown;
  id?: string;
  pluginId?: string;
}

export interface SandboxRuntime {
  pluginId: string;
  status: 'idle' | 'initializing' | 'running' | 'paused' | 'error' | 'terminated';
  startedAt?: number;
  lastActivityAt?: number;
  executionCount: number;
  error?: string;
  memoryUsage?: number;
}

export interface SandboxAPIMethod {
  name: string;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
}

export class PluginSandbox {
  private sandboxes = new Map<string, SandboxRuntime>();
  private messageHandlers = new Map<string, Map<string, (payload: unknown) => void>>();
  private apiMethods = new Map<string, SandboxAPIMethod[]>();

  private defaultPermissions: SandboxPermissions = {
    allowConsole: true,
    allowFetch: false,
    allowSetTimeout: true,
    allowSetInterval: true,
    allowLocalStorage: false,
    allowDOM: false,
    allowWindowAccess: false,
  };

  private defaultOptions: SandboxOptions = {
    type: 'virtual',
    timeout: 5000,
    memoryLimitMB: 50,
    permissions: {},
  };

  createSandbox(pluginId: string, options?: SandboxOptions): SandboxRuntime {
    const opts = { ...this.defaultOptions, ...options };
    const permissions = { ...this.defaultPermissions, ...opts.permissions };

    const runtime: SandboxRuntime = {
      pluginId,
      status: 'idle',
      executionCount: 0,
    };

    this.sandboxes.set(pluginId, runtime);
    this.messageHandlers.set(pluginId, new Map());
    this.apiMethods.set(pluginId, []);

    globalEventBus.emit({ type: 'sandbox:created', payload: { pluginId, options: opts } });

    return runtime;
  }

  async initializeSandbox(pluginId: string, code: string, options?: SandboxOptions): Promise<void> {
    let runtime = this.sandboxes.get(pluginId);
    if (!runtime) {
      runtime = this.createSandbox(pluginId, options);
    }

    runtime.status = 'initializing';
    runtime.startedAt = Date.now();
    runtime.lastActivityAt = Date.now();

    globalEventBus.emit({ type: 'sandbox:initializing', payload: { pluginId } });

    try {
      await this.executeInSandbox(pluginId, code);
      runtime.status = 'running';
      globalEventBus.emit({ type: 'sandbox:initialized', payload: { pluginId } });
    } catch (error) {
      runtime.status = 'error';
      runtime.error = error instanceof Error ? error.message : '初始化失败';
      globalEventBus.emit({ type: 'sandbox:error', payload: { pluginId, error: runtime.error } });
      throw error;
    }
  }

  async executeInSandbox(pluginId: string, code: string): Promise<unknown> {
    const runtime = this.sandboxes.get(pluginId);
    if (!runtime) {
      throw new Error(`沙箱不存在: ${pluginId}`);
    }

    if (runtime.status === 'terminated') {
      throw new Error(`沙箱已终止: ${pluginId}`);
    }

    runtime.executionCount++;
    runtime.lastActivityAt = Date.now();

    try {
      const result = this.executeCode(pluginId, code);
      return result;
    } catch (error) {
      runtime.status = 'error';
      runtime.error = error instanceof Error ? error.message : '执行错误';
      globalEventBus.emit({ type: 'sandbox:error', payload: { pluginId, error: runtime.error } });
      throw error;
    }
  }

  async callMethod(pluginId: string, methodName: string, ...args: unknown[]): Promise<unknown> {
    const runtime = this.sandboxes.get(pluginId);
    if (!runtime || runtime.status !== 'running') {
      throw new Error(`沙箱未运行: ${pluginId}`);
    }

    runtime.lastActivityAt = Date.now();
    runtime.executionCount++;

    const methods = this.apiMethods.get(pluginId) || [];
    const method = methods.find(m => m.name === methodName);

    if (!method) {
      throw new Error(`方法不存在: ${methodName}`);
    }

    try {
      return await method.handler(...args);
    } catch (error) {
      runtime.status = 'error';
      runtime.error = error instanceof Error ? error.message : `方法 ${methodName} 执行错误`;
      throw error;
    }
  }

  registerAPIMethod(pluginId: string, name: string, handler: (...args: unknown[]) => unknown): void {
    const methods = this.apiMethods.get(pluginId);
    if (methods) {
      const existing = methods.find(m => m.name === name);
      if (existing) {
        existing.handler = handler;
      } else {
        methods.push({ name, handler });
      }
    }
  }

  sendMessage(pluginId: string, message: SandboxMessage): void {
    const handlers = this.messageHandlers.get(pluginId);
    if (handlers && handlers.has(message.type)) {
      handlers.get(message.type)!(message.payload);
    }
    globalEventBus.emit({ 
      type: `sandbox:message:${pluginId}`, 
      payload: { ...message, pluginId } 
    });
  }

  onMessage(pluginId: string, type: string, handler: (payload: unknown) => void): () => void {
    let handlers = this.messageHandlers.get(pluginId);
    if (!handlers) {
      handlers = new Map();
      this.messageHandlers.set(pluginId, handlers);
    }
    handlers.set(type, handler);
    return () => handlers.delete(type);
  }

  pauseSandbox(pluginId: string): void {
    const runtime = this.sandboxes.get(pluginId);
    if (runtime && runtime.status === 'running') {
      runtime.status = 'paused';
      globalEventBus.emit({ type: 'sandbox:paused', payload: { pluginId } });
    }
  }

  resumeSandbox(pluginId: string): void {
    const runtime = this.sandboxes.get(pluginId);
    if (runtime && runtime.status === 'paused') {
      runtime.status = 'running';
      globalEventBus.emit({ type: 'sandbox:resumed', payload: { pluginId } });
    }
  }

  terminateSandbox(pluginId: string): void {
    const runtime = this.sandboxes.get(pluginId);
    if (runtime) {
      runtime.status = 'terminated';
      this.messageHandlers.delete(pluginId);
      this.apiMethods.delete(pluginId);
      globalEventBus.emit({ type: 'sandbox:terminated', payload: { pluginId } });
    }
  }

  getRuntime(pluginId: string): SandboxRuntime | undefined {
    return this.sandboxes.get(pluginId);
  }

  getAllRuntimes(): SandboxRuntime[] {
    return Array.from(this.sandboxes.values());
  }

  isSandboxRunning(pluginId: string): boolean {
    return this.sandboxes.get(pluginId)?.status === 'running';
  }

  getSandboxError(pluginId: string): string | undefined {
    return this.sandboxes.get(pluginId)?.error;
  }

  destroySandbox(pluginId: string): void {
    this.terminateSandbox(pluginId);
    this.sandboxes.delete(pluginId);
  }

  destroyAllSandboxes(): void {
    this.sandboxes.forEach((_, pluginId) => this.destroySandbox(pluginId));
  }

  getActiveSandboxCount(): number {
    return Array.from(this.sandboxes.values()).filter(
      r => r.status === 'running' || r.status === 'paused'
    ).length;
  }

  getSandboxPermissions(pluginId: string): SandboxPermissions {
    return { ...this.defaultPermissions };
  }

  setSandboxPermissions(pluginId: string, permissions: Partial<SandboxPermissions>): void {
    Object.assign(this.defaultPermissions, permissions);
    globalEventBus.emit({ type: 'sandbox:permissions-updated', payload: { pluginId, permissions } });
  }

  private executeCode(pluginId: string, code: string): unknown {
    const runtime = this.sandboxes.get(pluginId);
    if (!runtime) {
      throw new Error(`沙箱不存在: ${pluginId}`);
    }

    const permissions = this.getSandboxPermissions(pluginId);
    const sandboxGlobal = this.createSandboxGlobal(pluginId, permissions);

    try {
      const sandboxFn = new Function(
        'sandbox',
        `
          "use strict";
          const console = sandbox.console;
          const setTimeout = sandbox.setTimeout;
          const setInterval = sandbox.setInterval;
          const clearTimeout = sandbox.clearTimeout;
          const clearInterval = sandbox.clearInterval;
          ${permissions.allowFetch ? 'const fetch = sandbox.fetch;' : ''}
          ${permissions.allowLocalStorage ? 'const localStorage = sandbox.localStorage;' : ''}
          
          ${code}
        `
      );

      return sandboxFn(sandboxGlobal);
    } catch (error) {
      throw error;
    }
  }

  private createSandboxGlobal(pluginId: string, permissions: SandboxPermissions): Record<string, unknown> {
    const sandboxConsole: Record<string, (...args: unknown[]) => void> = {};

    if (permissions.allowConsole) {
      ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
        sandboxConsole[method] = (...args: unknown[]) => {
          globalEventBus.emit({
            type: `sandbox:console:${pluginId}`,
            payload: { method, args },
          });
          if (typeof console !== 'undefined' && console[method as keyof Console]) {
            (console[method as keyof Console] as (...args: unknown[]) => void)(
              `[Plugin:${pluginId}]`,
              ...args
            );
          }
        };
      });
    } else {
      ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
        sandboxConsole[method] = () => {};
      });
    }

    const timeouts = new Map<number, ReturnType<typeof setTimeout>>();
    const intervals = new Map<number, ReturnType<typeof setInterval>>();
    let timerId = 0;

    const sandboxGlobal: Record<string, unknown> = {
      console: sandboxConsole,
    };

    if (permissions.allowSetTimeout) {
      sandboxGlobal.setTimeout = (callback: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => {
        const id = ++timerId;
        const timeout = setTimeout(() => {
          try {
            callback(...args);
          } catch (error) {
            const runtime = this.sandboxes.get(pluginId);
            if (runtime) {
              runtime.status = 'error';
              runtime.error = error instanceof Error ? error.message : '定时器执行错误';
            }
          }
          timeouts.delete(id);
        }, delay);
        timeouts.set(id, timeout);
        return id;
      };

      sandboxGlobal.clearTimeout = (id: number) => {
        const timeout = timeouts.get(id);
        if (timeout) {
          clearTimeout(timeout);
          timeouts.delete(id);
        }
      };
    }

    if (permissions.allowSetInterval) {
      sandboxGlobal.setInterval = (callback: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => {
        const id = ++timerId;
        const interval = setInterval(() => {
          try {
            callback(...args);
          } catch (error) {
            const runtime = this.sandboxes.get(pluginId);
            if (runtime) {
              runtime.status = 'error';
              runtime.error = error instanceof Error ? error.message : '定时器执行错误';
            }
          }
        }, delay);
        intervals.set(id, interval);
        return id;
      };

      sandboxGlobal.clearInterval = (id: number) => {
        const interval = intervals.get(id);
        if (interval) {
          clearInterval(interval);
          intervals.delete(id);
        }
      };
    }

    if (permissions.allowFetch) {
      sandboxGlobal.fetch = async (input: string, init?: RequestInit) => {
        globalEventBus.emit({
          type: `sandbox:fetch:${pluginId}`,
          payload: { url: input, method: init?.method || 'GET' },
        });
        return fetch(input, init);
      };
    }

    if (permissions.allowLocalStorage && typeof localStorage !== 'undefined') {
      const prefix = `plugin:${pluginId}:`;
      sandboxGlobal.localStorage = {
        getItem: (key: string) => localStorage.getItem(prefix + key),
        setItem: (key: string, value: string) => localStorage.setItem(prefix + key, value),
        removeItem: (key: string) => localStorage.removeItem(prefix + key),
        clear: () => {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        },
        get length() {
          let count = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) count++;
          }
          return count;
        },
        key: (index: number) => {
          let count = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
              if (count === index) return key.slice(prefix.length);
              count++;
            }
          }
          return null;
        },
      };
    }

    return sandboxGlobal;
  }
}

export const pluginSandbox = new PluginSandbox();
