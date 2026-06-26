// 游戏设计文档（GDD）协作
// 文档在线协作编辑、版本历史、模板

import { globalEventBus } from '../core/event-bus';

// 文档块
export interface DocBlock {
  id: string;
  type:
    | 'paragraph'
    | 'heading'
    | 'bullet'
    | 'numbered'
    | 'code'
    | 'image'
    | 'table'
    | 'quote'
    | 'checklist';
  content: string;
  metadata?: Record<string, any>;
}

// 文档
export interface GameDesignDoc {
  id: string;
  title: string;
  template: string;
  blocks: DocBlock[];
  tags: string[];
  category:
    | 'gdd'
    | 'level-design'
    | 'character'
    | 'narrative'
    | 'system'
    | 'art'
    | 'audio'
    | 'monetization';
  collaborators: {
    userId: string;
    role: 'owner' | 'editor' | 'commenter' | 'viewer';
    joinedAt: number;
  }[];
  versions: DocVersion[];
  comments: DocComment[];
  linkedResources: { type: 'code' | 'asset' | 'task' | 'other-doc'; id: string; ref: string }[];
  status: 'draft' | 'review' | 'approved' | 'archived';
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  // 实时协作
  activeSessions: { userId: string; cursor: number; selection?: { start: number; end: number } }[];
}

// 文档版本
export interface DocVersion {
  id: string;
  versionNumber: number;
  blocks: DocBlock[];
  author: string;
  message: string;
  timestamp: number;
  changes: { blockId: string; type: 'added' | 'modified' | 'deleted' }[];
}

// 评论
export interface DocComment {
  id: string;
  author: string;
  content: string;
  blockId?: string;
  range?: { start: number; end: number };
  resolved: boolean;
  replies: { id: string; author: string; content: string; timestamp: number }[];
  timestamp: number;
  reactions: { emoji: string; users: string[] }[];
}

// 文档模板
export interface DocTemplate {
  id: string;
  name: string;
  category: GameDesignDoc['category'];
  description: string;
  blocks: Omit<DocBlock, 'id'>[];
}

class GDDCollabService {
  private docs = new Map<string, GameDesignDoc>();
  private templates: DocTemplate[] = [];
  private currentUser = 'user-1'; // 模拟当前用户
  private listeners = new Set<(event: string, data: any) => void>();
  private remoteOps: { docId: string; op: any; userId: string; timestamp: number }[] = [];

  constructor() {
    this.registerBuiltInTemplates();
  }

  // 注册模板
  private registerBuiltInTemplates(): void {
    this.templates = [
      {
        id: 'gdd-template',
        name: '游戏设计文档 (GDD)',
        category: 'gdd',
        description: '完整的游戏设计文档模板',
        blocks: [
          { type: 'heading', content: '游戏概述' },
          { type: 'paragraph', content: '请用一段话描述游戏的核心概念...' },
          { type: 'heading', content: '核心玩法' },
          { type: 'bullet', content: '主要玩法机制 1' },
          { type: 'bullet', content: '主要玩法机制 2' },
          { type: 'heading', content: '目标用户' },
          { type: 'paragraph', content: '目标用户群体描述...' },
          { type: 'heading', content: '差异化卖点' },
          { type: 'numbered', content: '与同类游戏的差异化' },
          { type: 'heading', content: '技术方案' },
          { type: 'paragraph', content: '使用的引擎和技术栈...' },
        ],
      },
      {
        id: 'level-design',
        name: '关卡设计',
        category: 'level-design',
        description: '关卡设计文档模板',
        blocks: [
          { type: 'heading', content: '关卡名称' },
          { type: 'paragraph', content: '关卡名称' },
          { type: 'heading', content: '关卡概述' },
          { type: 'paragraph', content: '关卡的主要内容和目标' },
          { type: 'heading', content: '敌人配置' },
          { type: 'bullet', content: '敌人类型 1' },
          { type: 'bullet', content: '敌人类型 2' },
          { type: 'heading', content: '道具和奖励' },
          { type: 'bullet', content: '可收集道具' },
          { type: 'bullet', content: '通关奖励' },
        ],
      },
      {
        id: 'character-design',
        name: '角色设计',
        category: 'character',
        description: '角色设定文档模板',
        blocks: [
          { type: 'heading', content: '角色基本信息' },
          { type: 'paragraph', content: '姓名、年龄、身份' },
          { type: 'heading', content: '性格特点' },
          { type: 'bullet', content: '性格 1' },
          { type: 'bullet', content: '性格 2' },
          { type: 'heading', content: '背景故事' },
          { type: 'paragraph', content: '角色的过去和动机' },
          { type: 'heading', content: '能力设定' },
          { type: 'bullet', content: '技能 1' },
        ],
      },
    ];
  }

  // 创建文档
  createDoc(
    title: string,
    templateId?: string,
    category?: GameDesignDoc['category']
  ): GameDesignDoc {
    let blocks: DocBlock[] = [];
    if (templateId) {
      const tpl = this.templates.find((t) => t.id === templateId);
      if (tpl) {
        blocks = tpl.blocks.map((b, i) => ({ ...b, id: `block-${i}` }));
      }
    }

    const doc: GameDesignDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      template: templateId || '',
      blocks,
      tags: [],
      category: category || 'gdd',
      collaborators: [{ userId: this.currentUser, role: 'owner', joinedAt: Date.now() }],
      versions: [],
      comments: [],
      linkedResources: [],
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: this.currentUser,
      activeSessions: [],
    };

    this.docs.set(doc.id, doc);
    this.notify('doc:created', doc);
    return doc;
  }

  // 从模板创建
  createFromTemplate(templateId: string, title: string): GameDesignDoc {
    const tpl = this.templates.find((t) => t.id === templateId);
    if (!tpl) throw new Error('模板不存在');
    return this.createDoc(title, templateId, tpl.category);
  }

  // 更新块
  updateBlock(docId: string, blockId: string, updates: Partial<DocBlock>): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    const block = doc.blocks.find((b) => b.id === blockId);
    if (!block) return;

    Object.assign(block, updates);
    doc.updatedAt = Date.now();
    this.notify('block:updated', { docId, blockId, block });
  }

  // 插入块
  insertBlock(docId: string, index: number, block: Omit<DocBlock, 'id'>): DocBlock {
    const doc = this.docs.get(docId);
    if (!doc) throw new Error('文档不存在');
    const newBlock: DocBlock = {
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    doc.blocks.splice(index, 0, newBlock);
    doc.updatedAt = Date.now();
    this.notify('block:inserted', { docId, index, block: newBlock });
    return newBlock;
  }

  // 删除块
  deleteBlock(docId: string, blockId: string): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    doc.blocks = doc.blocks.filter((b) => b.id !== blockId);
    doc.updatedAt = Date.now();
    this.notify('block:deleted', { docId, blockId });
  }

  // 移动块
  moveBlock(docId: string, blockId: string, newIndex: number): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    const idx = doc.blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const [block] = doc.blocks.splice(idx, 1);
    doc.blocks.splice(newIndex, 0, block);
    doc.updatedAt = Date.now();
    this.notify('block:moved', { docId, blockId, newIndex });
  }

  // 添加协作者
  addCollaborator(
    docId: string,
    userId: string,
    role: GameDesignDoc['collaborators'][0]['role']
  ): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    if (doc.collaborators.find((c) => c.userId === userId)) return;
    doc.collaborators.push({ userId, role, joinedAt: Date.now() });
    this.notify('collaborator:added', { docId, userId, role });
  }

  // 模拟远程操作（用于演示实时协作）
  applyRemoteOp(
    docId: string,
    op: { type: string; blockId?: string; content?: any; userId: string }
  ): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    this.remoteOps.push({ docId, op, userId: op.userId, timestamp: Date.now() });
    this.notify('remote:op', { docId, op });
  }

  // 模拟协作者活动
  simulateCollaboratorActivity(docId: string, userId: string): void {
    const doc = this.docs.get(docId);
    if (!doc) return;

    // 添加到活跃会话
    if (!doc.activeSessions.find((s) => s.userId === userId)) {
      doc.activeSessions.push({ userId, cursor: 0 });
    } else {
      const session = doc.activeSessions.find((s) => s.userId === userId);
      if (session) session.cursor = Math.floor(Math.random() * doc.blocks.length);
    }
    this.notify('session:updated', { docId, activeSessions: doc.activeSessions });
  }

  // 保存版本
  saveVersion(docId: string, message: string): DocVersion {
    const doc = this.docs.get(docId);
    if (!doc) throw new Error('文档不存在');
    const changes: DocVersion['changes'] = [];

    const lastVersion = doc.versions[doc.versions.length - 1];
    if (lastVersion) {
      const oldBlocks = new Map(lastVersion.blocks.map((b) => [b.id, b]));
      for (const block of doc.blocks) {
        const old = oldBlocks.get(block.id);
        if (!old) changes.push({ blockId: block.id, type: 'added' });
        else if (JSON.stringify(old) !== JSON.stringify(block))
          changes.push({ blockId: block.id, type: 'modified' });
      }
      for (const old of lastVersion.blocks) {
        if (!doc.blocks.find((b) => b.id === old.id)) {
          changes.push({ blockId: old.id, type: 'deleted' });
        }
      }
    } else {
      for (const block of doc.blocks) changes.push({ blockId: block.id, type: 'added' });
    }

    const version: DocVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      versionNumber: doc.versions.length + 1,
      blocks: JSON.parse(JSON.stringify(doc.blocks)),
      author: this.currentUser,
      message,
      timestamp: Date.now(),
      changes,
    };
    doc.versions.push(version);
    this.notify('version:saved', { docId, version });
    return version;
  }

  // 回滚版本
  rollbackToVersion(docId: string, versionId: string): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    const version = doc.versions.find((v) => v.id === versionId);
    if (!version) return;
    doc.blocks = JSON.parse(JSON.stringify(version.blocks));
    doc.updatedAt = Date.now();
    this.notify('version:rolled-back', { docId, versionId });
  }

  // 添加评论
  addComment(
    docId: string,
    content: string,
    blockId?: string,
    range?: { start: number; end: number }
  ): DocComment {
    const doc = this.docs.get(docId);
    if (!doc) throw new Error('文档不存在');
    const comment: DocComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: this.currentUser,
      content,
      blockId,
      range,
      resolved: false,
      replies: [],
      timestamp: Date.now(),
      reactions: [],
    };
    doc.comments.push(comment);
    this.notify('comment:added', { docId, comment });
    return comment;
  }

  // 回复评论
  replyToComment(docId: string, commentId: string, content: string): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    const comment = doc.comments.find((c) => c.id === commentId);
    if (!comment) return;
    comment.replies.push({
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: this.currentUser,
      content,
      timestamp: Date.now(),
    });
    this.notify('comment:replied', { docId, commentId });
  }

  // 解决评论
  resolveComment(docId: string, commentId: string): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    const comment = doc.comments.find((c) => c.id === commentId);
    if (!comment) return;
    comment.resolved = true;
    this.notify('comment:resolved', { docId, commentId });
  }

  // 链接资源
  linkResource(
    docId: string,
    type: GameDesignDoc['linkedResources'][0]['type'],
    ref: string,
    id: string
  ): void {
    const doc = this.docs.get(docId);
    if (!doc) return;
    doc.linkedResources.push({ type, id, ref });
    this.notify('resource:linked', { docId, type, id, ref });
  }

  // 搜索文档
  searchDocs(query: string): GameDesignDoc[] {
    const q = query.toLowerCase();
    return Array.from(this.docs.values()).filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.blocks.some((b) => b.content.toLowerCase().includes(q)) ||
        doc.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // 列出文档
  listDocs(filter?: {
    category?: GameDesignDoc['category'];
    status?: GameDesignDoc['status'];
  }): GameDesignDoc[] {
    let docs = Array.from(this.docs.values());
    if (filter?.category) docs = docs.filter((d) => d.category === filter.category);
    if (filter?.status) docs = docs.filter((d) => d.status === filter.status);
    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // 获取文档
  getDoc(docId: string): GameDesignDoc | undefined {
    return this.docs.get(docId);
  }

  // 获取模板
  getTemplates(): DocTemplate[] {
    return [...this.templates];
  }

  // 导出 Markdown
  exportToMarkdown(docId: string): string {
    const doc = this.docs.get(docId);
    if (!doc) return '';
    const lines: string[] = [`# ${doc.title}`, ''];
    for (const block of doc.blocks) {
      switch (block.type) {
        case 'heading':
          lines.push(`## ${block.content}`, '');
          break;
        case 'paragraph':
          lines.push(block.content, '');
          break;
        case 'bullet':
          lines.push(`- ${block.content}`);
          break;
        case 'numbered':
          lines.push(`1. ${block.content}`);
          break;
        case 'code':
          lines.push('```', block.content, '```', '');
          break;
        case 'quote':
          lines.push(`> ${block.content}`, '');
          break;
        case 'checklist':
          lines.push(`- [ ] ${block.content}`);
          break;
      }
    }
    return lines.join('\n');
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const gddCollabService = new GDDCollabService();
