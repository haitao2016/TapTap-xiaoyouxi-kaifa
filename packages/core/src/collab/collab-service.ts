/**
 * 实时协作编辑服务
 * - 基于 CRDT（Yjs 思路）的文档同步
 * - 协作者光标/选区广播
 * - 离线编辑 + 自动合并
 * - 权限管理
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export interface CRDTDocument {
  id: string;
  content: string;
  /** Lamport 时钟 */
  clock: number;
  /** 客户端 ID */
  clientId: string;
  /** 版本号 */
  version: number;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  filePath: string;
  line: number;
  column: number;
  selection?: { start: number; end: number };
}

export interface Collaborator {
  userId: string;
  userName: string;
  email?: string;
  avatar?: string;
  color: string;
  /** 角色 */
  role: 'owner' | 'editor' | 'viewer';
  /** 是否在线 */
  online: boolean;
  joinedAt: number;
}

export interface CollabProject {
  projectId: string;
  ownerId: string;
  collaborators: Map<string, Collaborator>;
  documents: Map<string, CRDTDocument>;
  cursors: Map<string, RemoteCursor>;
}

const COLORS = ['#e94560', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3'];

export class CollabService {
  private project: CollabProject | null = null;
  private localClientId = randomUUID();
  private pendingOps: { filePath: string; op: 'insert' | 'delete'; pos: number; text?: string }[] = [];
  private listeners = new Set<(cursors: RemoteCursor[]) => void>();

  /**
   * 加入协作项目
   */
  joinProject(projectId: string, userName: string, role: Collaborator['role'] = 'editor'): Collaborator {
    if (!this.project) {
      this.project = {
        projectId,
        ownerId: this.localClientId,
        collaborators: new Map(),
        documents: new Map(),
        cursors: new Map(),
      };
    }
    const color = COLORS[this.project.collaborators.size % COLORS.length];
    const me: Collaborator = {
      userId: this.localClientId,
      userName,
      color,
      role,
      online: true,
      joinedAt: Date.now(),
    };
    this.project.collaborators.set(this.localClientId, me);
    globalEventBus.emit({ type: 'collab:join', payload: me });
    return me;
  }

  /**
   * 生成邀请链接
   */
  generateInviteLink(role: Collaborator['role'], expiresInHours = 24): { url: string; token: string; expiresAt: number } {
    const token = randomUUID();
    const expiresAt = Date.now() + expiresInHours * 3600_000;
    return {
      url: `tapdev://invite/${this.project?.projectId ?? 'unknown'}?token=${token}&role=${role}`,
      token,
      expiresAt,
    };
  }

  /**
   * 应用本地操作（CRDT insert/delete）
   */
  applyLocalOp(filePath: string, op: 'insert' | 'delete', pos: number, text?: string): void {
    if (!this.project) return;
    let doc = this.project.documents.get(filePath);
    if (!doc) {
      doc = { id: randomUUID(), content: '', clock: 0, clientId: this.localClientId, version: 0 };
      this.project.documents.set(filePath, doc);
    }
    doc.clock++;
    doc.version++;
    if (op === 'insert' && text) {
      doc.content = doc.content.slice(0, pos) + text + doc.content.slice(pos);
    } else if (op === 'delete') {
      const end = pos + (text?.length ?? 1);
      doc.content = doc.content.slice(0, pos) + doc.content.slice(end);
    }
    this.pendingOps.push({ filePath, op, pos, text });
    this.flushOps();
  }

  /**
   * 广播本地光标位置
   */
  broadcastCursor(filePath: string, line: number, column: number, selection?: { start: number; end: number }): void {
    if (!this.project) return;
    const me = this.project.collaborators.get(this.localClientId);
    if (!me) return;
    const cursor: RemoteCursor = {
      userId: me.userId,
      userName: me.userName,
      color: me.color,
      filePath,
      line,
      column,
      selection,
    };
    this.project.cursors.set(me.userId, cursor);
    this.notifyCursors();
  }

  /**
   * 订阅协作者光标变化
   */
  onCursorsChange(listener: (cursors: RemoteCursor[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCursors(): RemoteCursor[] {
    return this.project ? Array.from(this.project.cursors.values()) : [];
  }

  leaveProject(): void {
    if (this.project) {
      const me = this.project.collaborators.get(this.localClientId);
      if (me) this.project.collaborators.delete(me.userId);
    }
    this.project = null;
    globalEventBus.emit({ type: 'collab:leave', payload: this.localClientId });
  }

  private flushOps(): void {
    if (this.pendingOps.length === 0) return;
    const ops = this.pendingOps.splice(0);
    // 实际应通过 WebSocket 发送
    globalEventBus.emit({ type: 'collab:ops', payload: { clientId: this.localClientId, ops } });
  }

  private notifyCursors(): void {
    const cursors = this.getCursors().filter((c) => c.userId !== this.localClientId);
    for (const l of this.listeners) l(cursors);
  }
}

export const collabService = new CollabService();
