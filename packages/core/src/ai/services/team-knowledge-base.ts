import { multiModelRouter } from '../multi-model-router';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  author?: string;
  views: number;
}

export interface SharedSession {
  id: string;
  title: string;
  messages: any[];
  participants: string[];
  createdAt: number;
  lastModified: number;
}

export interface TeamCodeStandard {
  id: string;
  name: string;
  rules: StandardRule[];
  language: string;
  createdAt: number;
}

export interface StandardRule {
  id: string;
  category: string;
  rule: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface KnowledgeSearchResult {
  entries: KnowledgeEntry[];
  total: number;
  query: string;
}

export class TeamKnowledgeBase {
  private knowledgeEntries: Map<string, KnowledgeEntry> = new Map();
  private sharedSessions: Map<string, SharedSession> = new Map();
  private teamStandards: Map<string, TeamCodeStandard> = new Map();

  constructor() {
    this.initDefaultStandards();
  }

  private initDefaultStandards(): void {
    this.teamStandards.set('ts-standard', {
      id: 'ts-standard',
      name: 'TypeScript 编码规范',
      language: 'typescript',
      createdAt: Date.now(),
      rules: [
        {
          id: 'rule-1',
          category: '命名',
          rule: '使用 PascalCase 命名类和接口',
          description: '类名、接口名首字母大写，驼峰命名',
          severity: 'warning',
        },
        {
          id: 'rule-2',
          category: '命名',
          rule: '使用 camelCase 命名变量和函数',
          description: '变量名、函数名首字母小写，驼峰命名',
          severity: 'warning',
        },
        {
          id: 'rule-3',
          category: '类型',
          rule: '优先使用接口而不是类型别名',
          description: '接口可以被扩展和实现，更适合定义对象结构',
          severity: 'info',
        },
        {
          id: 'rule-4',
          category: '代码风格',
          rule: '使用 const 而不是 let',
          description: '除非需要重新赋值，否则使用 const',
          severity: 'warning',
        },
        {
          id: 'rule-5',
          category: '错误处理',
          rule: '使用 try-catch 处理异步错误',
          description: 'async/await 必须配合 try-catch 使用',
          severity: 'error',
        },
      ],
    });

    this.teamStandards.set('react-standard', {
      id: 'react-standard',
      name: 'React 编码规范',
      language: 'react',
      createdAt: Date.now(),
      rules: [
        {
          id: 'react-1',
          category: '组件',
          rule: '组件名使用 PascalCase',
          description: 'React 组件名首字母大写',
          severity: 'error',
        },
        {
          id: 'react-2',
          category: 'hooks',
          rule: '只在组件顶层调用 Hooks',
          description: '不要在循环、条件或嵌套函数中调用 Hooks',
          severity: 'error',
        },
        {
          id: 'react-3',
          category: 'hooks',
          rule: '自定义 Hooks 以 use 开头',
          description: '自定义 Hook 必须以 use 前缀命名',
          severity: 'warning',
        },
        {
          id: 'react-4',
          category: 'props',
          rule: '使用 TypeScript 定义 props 类型',
          description: '使用 interface 或 type 定义 props',
          severity: 'warning',
        },
      ],
    });
  }

  addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt' | 'views'>): KnowledgeEntry {
    const now = Date.now();
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: `knowledge-${now}`,
      createdAt: now,
      updatedAt: now,
      views: 0,
    };
    this.knowledgeEntries.set(newEntry.id, newEntry);
    return newEntry;
  }

  getKnowledge(id: string): KnowledgeEntry | undefined {
    const entry = this.knowledgeEntries.get(id);
    if (entry) {
      entry.views++;
    }
    return entry;
  }

  searchKnowledge(query: string): KnowledgeSearchResult {
    const entries = Array.from(this.knowledgeEntries.values()).filter(entry =>
      entry.title.toLowerCase().includes(query.toLowerCase()) ||
      entry.content.toLowerCase().includes(query.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    return {
      entries,
      total: entries.length,
      query,
    };
  }

  getAllKnowledge(): KnowledgeEntry[] {
    return Array.from(this.knowledgeEntries.values());
  }

  updateKnowledge(id: string, updates: Partial<KnowledgeEntry>): KnowledgeEntry | undefined {
    const entry = this.knowledgeEntries.get(id);
    if (entry) {
      const updated = { ...entry, ...updates, updatedAt: Date.now() };
      this.knowledgeEntries.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteKnowledge(id: string): boolean {
    return this.knowledgeEntries.delete(id);
  }

  createSharedSession(title: string, participants: string[]): SharedSession {
    const session: SharedSession = {
      id: `session-${Date.now()}`,
      title,
      messages: [],
      participants,
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
    this.sharedSessions.set(session.id, session);
    return session;
  }

  getSharedSession(id: string): SharedSession | undefined {
    return this.sharedSessions.get(id);
  }

  addMessageToSession(sessionId: string, message: any): SharedSession | undefined {
    const session = this.sharedSessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.lastModified = Date.now();
      this.sharedSessions.set(sessionId, session);
    }
    return session;
  }

  getAllSharedSessions(): SharedSession[] {
    return Array.from(this.sharedSessions.values());
  }

  getTeamStandards(): TeamCodeStandard[] {
    return Array.from(this.teamStandards.values());
  }

  getTeamStandard(id: string): TeamCodeStandard | undefined {
    return this.teamStandards.get(id);
  }

  addTeamStandard(standard: Omit<TeamCodeStandard, 'id' | 'createdAt'>): TeamCodeStandard {
    const newStandard: TeamCodeStandard = {
      ...standard,
      id: `standard-${Date.now()}`,
      createdAt: Date.now(),
    };
    this.teamStandards.set(newStandard.id, newStandard);
    return newStandard;
  }

  async queryKnowledge(query: string, context?: string): Promise<string> {
    const systemPrompt = `你是团队知识库助手。请根据以下知识库内容回答问题。

知识库条目:
${this.getAllKnowledge().map(k => `标题: ${k.title}\n标签: ${k.tags.join(', ')}\n内容: ${k.content.substring(0, 200)}`).join('\n\n')}

团队规范:
${this.getTeamStandards().map(s => `名称: ${s.name}\n规则: ${s.rules.map(r => r.rule).join(', ')}`).join('\n\n')}
`;

    const result = await multiModelRouter.execute('team-knowledge', context ? `${context}\n\n问题: ${query}` : query, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });

    return result.content;
  }
}

export const teamKnowledgeBase = new TeamKnowledgeBase();
