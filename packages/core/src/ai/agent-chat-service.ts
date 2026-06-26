// Agent 对话界面与工作流
// 多轮对话、任务进度可视化、步骤确认、修改预览

import { globalEventBus } from '../core/event-bus';
import { autonomousAgentService, AgentTask, AgentStep } from './autonomous-agent-service';

// 对话消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: { name: string; args: any; result?: any }[];
  taskId?: string;
  attachments?: { type: 'file' | 'image' | 'symbol'; data: any }[];
}

// Agent 角色
export interface AgentRole {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  capabilities: string[];
  preferredTools: string[];
}

// 工作流模板
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: { name: string; description: string; tool?: string }[];
  category: string;
}

class AgentChatService {
  private messages: ChatMessage[] = [];
  private currentRole: string = 'general';
  private activeTaskId: string | null = null;
  private listeners = new Set<(messages: ChatMessage[]) => void>();
  private taskUpdateListeners = new Set<(task: AgentTask) => void>();
  private roles: AgentRole[] = [];
  private workflows: WorkflowTemplate[] = [];
  private commandHistory: string[] = [];

  constructor() {
    this.registerDefaultRoles();
    this.registerDefaultWorkflows();
    this.setupSystemPrompt();
    this.loadHistory();
  }

  // 注册默认角色
  private registerDefaultRoles(): void {
    this.roles = [
      {
        id: 'general',
        name: '通用助手',
        description: '通用的编程助手，能处理各种任务',
        icon: '🤖',
        systemPrompt: '你是一个专业的编程助手，能够帮助用户完成各种编程任务。',
        capabilities: ['代码生成', '代码审查', '错误诊断', '重构建议'],
        preferredTools: ['read_file', 'write_file', 'search_code', 'generate_code'],
      },
      {
        id: 'frontend',
        name: '前端专家',
        description: '专注于前端开发：React、Vue、CSS、UI 设计',
        icon: '🎨',
        systemPrompt: '你是一个前端开发专家，专注于 React、Vue、TypeScript、CSS 和现代 Web 开发。',
        capabilities: ['React 组件', 'CSS 布局', '性能优化', '响应式设计'],
        preferredTools: ['read_file', 'write_file', 'search_code', 'generate_code'],
      },
      {
        id: 'backend',
        name: '后端专家',
        description: '专注于服务端开发：API、数据库、系统设计',
        icon: '⚙️',
        systemPrompt: '你是一个后端开发专家，专注于 API 设计、数据库、系统架构和性能优化。',
        capabilities: ['API 设计', '数据库优化', '系统架构', '并发处理'],
        preferredTools: ['read_file', 'write_file', 'search_code', 'generate_code'],
      },
      {
        id: 'game-dev',
        name: '游戏开发专家',
        description: '专注于小游戏开发：Cocos、Phaser、Three.js',
        icon: '🎮',
        systemPrompt:
          '你是一个游戏开发专家，专注于小游戏开发、TapTap SDK、Cocos Creator 和 Phaser。',
        capabilities: ['游戏逻辑', '物理引擎', '动画系统', 'TapTap SDK'],
        preferredTools: ['read_file', 'write_file', 'search_code', 'generate_code'],
      },
      {
        id: 'reviewer',
        name: '代码审查员',
        description: '专注于代码质量审查和重构建议',
        icon: '🔍',
        systemPrompt: '你是一个严格的代码审查员，关注代码质量、安全性和最佳实践。',
        capabilities: ['代码审查', '安全检测', '性能分析', '重构建议'],
        preferredTools: ['read_file', 'search_code', 'diagnose_error'],
      },
    ];
  }

  // 注册工作流
  private registerDefaultWorkflows(): void {
    this.workflows = [
      {
        id: 'add-feature',
        name: '添加新功能',
        description: '从需求到实现的完整流程',
        category: 'development',
        steps: [
          { name: '需求分析', description: '分析用户需求并制定计划' },
          { name: '代码生成', description: '生成实现代码', tool: 'generate_code' },
          { name: '测试编写', description: '编写单元测试' },
          { name: '运行测试', description: '执行测试验证', tool: 'run_test' },
          { name: '代码审查', description: '审查代码质量' },
        ],
      },
      {
        id: 'fix-bug',
        name: '修复 Bug',
        description: '定位并修复问题',
        category: 'maintenance',
        steps: [
          { name: '问题复现', description: '理解错误现象' },
          { name: '根因分析', description: '定位问题根因', tool: 'diagnose_error' },
          { name: '修复实施', description: '修改代码修复问题' },
          { name: '回归测试', description: '验证修复效果', tool: 'run_test' },
        ],
      },
      {
        id: 'refactor',
        name: '代码重构',
        description: '改善代码结构和质量',
        category: 'quality',
        steps: [
          { name: '代码分析', description: '分析现有代码' },
          { name: '重构方案', description: '制定重构计划' },
          { name: '重构实施', description: '应用重构' },
          { name: '测试验证', description: '确保行为不变', tool: 'run_test' },
        ],
      },
    ];
  }

  // 系统提示
  private setupSystemPrompt(): void {
    this.messages.push({
      id: `msg-system-${Date.now()}`,
      role: 'system',
      content:
        '我是 TapDev Studio 的 AI 编程助手，可以帮助你完成代码生成、错误诊断、代码审查等任务。',
      timestamp: Date.now(),
    });
  }

  // 发送消息
  async sendMessage(
    content: string,
    options?: { taskId?: string; attachments?: ChatMessage['attachments'] }
  ): Promise<ChatMessage> {
    // 记录命令
    this.commandHistory.push(content);
    if (this.commandHistory.length > 100) this.commandHistory = this.commandHistory.slice(0, 100);

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      taskId: options?.taskId,
      attachments: options?.attachments,
    };
    this.messages.push(userMessage);
    this.notify();

    // 检查是否需要创建任务
    const task = await this.maybeCreateTask(content, options?.attachments);

    // 生成 AI 响应
    const assistantMessage = await this.generateResponse(content, task);
    this.messages.push(assistantMessage);
    this.notify();

    // 如果有任务，启动它
    if (task && !options?.taskId) {
      this.activeTaskId = task.id;
      autonomousAgentService.startTask(task.id).catch(() => {});
    }

    return assistantMessage;
  }

  // 检查是否需要创建任务
  private async maybeCreateTask(
    content: string,
    attachments?: ChatMessage['attachments']
  ): Promise<AgentTask | null> {
    const taskKeywords = [
      '创建',
      '实现',
      '添加',
      '生成',
      '做',
      '帮我',
      '请',
      'create',
      'implement',
      'add',
      'generate',
      'make',
    ];
    const isTaskRequest = taskKeywords.some((k) => content.toLowerCase().includes(k));

    if (!isTaskRequest) return null;

    // 提取相关文件
    const relevantFiles =
      attachments
        ?.filter((a) => a.type === 'file')
        .map((a) => ({ path: a.data.path, content: a.data.content })) || [];

    return autonomousAgentService.createTask(content, { relevantFiles });
  }

  // 生成响应
  private async generateResponse(
    userMessage: string,
    task: AgentTask | null
  ): Promise<ChatMessage> {
    const role = this.roles.find((r) => r.id === this.currentRole);
    const content = this.composeResponse(userMessage, role, task);

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      taskId: task?.id,
    };
  }

  // 组合响应
  private composeResponse(
    userMessage: string,
    role: AgentRole | undefined,
    task: AgentTask | null
  ): string {
    const intro = role ? `作为${role.name}，` : '';
    if (task) {
      return `${intro}我理解了你的需求「${userMessage}」，已创建任务并开始执行。任务 ID: ${task.id}。\n\n我将会：\n1. 分析需求\n2. 制定实施计划\n3. 编写代码\n4. 运行测试\n5. 验证结果\n\n你可以在右侧任务面板查看实时进度。`;
    }
    return `${intro}我已收到你的问题「${userMessage}」。这是一个对话问题，不会启动任务执行。`;
  }

  // 启动工作流
  async startWorkflow(workflowId: string, params: { goal: string }): Promise<AgentTask> {
    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (!workflow) throw new Error('工作流不存在');

    const task = autonomousAgentService.createTask(params.goal);

    // 添加工作流消息
    this.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'system',
      content: `已启动工作流: ${workflow.name}\n包含 ${workflow.steps.length} 个步骤`,
      timestamp: Date.now(),
      taskId: task.id,
    });
    this.notify();

    return task;
  }

  // 切换角色
  setRole(roleId: string): void {
    if (this.roles.find((r) => r.id === roleId)) {
      this.currentRole = roleId;
      this.messages.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'system',
        content: `已切换到 ${this.roles.find((r) => r.id === roleId)!.name}`,
        timestamp: Date.now(),
      });
      this.notify();
    }
  }

  // 暂停任务
  pauseTask(taskId: string): void {
    autonomousAgentService.pauseTask(taskId);
  }

  // 取消任务
  cancelTask(taskId: string): void {
    autonomousAgentService.cancelTask(taskId);
  }

  // 批准步骤
  approveStep(taskId: string, stepId: string): void {
    // 实现步骤批准逻辑
    globalEventBus.emit('agent:step-approved', { taskId, stepId });
  }

  // 获取消息
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  // 获取角色
  getRoles(): AgentRole[] {
    return [...this.roles];
  }

  // 获取当前角色
  getCurrentRole(): AgentRole | undefined {
    return this.roles.find((r) => r.id === this.currentRole);
  }

  // 获取工作流
  getWorkflows(): WorkflowTemplate[] {
    return [...this.workflows];
  }

  // 获取命令历史
  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  // 清空消息
  clearMessages(): void {
    this.messages = [];
    this.setupSystemPrompt();
    this.notify();
  }

  // 订阅消息
  subscribe(listener: (messages: ChatMessage[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 订阅任务更新
  subscribeTaskUpdate(listener: (task: AgentTask) => void): () => void {
    this.taskUpdateListeners.add(listener);
    return () => {
      this.taskUpdateListeners.delete(listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l([...this.messages]);
  }

  private notifyTaskUpdate(task: AgentTask): void {
    for (const l of this.taskUpdateListeners) l(task);
  }

  // 加载历史
  private loadHistory(): void {
    try {
      const saved = localStorage.getItem('tapdev_agent_chat_history');
      if (saved) {
        const data = JSON.parse(saved);
        this.messages = data.messages || [];
        this.currentRole = data.role || 'general';
      }
    } catch (e) {}
  }

  // 保存历史
  saveHistory(): void {
    try {
      localStorage.setItem(
        'tapdev_agent_chat_history',
        JSON.stringify({
          messages: this.messages.slice(-50), // 只保留最近 50 条
          role: this.currentRole,
        })
      );
    } catch (e) {}
  }

  // 处理文件引用
  parseFileReference(text: string): { type: 'file' | 'symbol' | null; ref: string } | null {
    const fileMatch = text.match(/@file:([^\s]+)/);
    if (fileMatch) return { type: 'file', ref: fileMatch[1] };
    const symbolMatch = text.match(/@symbol:([^\s]+)/);
    if (symbolMatch) return { type: 'symbol', ref: symbolMatch[1] };
    return null;
  }
}

export const agentChatService = new AgentChatService();
