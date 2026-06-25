/**
 * AI 助手面板服务
 * - 对话历史持久化
 * - 项目代码索引（RAG）
 * - @文件 / @函数上下文引用
 * - 多会话管理
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';
import { AIProviderBase } from './ai-provider-base';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** 引用的文件/符号 */
  references?: Reference[];
  timestamp: number;
}

export interface Reference {
  type: 'file' | 'function' | 'class' | 'symbol';
  path: string;
  /** 可选位置 */
  line?: number;
  /** 显示标签 */
  label: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export class AIAssistantService extends AIProviderBase {
  private sessions = new Map<string, ChatSession>();
  private activeSessionId: string | null = null;
  /** 项目文件索引（用于 @ 引用） */
  private fileIndex = new Map<string, string>();

  constructor() {
    super();
    const initial: ChatSession = {
      id: randomUUID(),
      title: '新对话',
      messages: [
        {
          id: randomUUID(),
          role: 'system',
          content: '我是 TapDev Studio AI 助手，可以帮你解答 TapTap SDK 用法、代码问题、调试建议。',
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(initial.id, initial);
    this.activeSessionId = initial.id;
  }

  getActiveSession(): ChatSession | null {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) ?? null : null;
  }

  listSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  switchSession(id: string): void {
    if (this.sessions.has(id)) this.activeSessionId = id;
  }

  createSession(title = '新对话'): ChatSession {
    const session: ChatSession = {
      id: randomUUID(),
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    return session;
  }

  deleteSession(id: string): void {
    this.sessions.delete(id);
    if (this.activeSessionId === id) {
      const next = this.listSessions()[0];
      this.activeSessionId = next?.id ?? null;
    }
  }

  /**
   * 索引项目文件（用于 @ 引用自动补全）
   */
  indexProjectFiles(files: { path: string; content: string }[]): void {
    this.fileIndex.clear();
    for (const f of files) {
      this.fileIndex.set(f.path, f.content);
      // 提取顶层函数/类符号
      const symbols = this.extractSymbols(f.content);
      for (const s of symbols) {
        this.fileIndex.set(`${f.path}#${s}`, f.content);
      }
    }
  }

  /**
   * 解析 @ 引用
   */
  parseReferences(content: string): { clean: string; refs: Reference[] } {
    const refs: Reference[] = [];
    const clean = content.replace(/@([\w./#-]+)/g, (_, name: string) => {
      if (this.fileIndex.has(name)) {
        const [path, sym] = name.split('#');
        refs.push({
          type: sym ? 'symbol' : 'file',
          path,
          label: sym ?? path,
        });
        return `[${sym ?? path}]`;
      }
      return `@${name}`;
    });
    return { clean, refs };
  }

  /**
   * 发送消息
   */
  async sendMessage(content: string): Promise<ChatMessage> {
    const session = this.getActiveSession();
    if (!session) throw new Error('无活动会话');

    const { clean, refs } = this.parseReferences(content);
    const userMsg: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content,
      references: refs.length > 0 ? refs : undefined,
      timestamp: Date.now(),
    };
    session.messages.push(userMsg);

    const reply = await this.askAssistant(clean, session, refs);
    session.messages.push(reply);
    session.updatedAt = Date.now();

    if (session.messages.filter(m => m.role !== 'system').length === 1) {
      session.title = clean.slice(0, 20) + (clean.length > 20 ? '...' : '');
    }

    globalEventBus.emit({ type: 'ai:message', payload: reply });
    return reply;
  }

  private async askAssistant(
    prompt: string,
    session: ChatSession,
    refs: Reference[],
  ): Promise<ChatMessage> {
    const config = this.getConfig();

    if (config.provider === 'mock') {
      return this.mockReply(prompt, refs);
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(prompt, session, refs);
      const content = await this.callChat({
        systemPrompt,
        userPrompt,
      });
      return {
        id: randomUUID(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.warn('AI 对话失败，使用 mock 兜底:', err);
      return this.mockReply(prompt, refs);
    }
  }

  private buildSystemPrompt(): string {
    return `你是 TapDev Studio AI 助手，一个专业的 TapTap 小游戏开发助手。
你可以帮助用户：
- 解答 TapTap SDK 使用问题
- 编写和优化游戏代码
- 调试和修复 bug
- 解释代码和技术概念

请使用简洁、专业的语言回答问题。代码示例使用 markdown 代码块格式。`;
  }

  private buildUserPrompt(
    prompt: string,
    session: ChatSession,
    refs: Reference[],
  ): string {
    const contextSnippet = refs
      .map((r) => `--- ${r.path} ---\n${this.fileIndex.get(r.path) ?? ''}`)
      .join('\n\n')
      .slice(0, 3000);

    const recentMessages = session.messages
      .filter(m => m.role !== 'system')
      .slice(-10)
      .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
      .join('\n\n');

    let result = '';
    if (contextSnippet) {
      result += `参考文件上下文:\n${contextSnippet}\n\n`;
    }
    if (recentMessages) {
      result += `对话历史:\n${recentMessages}\n\n`;
    }
    result += `当前问题:\n${prompt}`;
    return result;
  }

  private mockReply(prompt: string, refs: Reference[]): ChatMessage {
    const contextSnippet = refs.length > 0 ? `\n\n参考上下文: ${refs.length} 个文件` : '';
    return {
      id: randomUUID(),
      role: 'assistant',
      content: `已收到您的问题：「${prompt}」${contextSnippet}\n\n(模拟回复：实际部署会调用 AI 服务)`,
      timestamp: Date.now(),
    };
  }

  private extractSymbols(content: string): string[] {
    const symbols: string[] = [];
    const re = /(?:export\s+)?(?:function|class|const|interface|type)\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) symbols.push(m[1]);
    return symbols;
  }
}

export const aiAssistantService = new AIAssistantService();
