import type {
  DebugSession,
  DebugLogEntry,
  Breakpoint,
  WSMessage,
  BreakpointSyncPayload,
} from '@tapdev/types';
import { randomUUID } from './utils/crypto-utils';

export type DebugClientEvents = {
  onLog: (entry: DebugLogEntry) => void;
  onSessionUpdate: (partial: Partial<DebugSession>) => void;
  onGameConnected: () => void;
  onGameDisconnected: () => void;
  onBreakpointsSync: (breakpoints: Breakpoint[]) => void;
  onBreakpointHit: (breakpointId: string, vars?: Record<string, unknown>) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: string) => void;
};

export class DebugWebSocketClient {
  private ws: WebSocket | null = null;
  private events: Partial<DebugClientEvents> = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wsUrl = '';
  private shouldReconnect = false;

  setEvents(events: Partial<DebugClientEvents>): void {
    this.events = events;
  }

  connect(wsUrl: string): void {
    this.wsUrl = wsUrl;
    this.shouldReconnect = true;
    this.open();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  sendLog(level: DebugLogEntry['level'], message: string, source?: string): void {
    this.send({ type: 'log', payload: { level, message, source } });
  }

  sendCommand(action: 'pause' | 'resume' | 'step' | 'reload'): void {
    this.send({ type: 'command', payload: { action } });
  }

  addBreakpoint(file: string, line: number, condition?: string): void {
    this.send({ type: 'breakpoint-add', payload: { file, line, condition } });
  }

  removeBreakpoint(id: string): void {
    this.send({ type: 'breakpoint-remove', payload: { id } });
  }

  updateBreakpoint(id: string, updates: Partial<Breakpoint>): void {
    this.send({ type: 'breakpoint-update', payload: { id, updates } });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private open(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (err) {
      this.events.onError?.(String(err));
      return;
    }

    this.ws.onopen = () => {
      this.events.onConnect?.();
      this.send({ type: 'ping' });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as WSMessage;
        this.handleMessage(msg);
      } catch {
        this.events.onError?.('无法解析 WebSocket 消息');
      }
    };

    this.ws.onclose = () => {
      this.events.onDisconnect?.();
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.open(), 3000);
      }
    };

    this.ws.onerror = () => {
      this.events.onError?.('WebSocket 连接错误');
    };
  }

  private handleMessage(msg: WSMessage): void {
    switch (msg.type) {
      case 'connected': {
        const payload = msg.payload as {
          sessionId?: string;
          status?: { url: string; wsUrl: string };
        };
        this.events.onSessionUpdate?.({
          id: payload.sessionId,
          qrCodeUrl: payload.status?.url,
          wsUrl: payload.status?.wsUrl,
        });
        break;
      }
      case 'log': {
        const payload = msg.payload as {
          id?: string;
          level: DebugLogEntry['level'];
          message: string;
          source?: string;
          data?: unknown;
          timestamp?: number;
        };
        this.events.onLog?.({
          id: payload.id ?? randomUUID(),
          level: payload.level,
          message: payload.message,
          source: payload.source,
          timestamp: payload.timestamp ?? Date.now(),
          data: payload.data,
        });
        break;
      }
      case 'game-connected':
        this.events.onGameConnected?.();
        this.events.onSessionUpdate?.({ gameConnected: true, status: 'running' });
        break;
      case 'game-disconnected':
        this.events.onGameDisconnected?.();
        this.events.onSessionUpdate?.({ gameConnected: false });
        break;
      case 'breakpoint-sync':
        this.events.onBreakpointsSync?.((msg.payload as BreakpointSyncPayload).breakpoints);
        break;
      case 'breakpoint-hit': {
        const payload = msg.payload as { breakpointId?: string; vars?: Record<string, unknown> };
        const breakpointId = payload.breakpointId ?? '';
        this.events.onBreakpointHit?.(breakpointId, payload.vars);
        this.events.onLog?.({
          id: randomUUID(),
          level: 'warn',
          message: `断点命中: ${breakpointId}`,
          timestamp: Date.now(),
          source: 'game',
        });
        break;
      }
    }
  }

  private send(msg: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...msg, timestamp: Date.now() }));
    }
  }
}

export const debugWebSocketClient = new DebugWebSocketClient();
