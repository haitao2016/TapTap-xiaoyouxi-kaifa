import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export type ReferenceType =
  | 'file'
  | 'function'
  | 'class'
  | 'symbol'
  | 'error'
  | 'snippet'
  | 'selection';

export type ChatStatus = 'idle' | 'thinking' | 'streaming' | 'error';

export interface Reference {
  id: string;
  type: ReferenceType;
  path: string;
  line?: number;
  endLine?: number;
  label: string;
  content?: string;
  language?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  references?: Reference[];
  timestamp: number;
  status?: ChatStatus;
  thinking?: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon?: string;
  prompt: string;
  category: string;
}

export interface AIAssistantConfig {
  systemPrompt?: string;
  maxHistoryMessages?: number;
  temperature?: number;
  stream?: boolean;
}

const DEFAULT_CONFIG: AIAssistantConfig = {
  systemPrompt: '',
  maxHistoryMessages: 50,
  temperature: 0.7,
  stream: false,
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'explain-code',
    title: '解释代码',
    description: '解释选中的代码是做什么的',
    icon: 'book',
    prompt: '请详细解释这段代码的功能和逻辑：',
    category: '代码理解',
  },
  {
    id: 'optimize-code',
    title: '优化代码',
    description: '优化代码性能和可读性',
    icon: 'zap',
    prompt: '请优化以下代码，提高性能和可读性：',
    category: '代码优化',
  },
  {
    id: 'fix-bug',
    title: '修复 Bug',
    description: '帮我找出并修复代码中的问题',
    icon: 'bug',
    prompt: '请分析以下代码，找出可能的 Bug 并提供修复方案：',
    category: '调试修复',
  },
  {
    id: 'add-comments',
    title: '添加注释',
    description: '为代码添加详细注释',
    icon: 'edit',
    prompt: '请为以下代码添加详细的中文注释：',
    category: '文档生成',
  },
  {
    id: 'generate-tests',
    title: '生成测试',
    description: '为代码生成单元测试',
    icon: 'test',
    prompt: '请为以下代码生成单元测试用例：',
    category: '测试生成',
  },
  {
    id: 'refactor',
    title: '重构代码',
    description: '重构代码，改善结构',
    icon: 'refresh-cw',
    prompt: '请重构以下代码，改善其结构和可维护性：',
    category: '代码重构',
  },
  {
    id: 'taptap-sdk',
    title: 'TapTap SDK',
    description: '咨询 TapTap SDK 相关问题',
    icon: 'gamepad-2',
    prompt: '我有一个关于 TapTap SDK 的问题：',
    category: 'SDK 咨询',
  },
  {
    id: 'best-practices',
    title: '最佳实践',
    description: '获取代码最佳实践建议',
    icon: 'lightbulb',
    prompt: '请针对以下场景给出最佳实践建议：',
    category: '最佳实践',
  },
];

export class AIAssistantService {
  private sessions = new Map<string, ChatSession>();
  private activeSessionId: string | null = null;
  private fileIndex = new Map<string, string>();
  private symbolIndex = new Map<string, { path: string; line: number; type: string }>();
  private config: AIAssistantConfig = { ...DEFAULT_CONFIG };
  private quickActions: QuickAction[] = [...QUICK_ACTIONS];

  constructor() {
    this.createInitialSession();
  }

  private createInitialSession(): void {
    const initial: ChatSession = {
      id: randomUUID(),
      title: '新对话',
      messages: [
        {
          id: randomUUID(),
          role: 'system',
          content: this.getSystemPrompt(),
          timestamp: Date.now(),
        },
        {
          id: randomUUID(),
          role: 'assistant',
          content:
            '你好！我是 TapDev Studio AI 助手。我可以帮你：\n\n• 解答 TapTap SDK 用法\n• 代码解释、优化、重构代码\n• 生成测试用例\n• 调试和修复 Bug\n• 添加注释和文档\n\n有什么我可以帮助你的吗？',
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(initial.id, initial);
    this.activeSessionId = initial.id;
  }

  private getSystemPrompt(): string {
    if (this.config.systemPrompt) {
      return this.config.systemPrompt;
    }
    return `你是 TapDev Studio AI 助手，一个专业的小游戏开发助手。你的主要职责是帮助开发者使用 TapTap SDK 和其他游戏开发技术。

你具备以下能力：
1. 解答 TapTap SDK 相关问题（登录、支付、成就、排行榜、好友等）
2. 代码解释、优化、重构
3. 生成测试用例
4. 调试和修复 Bug
5. 添加注释和文档生成
6. 最佳实践建议

回答时请遵循以下规则：
- 使用清晰、简洁、专业的中文回答
- 代码示例要完整可运行
- 提供多种解决方案时，说明优缺点
- 不确定时诚实地说明
- 引用官方文档链接帮助用户深入学习

你可以引用的技术栈包括：
- JavaScript / TypeScript
- Cocos Creator / Unity
- TapTap SDK
- 前端框架（React/Vue）
- 游戏开发最佳实践`;
  }

  configure(config: Partial<AIAssistantConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AIAssistantConfig {
    return { ...this.config };
  }

  getActiveSession(): ChatSession | null {
    return this.activeSessionId ? (this.sessions.get(this.activeSessionId) ?? null) : null;
  }

  listSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  switchSession(id: string): boolean {
    if (this.sessions.has(id)) {
      this.activeSessionId = id;
      globalEventBus.emit({ type: 'ai:session-switch', payload: id });
      return true;
    }
    return false;
  }

  createSession(title?: string): ChatSession {
    const session: ChatSession = {
      id: randomUUID(),
      title: title ?? '新对话',
      messages: [
        {
          id: randomUUID(),
          role: 'system',
          content: this.getSystemPrompt(),
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    globalEventBus.emit({ type: 'ai:session-create', payload: session });
    return session;
  }

  deleteSession(id: string): boolean {
    if (!this.sessions.has(id)) return false;

    this.sessions.delete(id);
    if (this.activeSessionId === id) {
      const next = this.listSessions()[0];
      this.activeSessionId = next?.id ?? null;
      if (!this.activeSessionId) {
        this.createInitialSession();
      }
    }
    globalEventBus.emit({ type: 'ai:session-delete', payload: id });
    return true;
  }

  renameSession(id: string, title: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.title = title;
    session.updatedAt = Date.now();
    globalEventBus.emit({ type: 'ai:session-update', payload: session });
    return true;
  }

  getQuickActions(category?: string): QuickAction[] {
    if (!category) return [...this.quickActions];
    return this.quickActions.filter((a) => a.category === category);
  }

  getQuickActionCategories(): { id: string; name: string; count: number }[] {
    const categories = new Map<string, { id: string; name: string; count: number }>();
    for (const action of this.quickActions) {
      if (!categories.has(action.category)) {
        categories.set(action.category, { id: action.category, name: action.category, count: 0 });
      }
      categories.get(action.category)!.count++;
    }
    return [...categories.values()];
  }

  addQuickAction(action: Omit<QuickAction, 'id'>): void {
    this.quickActions.push({ ...action, id: randomUUID() });
  }

  removeQuickAction(id: string): boolean {
    const index = this.quickActions.findIndex((a) => a.id === id);
    if (index !== -1) {
      this.quickActions.splice(index, 1);
      return true;
    }
    return false;
  }

  indexProjectFiles(files: { path: string; content: string }[]): void {
    this.fileIndex.clear();
    this.symbolIndex.clear();

    for (const f of files) {
      this.fileIndex.set(f.path, f.content);

      const symbols = this.extractSymbols(f.content, f.path);
      for (const s of symbols) {
        this.symbolIndex.set(`${f.path}#${s.name}`, {
          path: f.path,
          line: s.line,
          type: s.type,
        });
      }
    }

    globalEventBus.emit({
      type: 'ai:file-indexed',
      payload: { files: files.length, symbols: this.symbolIndex.size },
    });
  }

  addIndexedFile(path: string, content: string): void {
    this.fileIndex.set(path, content);
    const symbols = this.extractSymbols(content, path);
    for (const s of symbols) {
      this.symbolIndex.set(`${path}#${s.name}`, {
        path,
        line: s.line,
        type: s.type,
      });
    }
  }

  removeIndexedFile(path: string): void {
    this.fileIndex.delete(path);
    for (const key of this.symbolIndex.keys()) {
      if (key.startsWith(`${path}#`)) {
        this.symbolIndex.delete(key);
      }
    }
  }

  getIndexedFiles(): { path: string; content: string }[] {
    return Array.from(this.fileIndex.entries()).map(([path, content]) => ({ path, content }));
  }

  searchSymbols(query: string): { path: string; name: string; type: string; line: number }[] {
    const results: { path: string; name: string; type: string; line: number }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, info] of this.symbolIndex) {
      const name = key.split('#')[1];
      if (name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          path: info.path,
          name,
          type: info.type,
          line: info.line,
        });
      }
    }

    return results.slice(0, 20);
  }

  parseReferences(content: string): { clean: string; refs: Reference[] } {
    const refs: Reference[] = [];
    let clean = content;

    clean = clean.replace(/@([\w./#-]+)/g, (match) => {
      const name = match.slice(1);
      const ref = this.resolveReference(name);
      if (ref) {
        refs.push(ref);
        return `[${ref.label}]`;
      }
      return match;
    });

    clean = clean.replace(/```([\s\S]*?)```/g, (match, code) => {
      return match;
    });

    return { clean, refs };
  }

  private resolveReference(name: string): Reference | null {
    if (this.fileIndex.has(name)) {
      return {
        id: randomUUID(),
        type: 'file',
        path: name,
        label: name.split('/').pop() ?? name,
        content: this.fileIndex.get(name),
      };
    }

    if (name.includes('#')) {
      const [path, sym] = name.split('#');
      const symbol = this.symbolIndex.get(name);
      if (symbol) {
        return {
          id: randomUUID(),
          type: 'symbol',
          path,
          line: symbol.line,
          label: sym,
          content: this.fileIndex.get(path),
        };
      }
    }

    const files = Array.from(this.fileIndex.keys());
    const matchedFile = files.find((f) => f.endsWith(name) || f.includes(name));
    if (matchedFile) {
      return {
        id: randomUUID(),
        type: 'file',
        path: matchedFile,
        label: matchedFile.split('/').pop() ?? matchedFile,
        content: this.fileIndex.get(matchedFile),
      };
    }

    return null;
  }

  async sendMessage(
    content: string,
    options?: {
      references?: Reference[];
      systemPrompt?: string;
    }
  ): Promise<ChatMessage> {
    const session = this.getActiveSession();
    if (!session) throw new Error('无活动会话');

    const { clean, refs } = this.parseReferences(content);
    const allRefs = [...refs, ...(options?.references ?? [])];

    const userMsg: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content,
      references: allRefs.length > 0 ? allRefs : undefined,
      timestamp: Date.now(),
    };

    session.messages.push(userMsg);
    session.updatedAt = Date.now();

    const thinkingMsg: ChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: '',
      status: 'thinking',
      timestamp: Date.now(),
    };
    session.messages.push(thinkingMsg);

    globalEventBus.emit({ type: 'ai:message', payload: userMsg });

    try {
      const reply = await this.generateResponse(clean, session, allRefs, options);

      thinkingMsg.content = reply.content;
      thinkingMsg.status = undefined;
      thinkingMsg.references = reply.references;
      thinkingMsg.toolCalls = reply.toolCalls;
      thinkingMsg.metadata = reply.metadata;

      session.updatedAt = Date.now();

      globalEventBus.emit({ type: 'ai:message', payload: thinkingMsg });
      return thinkingMsg;
    } catch (err) {
      thinkingMsg.content = `抱歉，发生了错误：${err instanceof Error ? err.message : String(err)}`;
      thinkingMsg.status = 'error';
      session.updatedAt = Date.now();
      globalEventBus.emit({
        type: 'ai:error',
        payload: { error: err instanceof Error ? err.message : String(err) },
      });
      throw err;
    }
  }

  async sendQuickAction(
    actionId: string,
    context?: {
      code?: string;
      language?: string;
      filePath?: string;
    }
  ): Promise<ChatMessage> {
    const action = this.quickActions.find((a) => a.id === actionId);
    if (!action) {
      throw new Error(`找不到快捷操作 "${actionId}" 不存在`);
    }

    let prompt = action.prompt;
    const references: Reference[] = [];

    if (context?.code) {
      prompt += `\n\`\`\`${context.language ?? 'typescript'}\n${context.code}\n\`\`\``;

      if (context.filePath) {
        references.push({
          id: randomUUID(),
          type: 'selection',
          path: context.filePath,
          label: '选中的代码',
          content: context.code,
          language: context.language,
        });
      }
    }

    return this.sendMessage(prompt, { references });
  }

  private async generateResponse(
    prompt: string,
    session: ChatSession,
    refs: Reference[],
    options?: { systemPrompt?: string }
  ): Promise<{
    content: string;
    references?: Reference[];
    toolCalls?: ToolCall[];
    metadata?: Record<string, unknown>;
  }> {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

    const contextSnippet = refs
      .map(
        (r) => `--- ${r.path}${r.line ? `:${r.line}` : ''} ---\n${r.content?.slice(0, 500) ?? ''}`
      )
      .join('\n\n')
      .slice(0, 2000);

    const lowerPrompt = prompt.toLowerCase();

    if (
      lowerPrompt.includes('登录') ||
      lowerPrompt.includes('login') ||
      lowerPrompt.includes('taptap sdk')
    ) {
      return {
        content: this.generateTapTapSDKResponse(prompt),
        references: [
          {
            id: randomUUID(),
            type: 'file',
            path: 'https://developer.taptap.cn/minigameapidoc/',
            label: 'TapTap 开发者文档',
          },
        ],
      };
    }

    if (
      lowerPrompt.includes('支付') ||
      lowerPrompt.includes('payment') ||
      lowerPrompt.includes('iap')
    ) {
      return {
        content: this.generatePaymentResponse(),
      };
    }

    if (lowerPrompt.includes('成就') || lowerPrompt.includes('achievement')) {
      return {
        content: this.generateAchievementResponse(),
      };
    }

    if (lowerPrompt.includes('排行榜') || lowerPrompt.includes('leaderboard')) {
      return {
        content: this.generateLeaderboardResponse(),
      };
    }

    if (lowerPrompt.includes('解释') || lowerPrompt.includes('explain')) {
      return {
        content: this.generateExplainResponse(contextSnippet),
        references: refs.length > 0 ? refs : undefined,
      };
    }

    if (lowerPrompt.includes('优化') || lowerPrompt.includes('optimize')) {
      return {
        content: this.generateOptimizeResponse(contextSnippet),
      };
    }

    if (lowerPrompt.includes('测试') || lowerPrompt.includes('test')) {
      return {
        content: this.generateTestResponse(contextSnippet),
      };
    }

    if (
      lowerPrompt.includes('bug') ||
      lowerPrompt.includes('修复') ||
      lowerPrompt.includes('错误')
    ) {
      return {
        content: this.generateBugFixResponse(contextSnippet),
      };
    }

    return {
      content: `已收到您的问题：「${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}」\n\n${
        contextSnippet ? `参考了 ${refs.length} 个文件/代码片段\n\n` : ''
      }这是一个模拟回复。在实际部署中，这里会调用 AI 服务生成智能回复。\n\n我可以帮你：\n• 解答 TapTap SDK 相关问题\n• 代码解释、优化、重构\n• 生成测试用例\n• 调试和修复 Bug\n• 添加注释和文档`,
      references: refs.length > 0 ? refs : undefined,
      metadata: { simulated: true },
    };
  }

  private generateTapTapSDKResponse(prompt: string): string {
    return `关于 TapTap SDK 的问题，我来为你解答：

## TapTap SDK 快速上手

### 1. 初始化 SDK

\`\`\`typescript
import { TapSDK } from '@taptap/sdk';

// 在游戏启动时初始化
await TapSDK.init({
  clientId: '你的 Client ID',
  clientToken: '你的 Client Token',
});
\`\`\`

### 2. 主要功能模块

- **登录认证** - 支持 TapTap 账号登录、获取用户信息
- **支付系统** - 内购商品、订单查询、回调处理
- **成就系统** - 解锁成就、展示成就列表
- **排行榜** - 提交分数、获取排名
- **好友系统** - 好友列表、邀请好友
- **数据统计** - 事件上报、用户属性

### 3. 常见问题

**Q: 如何获取 Client ID？**
A: 登录 [TapTap 开发者中心](https://developer.taptap.cn/) 创建应用后获取。

**Q: 支持哪些平台？**
A: 支持 iOS、Android、Web（小游戏）等平台。

**Q: 如何测试支付？**
A: 使用沙盒环境进行测试，不会真实扣款。

需要更详细的信息，请参考 [TapTap 开发者文档](https://developer.taptap.cn/minigameapidoc/)。

你具体想了解哪个功能呢？我可以给你更详细的说明。`;
  }

  private generatePaymentResponse(): string {
    return `## TapTap 支付功能说明

### 接入流程

1. **配置商品** - 在开发者后台配置商品
2. **初始化支付** - 调用支付接口
3. **处理回调** - 服务端验证订单
4. **发货** - 验证成功后发放道具

### 代码示例

\`\`\`typescript
import { TapSDK } from '@taptap/sdk';

// 查询商品
const products = await TapSDK.Payment.queryProducts(['product_id_1', 'product_id_2']);

// 发起支付
const result = await TapSDK.Payment.pay({
  productId: 'product_id_1',
  serverId: 'server_1',
  extra: 'custom_data',
});

if (result.success) {
  console.log('支付成功:', result.orderId);
}
\`\`\`

### 注意事项

- 务必在服务端验证订单的真实性
- 处理好用户取消支付的情况
- 支持查询订单状态

详细文档：[TapTap 支付文档](https://developer.taptap.cn/minigameapidoc/api/taptap-payment.html)`;
  }

  private generateAchievementResponse(): string {
    return `## TapTap 成就系统

### 功能说明

成就系统可以激励玩家完成游戏目标，提升游戏粘性。

### 使用步骤

1. **配置成就** - 在开发者后台创建成就
2. **解锁成就** - 游戏内调用解锁接口
3. **展示成就** - 调用成就界面

### 代码示例

\`\`\`typescript
import { TapSDK } from '@taptap/sdk';

// 获取成就列表
const achievements = await TapSDK.Achievement.getAchievementList();

// 解锁成就
await TapSDK.Achievement.unlock('achievement_id');

// 增加成就进度
await TapSDK.Achievement.increment('achievement_id', 10);

// 显示成就界面
await TapSDK.Achievement.showUI();
\`\`\`

### 最佳实践

- 成就设计要有趣味性和挑战性
- 合理设置成就难度梯度
- 成就奖励要与游戏玩法结合

详细文档：[TapTap 成就系统](https://developer.taptap.cn/minigameapidoc/api/taptap-achievement.html)`;
  }

  private generateLeaderboardResponse(): string {
    return `## TapTap 排行榜系统

### 功能说明

排行榜系统让玩家竞争比较，增加游戏竞争性和社交互动。

### 使用步骤

1. **创建排行榜** - 在开发者后台配置
2. **提交分数** - 游戏内提交玩家分数
3. **获取排名** - 获取排行榜数据
4. **展示排行榜** - 调用排行榜 UI

### 代码示例

\`\`\`typescript
import { TapSDK } from '@taptap/sdk';

// 提交分数
await TapSDK.Leaderboard.submitScore('leaderboard_id', 1000);

// 获取排行榜前20名
const topScores = await TapSDK.Leaderboard.getTopScores('leaderboard_id', 20);

// 获取玩家自己的排名
const playerRank = await TapSDK.Leaderboard.getPlayerRank('leaderboard_id');

// 显示排行榜界面
await TapSDK.Leaderboard.showUI('leaderboard_id');
\`\`\`

### 最佳实践

- 设计多种类型的排行榜（分数、通关时间等）
- 合理设置刷新频率
- 防止作弊，服务端验证分数

详细文档：[TapTap 排行榜](https://developer.taptap.cn/minigameapidoc/api/taptap-leaderboard.html)`;
  }

  private generateExplainResponse(code: string): string {
    if (!code) {
      return '请提供需要解释的代码，我会详细为你讲解。';
    }

    return `## 代码解释

这是我对代码的分析：

### 代码概述

这段代码主要实现了以下功能：

1. **功能点一** - 描述第一个主要功能

2. **功能点二** - 描述第二个主要功能

3. **功能点三** - 描述第三个主要功能

### 核心逻辑

\`\`\`typescript
// 核心逻辑说明
\`\`\`

### 关键部分解析

**1. 数据结构**
- 说明使用的数据结构

**2. 算法逻辑**
- 说明主要算法

**3. 设计模式**
- 说明使用的设计模式

### 注意事项

- 注意点 1
- 注意点 2
- 注意点 3

需要我详细解释某个具体部分吗？`;
  }

  private generateOptimizeResponse(code: string): string {
    if (!code) {
      return '请提供需要优化的代码，我会给出优化建议。';
    }

    return `## 代码优化建议

### 优化概述

根据代码分析，我发现以下可以优化的地方：

### 1. 性能优化

**问题：** 描述性能问题

**优化方案：**
\`\`\`typescript
// 优化后的代码
\`\`\`

**收益：** 说明性能提升 X%

### 2. 可读性优化

**问题：** 描述可读性问题

**优化方案：**
\`\`\`typescript
// 优化后的代码
\`\`\`

**收益：** 更易维护

### 3. 代码结构优化

**问题：** 描述结构问题

**优化方案：**
- 建议 1
- 建议 2
- 建议 3

### 4. 最佳实践建议

- 使用常量替代魔法数字
- 添加错误处理
- 添加单元测试

需要我针对某个具体优化点详细说明吗？`;
  }

  private generateTestResponse(code: string): string {
    if (!code) {
      return '请提供需要生成测试的代码，我会生成相应的测试用例。';
    }

    return `## 单元测试用例

### 测试概述

以下是为代码生成的单元测试用例：

\`\`\`typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('测试模块名', () => {
  beforeEach(() => {
    // 测试前准备
  });

  describe('基础功能测试', () => {
    it('应该正确处理正常输入', () => {
      // TODO: 实现测试
      expect(true).toBe(true);
    });

    it('应该正确处理边界情况', () => {
      // TODO: 实现测试
      expect(true).toBe(true);
    });
  });

  describe('异常情况测试', () => {
    it('应该处理空输入', () => {
      // TODO: 实现测试
      expect(true).toBe(true);
    });

    it('应该处理无效输入', () => {
      // TODO: 实现测试
      expect(true).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成', () => {
      // TODO: 实现测试
      expect(true).toBe(true);
    });
  });
});
\`\`\`

### 测试覆盖建议

- 正常输入测试
-边界情况测试
- 异常输入测试
- 性能测试
- 并发测试（如适用

需要我针对某个具体功能生成更详细的测试吗？`;
  }

  private generateBugFixResponse(code: string): string {
    if (!code) {
      return '请提供有问题的代码或错误信息，我会帮你分析和修复。';
    }

    return `## Bug 分析与修复

### 问题分析

根据代码分析，可能存在以下问题：

### 问题 1: [问题名称]

**问题描述：**
描述问题现象

**可能原因：**
- 原因 1
- 原因 2
- 原因 3

**修复方案：**
\`\`\`typescript
// 修复后的代码
\`\`\`

### 问题 2: [问题名称]

**问题描述：**
描述问题现象

**修复方案：**
\`\`\`typescript
// 修复后的代码
\`\`\`

### 调试建议

1. 使用 console.log 输出关键变量
2. 使用浏览器开发者工具断点调试
3. 检查网络请求是否正常
4. 查看控制台错误信息

### 预防措施

- 添加单元测试
- 使用 TypeScript 类型检查
- 使用 ESLint 代码检查
- 代码审查

能提供更具体的错误信息或堆栈吗？这样我可以给出更精准的修复建议。`;
  }

  private extractSymbols(
    content: string,
    filePath: string
  ): { name: string; line: number; type: string }[] {
    const symbols: { name: string; line: number; type: string }[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const funcMatch = line.match(/(?:export\s+)?(?:function|const|let|var)\s+(\w+)/);
      if (funcMatch && funcMatch[1]) {
        symbols.push({ name: funcMatch[1], line: i + 1, type: 'function' });
      }

      const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
      if (classMatch && classMatch[1]) {
        symbols.push({ name: classMatch[1], line: i + 1, type: 'class' });
      }

      const interfaceMatch = line.match(/(?:export\s+)?(?:interface|type)\s+(\w+)/);
      if (interfaceMatch && interfaceMatch[1]) {
        symbols.push({ name: interfaceMatch[1], line: i + 1, type: 'interface' });
      }
    }

    return symbols;
  }

  clearHistory(sessionId?: string): void {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.messages = session.messages.filter((m) => m.role === 'system');
        session.updatedAt = Date.now();
      }
    } else {
      const session = this.getActiveSession();
      if (session) {
        session.messages = session.messages.filter((m) => m.role === 'system');
        session.updatedAt = Date.now();
      }
    }
  }

  getStatistics(): {
    totalSessions: number;
    totalMessages: number;
    activeSession?: ChatSession | null;
  } {
    let totalMessages = 0;
    for (const session of this.sessions.values()) {
      totalMessages += session.messages.filter((m) => m.role !== 'system').length;
    }

    return {
      totalSessions: this.sessions.size,
      totalMessages,
      activeSession: this.getActiveSession(),
    };
  }

  searchSessions(query: string): ChatSession[] {
    const lowerQuery = query.toLowerCase();
    return this.listSessions().filter(
      (s) =>
        s.title.toLowerCase().includes(lowerQuery) ||
        s.messages.some((m) => m.content.toLowerCase().includes(lowerQuery))
    );
  }

  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return JSON.stringify(session, null, 2);
  }

  importSession(json: string): ChatSession | null {
    try {
      const session = JSON.parse(json) as ChatSession;
      if (!session.id || !session.messages) return null;

      const newId = randomUUID();
      const newSession: ChatSession = {
        ...session,
        id: newId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.sessions.set(newId, newSession);
      return newSession;
    } catch {
      return null;
    }
  }
}

export const aiAssistantService = new AIAssistantService();
