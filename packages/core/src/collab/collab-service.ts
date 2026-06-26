/**
 * 实时协作编辑服务
 * - 基于 CRDT（Yjs 思路）的文档同步
 * - 协作者光标/选区广播
 * - 离线编辑 + 自动合并
 * - 权限管理
 * - 操作历史与 undo/redo
 * - 冲突解决
 * - 模拟协作者
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

export interface Operation {
  id: string;
  clientId: string;
  userName: string;
  filePath: string;
  type: 'insert' | 'delete';
  pos: number;
  text?: string;
  length?: number;
  timestamp: number;
  lamportClock: number;
}

export interface HistoryEntry {
  operation: Operation;
  appliedAt: number;
  /** 用于 undo 的反向操作 */
  inverse: Operation;
}

export interface ConflictInfo {
  id: string;
  filePath: string;
  localOp: Operation;
  remoteOp: Operation;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge';
}

const COLORS = ['#e94560', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3'];

const MOCK_COLLABORATORS = [
  { userName: 'Alice', role: 'editor' as const },
  { userName: 'Bob', role: 'viewer' as const },
  { userName: 'Charlie', role: 'editor' as const },
];

export class CollabService {
  private project: CollabProject | null = null;
  private localClientId = randomUUID();
  private pendingOps: Operation[] = [];
  private listeners = new Set<(cursors: RemoteCursor[]) => void>();
  private historyStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private conflicts: ConflictInfo[] = [];
  private maxHistorySize = 100;
  private lamportClock = 0;
  private mockCollaborators: Map<string, { nextOpTimer?: ReturnType<typeof setTimeout> }> =
    new Map();

  /**
   * 加入协作项目
   */
  joinProject(
    projectId: string,
    userName: string,
    role: Collaborator['role'] = 'editor'
  ): Collaborator {
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
   * 添加模拟协作者（用于演示/测试）
   */
  addMockCollaborators(count = 2): Collaborator[] {
    if (!this.project) return [];
    const added: Collaborator[] = [];
    for (let i = 0; i < Math.min(count, MOCK_COLLABORATORS.length); i++) {
      const mock = MOCK_COLLABORATORS[i]!;
      const userId = randomUUID();
      const color = COLORS[(this.project.collaborators.size + i) % COLORS.length];
      const collaborator: Collaborator = {
        userId,
        userName: mock.userName,
        color,
        role: mock.role,
        online: true,
        joinedAt: Date.now(),
      };
      this.project.collaborators.set(userId, collaborator);
      this.mockCollaborators.set(userId, {});
      this.startMockCollaboratorActivity(userId);
      added.push(collaborator);
      globalEventBus.emit({ type: 'collab:user-joined', payload: collaborator });
    }
    this.notifyCursors();
    return added;
  }

  /**
   * 移除模拟协作者
   */
  removeMockCollaborators(): void {
    for (const [userId] of this.mockCollaborators) {
      this.leaveCollaborator(userId);
    }
    this.mockCollaborators.clear();
  }

  private startMockCollaboratorActivity(userId: string): void {
    if (!this.project) return;
    const scheduleNext = () => {
      const data = this.mockCollaborators.get(userId);
      if (!data) return;
      const delay = 2000 + Math.random() * 5000;
      data.nextOpTimer = setTimeout(() => {
        this.simulateCollaboratorAction(userId);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  private simulateCollaboratorAction(userId: string): void {
    if (!this.project) return;
    const collaborator = this.project.collaborators.get(userId);
    if (!collaborator) return;
    if (collaborator.role === 'viewer') {
      const files = Array.from(this.project.documents.keys());
      if (files.length > 0) {
        const filePath = files[Math.floor(Math.random() * files.length)]!;
        const doc = this.project.documents.get(filePath);
        if (doc) {
          const line = Math.floor(Math.random() * 20);
          const column = Math.floor(Math.random() * 40);
          const cursor: RemoteCursor = {
            userId,
            userName: collaborator.userName,
            color: collaborator.color,
            filePath,
            line,
            column,
          };
          this.project.cursors.set(userId, cursor);
          this.notifyCursors();
        }
      }
      return;
    }
    const files = Array.from(this.project.documents.keys());
    if (files.length === 0) return;
    const filePath = files[Math.floor(Math.random() * files.length)]!;
    const doc = this.project.documents.get(filePath);
    if (!doc) return;
    const pos = Math.floor(Math.random() * Math.max(1, doc.content.length));
    const line = doc.content.slice(0, pos).split('\n').length;
    const column = pos - doc.content.lastIndexOf('\n', pos - 1) - 1;
    const cursor: RemoteCursor = {
      userId,
      userName: collaborator.userName,
      color: collaborator.color,
      filePath,
      line,
      column,
    };
    this.project.cursors.set(userId, cursor);
    this.notifyCursors();
    if (Math.random() > 0.6) {
      const chars = 'abcdefghijklmnopqrstuvwxyz ';
      const text = chars[Math.floor(Math.random() * chars.length)];
      this.applyRemoteOp({
        id: randomUUID(),
        clientId: userId,
        userName: collaborator.userName,
        filePath,
        type: 'insert',
        pos,
        text,
        timestamp: Date.now(),
        lamportClock: this.incrementClock(),
      });
    }
  }

  /**
   * 生成邀请链接
   */
  generateInviteLink(
    role: Collaborator['role'],
    expiresInHours = 24
  ): { url: string; token: string; expiresAt: number } {
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
  applyLocalOp(
    filePath: string,
    op: 'insert' | 'delete',
    pos: number,
    text?: string
  ): Operation | null {
    if (!this.project) return null;
    this.incrementClock();
    let doc = this.project.documents.get(filePath);
    if (!doc) {
      doc = { id: randomUUID(), content: '', clock: 0, clientId: this.localClientId, version: 0 };
      this.project.documents.set(filePath, doc);
    }
    const me = this.project.collaborators.get(this.localClientId);
    const operation: Operation = {
      id: randomUUID(),
      clientId: this.localClientId,
      userName: me?.userName ?? 'Unknown',
      filePath,
      type: op,
      pos,
      text,
      length: op === 'delete' ? (text?.length ?? 1) : undefined,
      timestamp: Date.now(),
      lamportClock: this.lamportClock,
    };
    const inverse = this.createInverseOp(operation, doc.content);
    this.applyOpToDoc(doc, operation);
    this.historyStack.push({ operation, appliedAt: Date.now(), inverse });
    if (this.historyStack.length > this.maxHistorySize) {
      this.historyStack.shift();
    }
    this.redoStack = [];
    this.pendingOps.push(operation);
    this.flushOps();
    globalEventBus.emit({ type: 'collab:local-op', payload: operation });
    return operation;
  }

  /**
   * 应用远程操作
   */
  applyRemoteOp(op: Operation): boolean {
    if (!this.project) return false;
    let doc = this.project.documents.get(op.filePath);
    if (!doc) {
      doc = { id: randomUUID(), content: '', clock: 0, clientId: op.clientId, version: 0 };
      this.project.documents.set(op.filePath, doc);
    }
    this.receiveClock(op.lamportClock);
    const conflict = this.detectConflict(doc, op);
    if (conflict) {
      this.conflicts.push(conflict);
      globalEventBus.emit({ type: 'collab:conflict', payload: conflict });
      this.resolveConflictAuto(conflict);
      return false;
    }
    const transformedPos = this.transformPosition(doc, op);
    const transformedOp = { ...op, pos: transformedPos };
    this.applyOpToDoc(doc, transformedOp);
    const inverse = this.createInverseOp(transformedOp, doc.content);
    this.historyStack.push({ operation: transformedOp, appliedAt: Date.now(), inverse });
    if (this.historyStack.length > this.maxHistorySize) {
      this.historyStack.shift();
    }
    globalEventBus.emit({ type: 'collab:remote-op', payload: transformedOp });
    return true;
  }

  private applyOpToDoc(doc: CRDTDocument, op: Operation): void {
    doc.clock = Math.max(doc.clock, op.lamportClock);
    doc.version++;
    if (op.type === 'insert' && op.text) {
      doc.content = doc.content.slice(0, op.pos) + op.text + doc.content.slice(op.pos);
    } else if (op.type === 'delete') {
      const end = op.pos + (op.length ?? op.text?.length ?? 1);
      doc.content = doc.content.slice(0, op.pos) + doc.content.slice(end);
    }
  }

  private createInverseOp(op: Operation, currentContent: string): Operation {
    if (op.type === 'insert' && op.text) {
      return {
        ...op,
        id: randomUUID(),
        type: 'delete',
        length: op.text.length,
        text: undefined,
        timestamp: Date.now(),
      };
    } else {
      const deletedText = currentContent.slice(
        op.pos,
        op.pos + (op.length ?? op.text?.length ?? 1)
      );
      return {
        ...op,
        id: randomUUID(),
        type: 'insert',
        text: deletedText,
        length: undefined,
        timestamp: Date.now(),
      };
    }
  }

  private detectConflict(doc: CRDTDocument, op: Operation): ConflictInfo | null {
    const recentOps = this.historyStack.slice(-20);
    for (const entry of recentOps) {
      const localOp = entry.operation;
      if (localOp.clientId === op.clientId) continue;
      if (localOp.filePath !== op.filePath) continue;
      if (this.opsOverlap(localOp, op)) {
        return {
          id: randomUUID(),
          filePath: op.filePath,
          localOp,
          remoteOp: op,
          resolved: false,
        };
      }
    }
    return null;
  }

  private opsOverlap(a: Operation, b: Operation): boolean {
    const aEnd = a.type === 'insert' ? a.pos + (a.text?.length ?? 0) : a.pos + (a.length ?? 1);
    const bEnd = b.type === 'insert' ? b.pos + (b.text?.length ?? 0) : b.pos + (b.length ?? 1);
    return a.pos < bEnd && b.pos < aEnd;
  }

  private transformPosition(doc: CRDTDocument, op: Operation): number {
    let transformedPos = op.pos;
    const recentOps = this.historyStack.filter(
      (entry) =>
        entry.operation.filePath === op.filePath &&
        entry.operation.clientId !== op.clientId &&
        entry.operation.lamportClock < op.lamportClock
    );
    for (const entry of recentOps) {
      const prevOp = entry.operation;
      if (prevOp.type === 'insert' && prevOp.pos <= transformedPos) {
        transformedPos += prevOp.text?.length ?? 1;
      } else if (prevOp.type === 'delete' && prevOp.pos < transformedPos) {
        const deletedLen = prevOp.length ?? prevOp.text?.length ?? 1;
        transformedPos = Math.max(prevOp.pos, transformedPos - deletedLen);
      }
    }
    return Math.max(0, Math.min(transformedPos, doc.content.length));
  }

  private resolveConflictAuto(conflict: ConflictInfo): void {
    const { localOp, remoteOp } = conflict;
    const resolution = localOp.lamportClock > remoteOp.lamportClock ? 'local' : 'remote';
    conflict.resolved = true;
    conflict.resolution = resolution;
    if (this.project) {
      const doc = this.project.documents.get(conflict.filePath);
      if (doc && resolution === 'remote') {
        const transformedPos = this.transformPosition(doc, remoteOp);
        this.applyOpToDoc(doc, { ...remoteOp, pos: transformedPos });
      }
    }
    globalEventBus.emit({ type: 'collab:conflict-resolved', payload: conflict });
  }

  /**
   * 手动解决冲突
   */
  resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedContent?: string
  ): boolean {
    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (!conflict || conflict.resolved) return false;
    conflict.resolved = true;
    conflict.resolution = resolution;
    if (this.project && resolution === 'merge' && mergedContent !== undefined) {
      const doc = this.project.documents.get(conflict.filePath);
      if (doc) {
        doc.content = mergedContent;
        doc.version++;
      }
    }
    globalEventBus.emit({ type: 'collab:conflict-resolved', payload: conflict });
    return true;
  }

  /**
   * 获取未解决的冲突列表
   */
  getConflicts(): ConflictInfo[] {
    return this.conflicts.filter((c) => !c.resolved);
  }

  /**
   * 撤销操作
   */
  undo(): Operation | null {
    if (!this.project || this.historyStack.length === 0) return null;
    const entry = this.historyStack.pop()!;
    let doc = this.project.documents.get(entry.operation.filePath);
    if (!doc) return null;
    this.applyOpToDoc(doc, entry.inverse);
    this.redoStack.push(entry);
    globalEventBus.emit({ type: 'collab:undo', payload: entry.inverse });
    return entry.inverse;
  }

  /**
   * 重做操作
   */
  redo(): Operation | null {
    if (!this.project || this.redoStack.length === 0) return null;
    const entry = this.redoStack.pop()!;
    let doc = this.project.documents.get(entry.operation.filePath);
    if (!doc) return null;
    this.applyOpToDoc(doc, entry.operation);
    this.historyStack.push(entry);
    globalEventBus.emit({ type: 'collab:redo', payload: entry.operation });
    return entry.operation;
  }

  /**
   * 获取操作历史
   */
  getHistory(filePath?: string, limit = 50): HistoryEntry[] {
    let history = [...this.historyStack].reverse();
    if (filePath) {
      history = history.filter((h) => h.operation.filePath === filePath);
    }
    return history.slice(0, limit);
  }

  /**
   * 广播本地光标位置
   */
  broadcastCursor(
    filePath: string,
    line: number,
    column: number,
    selection?: { start: number; end: number }
  ): void {
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

  /**
   * 获取文档内容
   */
  getDocument(filePath: string): CRDTDocument | undefined {
    return this.project?.documents.get(filePath);
  }

  /**
   * 设置文档初始内容
   */
  setDocumentContent(filePath: string, content: string): void {
    if (!this.project) return;
    const doc: CRDTDocument = {
      id: randomUUID(),
      content,
      clock: this.lamportClock,
      clientId: this.localClientId,
      version: 1,
    };
    this.project.documents.set(filePath, doc);
  }

  /**
   * 获取所有协作者
   */
  getCollaborators(): Collaborator[] {
    return this.project ? Array.from(this.project.collaborators.values()) : [];
  }

  /**
   * 获取在线协作者
   */
  getOnlineCollaborators(): Collaborator[] {
    return this.getCollaborators().filter((c) => c.online);
  }

  private leaveCollaborator(userId: string): void {
    if (!this.project) return;
    this.project.collaborators.delete(userId);
    this.project.cursors.delete(userId);
    const mockData = this.mockCollaborators.get(userId);
    if (mockData?.nextOpTimer) {
      clearTimeout(mockData.nextOpTimer);
    }
    this.mockCollaborators.delete(userId);
    this.notifyCursors();
    globalEventBus.emit({ type: 'collab:user-left', payload: userId });
  }

  leaveProject(): void {
    if (this.project) {
      const me = this.project.collaborators.get(this.localClientId);
      if (me) this.project.collaborators.delete(me.userId);
    }
    for (const [userId] of this.mockCollaborators) {
      const data = this.mockCollaborators.get(userId);
      if (data?.nextOpTimer) {
        clearTimeout(data.nextOpTimer);
      }
    }
    this.mockCollaborators.clear();
    this.project = null;
    this.historyStack = [];
    this.redoStack = [];
    this.conflicts = [];
    this.pendingOps = [];
    globalEventBus.emit({ type: 'collab:leave', payload: this.localClientId });
  }

  private incrementClock(): number {
    this.lamportClock++;
    return this.lamportClock;
  }

  private receiveClock(remoteClock: number): void {
    this.lamportClock = Math.max(this.lamportClock, remoteClock) + 1;
  }

  private flushOps(): void {
    if (this.pendingOps.length === 0) return;
    const ops = this.pendingOps.splice(0);
    globalEventBus.emit({ type: 'collab:ops', payload: { clientId: this.localClientId, ops } });
  }

  private notifyCursors(): void {
    const cursors = this.getCursors().filter((c) => c.userId !== this.localClientId);
    for (const l of this.listeners) l(cursors);
  }
}

export const collabService = new CollabService();
