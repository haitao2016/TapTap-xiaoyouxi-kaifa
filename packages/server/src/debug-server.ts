import { networkInterfaces } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { DebugLogEntry, Breakpoint } from '@tapdev/types';
import type {
  WSMessage,
  WSMessageMap,
  WSClientRole,
  DebugServerConfig,
  DebugServerStatus,
  RemoteLogPayload,
  BreakpointSyncPayload,
  DebugCommandPayload,
  MetricsPayload,
} from '@tapdev/types';

export interface DebugServerEvents {
  onLog?: (entry: DebugLogEntry) => void;
  onGameConnected?: () => void;
  onGameDisconnected?: () => void;
  onMetrics?: (metrics: MetricsPayload) => void;
}

export class DebugServer {
  private httpServer: import('node:http').Server | null = null;
  private wss: import('ws').WebSocketServer | null = null;
  private config: DebugServerConfig | null = null;
  private sessionId = randomUUID();
  private logs: DebugLogEntry[] = [];
  private breakpoints: Breakpoint[] = [];
  private studioClients = new Set<import('ws').WebSocket>();
  private gameClients = new Set<import('ws').WebSocket>();
  private events: DebugServerEvents = {};
  private qrCodeDataUrl = '';
  private status: 'running' | 'paused' = 'running';

  setEvents(events: DebugServerEvents): void {
    this.events = events;
  }

  async start(config: DebugServerConfig): Promise<DebugServerStatus> {
    if (this.httpServer) await this.stop();

    this.config = config;
    const host = config.host ?? '0.0.0.0';
    const http = await import('node:http');
    const { WebSocketServer } = await import('ws');
    const QRCode = (await import('qrcode')).default;
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const lanHost = this.getLanAddress();
    const debugUrl = `http://${lanHost}:${config.port}/debug`;
    this.qrCodeDataUrl = await QRCode.toDataURL(debugUrl, { width: 256, margin: 2 });

    this.httpServer = http.createServer(async (req, res) => {
      try {
        await this.handleHttp(req, res, fs, path);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer!.listen(config.port, host, () => resolve());
      this.httpServer!.on('error', reject);
    });

    this.wss = new WebSocketServer({ server: this.httpServer, path: '/ws' });
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url ?? '/ws', `http://${req.headers.host}`);
      const role = (url.searchParams.get('role') ?? 'studio') as WSClientRole;
      this.handleConnection(ws, role);
    });

    this.addLog('info', `调试服务器已启动: ${debugUrl}`, 'server');
    this.addLog('info', `WebSocket: ws://${lanHost}:${config.port}/ws`, 'server');

    return this.getStatus();
  }

  async stop(): Promise<void> {
    for (const ws of [...this.studioClients, ...this.gameClients]) {
      ws.close();
    }
    this.studioClients.clear();
    this.gameClients.clear();

    await new Promise<void>((resolve) => {
      this.wss?.close(() => resolve());
    });
    this.wss = null;

    await new Promise<void>((resolve) => {
      this.httpServer?.close(() => resolve());
    });
    this.httpServer = null;
    this.config = null;
  }

  getStatus(): DebugServerStatus {
    const port = this.config?.port ?? 0;
    const host = this.getLanAddress();
    return {
      running: !!this.httpServer,
      port,
      host,
      url: `http://${host}:${port}/debug`,
      wsUrl: `ws://${host}:${port}/ws?role=studio`,
      gameConnected: this.gameClients.size > 0,
      studioClients: this.studioClients.size,
      gameClients: this.gameClients.size,
    };
  }

  getSessionInfo() {
    return {
      id: this.sessionId,
      projectId: this.config?.projectId ?? '',
      qrCodeUrl: this.getStatus().url,
      wsUrl: this.getStatus().wsUrl,
      qrCodeDataUrl: this.qrCodeDataUrl,
      gameConnected: this.gameClients.size > 0,
    };
  }

  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  getBreakpoints(): Breakpoint[] {
    return [...this.breakpoints];
  }

  addBreakpoint(file: string, line: number, condition?: string): Breakpoint {
    const bp: Breakpoint = {
      id: randomUUID(),
      file,
      line,
      enabled: true,
      condition,
    };
    this.breakpoints.push(bp);
    this.syncBreakpoints();
    this.addLog('debug', `断点已设置: ${file}:${line}`, 'studio');
    return bp;
  }

  removeBreakpoint(id: string): void {
    this.breakpoints = this.breakpoints.filter((b) => b.id !== id);
    this.syncBreakpoints();
  }

  sendCommand(action: DebugCommandPayload['action']): void {
    this.broadcast(this.gameClients, { type: 'command', payload: { action } });
    if (action === 'pause') this.status = 'paused';
    if (action === 'resume') this.status = 'running';
    this.addLog('info', `发送命令: ${action}`, 'studio');
  }

  clearLogs(): void {
    this.logs = [];
  }

  private handleConnection(ws: import('ws').WebSocket, role: WSClientRole): void {
    const clients = role === 'game' ? this.gameClients : this.studioClients;
    clients.add(ws);

    ws.send(
      JSON.stringify({
        type: 'connected',
        payload: { role, sessionId: this.sessionId, status: this.getStatus() },
      } satisfies WSMessage)
    );

    if (role === 'studio') {
      ws.send(
        JSON.stringify({
          type: 'breakpoint-sync',
          payload: { breakpoints: this.breakpoints } satisfies BreakpointSyncPayload,
        } satisfies WSMessage)
      );
    }

    if (role === 'game') {
      this.events.onGameConnected?.();
      this.broadcast(this.studioClients, { type: 'game-connected', payload: {} });
      this.addLog('info', '游戏客户端已连接', 'game');
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data)) as WSMessage;
        this.handleMessage(msg, role, ws);
      } catch {
        this.addLog('error', '无效的 WebSocket 消息', role);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      if (role === 'game') {
        this.events.onGameDisconnected?.();
        this.broadcast(this.studioClients, { type: 'game-disconnected', payload: {} });
        this.addLog('warn', '游戏客户端已断开', 'game');
      }
    });

    ws.on('error', () => clients.delete(ws));
  }

  private handleMessage(msg: WSMessage, role: WSClientRole, ws: import('ws').WebSocket): void {
    try {
      switch (msg.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() } satisfies WSMessage));
          break;
        case 'log': {
          const payload = msg.payload as WSMessageMap['log'];
          this.addLog(payload.level, payload.message, payload.source ?? role, payload.data);
          if (role === 'game') {
            this.broadcast(this.studioClients, msg);
          }
          break;
        }
        case 'breakpoint-add': {
          const { file, line, condition } = msg.payload as WSMessageMap['breakpoint-add'];
          this.addBreakpoint(file, line, condition);
          break;
        }
        case 'breakpoint-remove': {
          const { id } = msg.payload as WSMessageMap['breakpoint-remove'];
          this.removeBreakpoint(id);
          break;
        }
        case 'breakpoint-update': {
          const { id, enabled, condition } = msg.payload as WSMessageMap['breakpoint-update'];
          const bp = this.breakpoints.find((b) => b.id === id);
          if (bp) {
            if (enabled !== undefined) bp.enabled = enabled;
            if (condition !== undefined) bp.condition = condition;
            this.syncBreakpoints();
          }
          break;
        }
        case 'breakpoint-hit': {
          this.broadcast(this.studioClients, msg);
          this.addLog('warn', `断点命中: ${JSON.stringify(msg.payload)}`, 'game');
          break;
        }
        case 'command': {
          const { action } = msg.payload as WSMessageMap['command'];
          if (role === 'studio') this.sendCommand(action);
          break;
        }
        case 'metrics': {
          const metrics = msg.payload as WSMessageMap['metrics'];
          this.events.onMetrics?.(metrics);
          this.broadcast(this.studioClients, msg);
          break;
        }
        default:
          this.addLog('warn', `未知的消息类型: ${(msg as any).type}`, role);
      }
    } catch (err) {
      this.addLog('error', `处理消息时出错: ${err instanceof Error ? err.message : String(err)}`, role);
    }
  }

  private syncBreakpoints(): void {
    this.broadcast(this.gameClients, {
      type: 'breakpoint-sync',
      payload: { breakpoints: this.breakpoints } satisfies BreakpointSyncPayload,
    });
    this.broadcast(this.studioClients, {
      type: 'breakpoint-sync',
      payload: { breakpoints: this.breakpoints } satisfies BreakpointSyncPayload,
    });
  }

  private broadcast(clients: Set<import('ws').WebSocket>, msg: WSMessage): void {
    const data = JSON.stringify({ ...msg, timestamp: Date.now() });
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) ws.send(data);
    }
  }

  private addLog(
    level: DebugLogEntry['level'],
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
    this.logs.push(entry);
    if (this.logs.length > 2000) this.logs.shift();
    this.events.onLog?.(entry);
  }

  private async handleHttp(
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    fs: typeof import('node:fs/promises'),
    path: typeof import('node:path')
  ): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname === '/api/status') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({ ...this.getStatus(), sessionId: this.sessionId, status: this.status })
      );
      return;
    }

    if (url.pathname === '/api/qrcode') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ dataUrl: this.qrCodeDataUrl, url: this.getStatus().url }));
      return;
    }

    if (url.pathname === '/api/logs') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(this.logs.slice(-200)));
      return;
    }

    if (url.pathname === '/debug' || url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(this.renderDebugPage());
      return;
    }

    if (this.config?.staticDir && url.pathname.startsWith('/game/')) {
      const filePath = path.join(
        this.config.staticDir,
        decodeURIComponent(url.pathname.slice('/game/'.length))
      );
      try {
        const content = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': this.guessMime(filePath) });
        res.end(content);
        return;
      } catch {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
    }

    res.writeHead(404);
    res.end('Not Found');
  }

  private renderDebugPage(): string {
    const status = this.getStatus();
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>TapDev 调试</title>
  <style>
    body{font-family:system-ui;background:#0d0d0f;color:#f0f0f5;margin:0;padding:24px}
    .card{max-width:480px;margin:0 auto;background:#16161a;border:1px solid #2e2e38;border-radius:12px;padding:24px}
    h1{font-size:20px;margin:0 0 8px;color:#ff6b00}
    p{color:#a0a0b0;font-size:14px;line-height:1.6}
    img{display:block;margin:16px auto;border-radius:8px}
    code{background:#1e1e24;padding:2px 6px;border-radius:4px;font-size:12px}
    .status{margin-top:16px;padding:12px;background:#1e1e24;border-radius:8px;font-size:13px}
  </style>
</head>
<body>
  <div class="card">
    <h1>TapDev 真机调试</h1>
    <p>使用 TapTap App 或浏览器打开此页面进行小游戏调试。WebSocket 端点：</p>
    <p><code>${status.wsUrl.replace('role=studio', 'role=game')}</code></p>
    <img src="${this.qrCodeDataUrl}" alt="QR Code" width="200"/>
    <div class="status">
      服务器: ${status.url}<br/>
      游戏连接: ${status.gameConnected ? '已连接' : '等待连接...'}
    </div>
  </div>
  <script>
    const ws = new WebSocket('${status.wsUrl.replace('role=studio', 'role=game')}');
    ws.onopen = () => ws.send(JSON.stringify({ type: 'log', payload: { level: 'info', message: '调试页面已连接' } }));
    ws.onclose = () => console.log('disconnected');
  </script>
</body>
</html>`;
  }

  private guessMime(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      html: 'text/html',
      js: 'application/javascript',
      json: 'application/json',
      wasm: 'application/wasm',
      png: 'image/png',
      zip: 'application/zip',
    };
    return map[ext ?? ''] ?? 'application/octet-stream';
  }

  private getLanAddress(): string {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
    return '127.0.0.1';
  }
}

export const debugServer = new DebugServer();
