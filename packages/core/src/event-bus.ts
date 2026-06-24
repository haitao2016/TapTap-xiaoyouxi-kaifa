import type { AppEvent } from '@tapdev/types';

type EventHandler<T = unknown> = (payload: T) => void;
type AppEventHandler<T = unknown> = (event: { type: string; payload: T }) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler<unknown>>>();

  on<T = unknown>(type: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler<unknown>);
    return () => this.off(type, handler as EventHandler<unknown>);
  }

  /** 删除事件监听器：传 handler 则删除单个；不传则删除该事件全部监听器 */
  off(type: string, handler?: EventHandler<unknown>): void {
    if (!this.handlers.has(type)) return;
    if (handler === undefined) {
      this.handlers.delete(type);
      return;
    }
    this.handlers.get(type)!.delete(handler);
  }

  /**
   * 触发事件。支持两种形式：
   * 1) emit({ type, payload })  - 严格类型，listener 收到 event
   * 2) emit(type, payload)      - 简化形式，listener 收到 payload
   */
  emit(event: { type: string; payload?: unknown }): void;
  emit(type: string, payload?: unknown): void;
  emit(...args: unknown[]): void {
    if (typeof args[0] === 'string') {
      const [type, payload] = args as [string, unknown];
      this.handlers.get(type)?.forEach((handler) => handler(payload));
    } else {
      const event = args[0] as { type: string; payload?: unknown };
      this.handlers.get(event.type)?.forEach((handler) => handler(event));
    }
  }

  once<T = unknown>(type: string, handler: EventHandler<T>): () => void {
    let unsubscribe: () => void = () => {};
    unsubscribe = this.on(type, ((payload: unknown) => {
      unsubscribe();
      (handler as EventHandler<unknown>)(payload);
    }) as EventHandler<unknown>);
    return unsubscribe;
  }

  listenerCount(type: string): number {
    return this.handlers.get(type)?.size ?? 0;
  }

  removeAllListeners(type?: string): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  /** 返回当前已注册的所有事件名（去重） */
  eventNames(): string[] {
    return [...this.handlers.keys()];
  }
}

export const globalEventBus = new EventBus();
