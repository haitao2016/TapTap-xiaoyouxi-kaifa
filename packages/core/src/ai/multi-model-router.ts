/**
 * 多模型路由服务
 * - 管理本地/云端多个 AI 模型实例
 * - 根据任务类型智能路由到最合适的模型
 * - 支持并行多模型协同调用
 * - 结果聚合与评分
 */
import { AIProviderBase } from './ai-provider-base';

export type TaskType =
  | 'code-completion'    // 代码补全
  | 'code-generation'    // 代码生成
  | 'code-refactor'      // 代码重构
  | 'code-comment'       // 添加注释
  | 'code-test'          // 生成测试
  | 'code-document'      // 生成文档
  | 'error-diagnosis'    // 错误诊断
  | 'chat'               // 对话问答
  | 'translation'         // 翻译
  | 'summary'            // 总结摘要
  | 'review'             // 代码审查
  | 'doc-generate'       // 文档生成
  | 'tutor'              // 编程教学
  | 'team-knowledge'     // 团队知识
  | 'finetune'           // 模型微调
  | 'plugin-install';    // 插件安装

export interface ModelInstance {
  /** 模型唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 提供商 */
  provider: 'ollama' | 'openai' | 'claude' | 'mock' | 'qwen' | 'deepseek' | 'doubao' | 'zhipu' | 'moonshot' | 'gemini';
  /** 模型名称 */
  model: string;
  /** 服务地址 */
  baseUrl?: string;
  /** API Key（云端模型需要） */
  apiKey?: string;
  /** 支持的任务类型 */
  capabilities: TaskType[];
  /** 优先级（数字越大优先级越高） */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 模型上下文窗口大小 */
  contextWindow?: number;
  /** 模型擅长领域描述 */
  strengths?: string[];
}

export interface RoutingRule {
  /** 任务类型 */
  taskType: TaskType;
  /** 使用的模型 ID 列表（按优先级排序） */
  modelIds: string[];
  /** 调用模式 */
  mode: 'single' | 'parallel' | 'cascade';
  /** 并行调用数量限制 */
  parallelLimit?: number;
  /** 级联超时（ms） */
  cascadeTimeout?: number;
}

export interface ModelResponse {
  /** 响应的模型 ID */
  modelId: string;
  /** 响应内容 */
  content: string;
  /** 响应时间（ms） */
  latency: number;
  /** 质量评分（0-1） */
  score?: number;
  /** 错误信息（如果有） */
  error?: string;
}

export interface AggregatedResult {
  /** 最终聚合内容 */
  content: string;
  /** 使用的模型响应 */
  responses: ModelResponse[];
  /** 聚合策略 */
  strategy: 'best' | 'merge' | 'vote' | 'cascade';
  /** 总耗时（ms） */
  totalLatency: number;
}

export interface OllamaInstance {
  /** Ollama 服务地址 */
  baseUrl: string;
  /** 已安装的模型列表 */
  installedModels: string[];
  /** 连接状态 */
  status: 'connected' | 'disconnected' | 'error';
}

/** 混合协同模式 */
export type HybridMode =
  | 'local-first'      // 本地优先，云端备选
  | 'cloud-first'       // 云端优先，本地备选
  | 'parallel'          // 本地+云端并行，取最优
  | 'local-only'        // 仅使用本地模型
  | 'cloud-only';       // 仅使用云端模型

/** 混合协同状态 */
export interface HybridCallStatus {
  /** 是否正在调用 */
  isCalling: boolean;
  /** 调用的任务类型 */
  taskType?: TaskType;
  /** 使用的模式 */
  mode: HybridMode;
  /** 本地模型调用状态 */
  localStatus?: {
    modelId: string;
    startedAt: number;
    latency?: number;
    content?: string;
    error?: string;
  };
  /** 云端模型调用状态 */
  cloudStatus?: {
    modelId: string;
    startedAt: number;
    latency?: number;
    content?: string;
    error?: string;
  };
  /** 最终选择的模型 */
  selectedModel?: string;
  /** 最终结果 */
  result?: string;
}

export class MultiModelRouter extends AIProviderBase {
  /** 模型实例注册表 */
  private modelRegistry = new Map<string, ModelInstance>();
  /** Ollama 实例列表 */
  private ollamaInstances = new Map<string, OllamaInstance>();
  /** 路由规则 */
  private routingRules = new Map<TaskType, RoutingRule>();
  /** 默认 Ollama 地址 */
  private defaultOllamaUrl = 'http://localhost:11434';
  /** 当前混合协同模式 */
  private hybridMode: HybridMode = 'local-first';
  /** 当前调用状态 */
  private callStatus: HybridCallStatus = {
    isCalling: false,
    mode: 'local-first',
  };

  constructor() {
    super();
    this.initDefaultModels();
    this.initDefaultRules();
  }

  /** 初始化默认模型配置 */
  private initDefaultModels(): void {
    // 本地 Ollama 模型
    this.registerModel({
      id: 'ollama-coder-7b',
      name: 'Qwen2.5 Coder 7B',
      provider: 'ollama',
      model: 'qwen2.5-coder:7b',
      capabilities: ['code-completion', 'code-generation', 'code-comment', 'code-document'],
      priority: 80,
      enabled: true,
      contextWindow: 8192,
      strengths: ['代码生成', '中文理解', '速度快'],
    });

    this.registerModel({
      id: 'ollama-coder-14b',
      name: 'DeepSeek Coder 14B',
      provider: 'ollama',
      model: 'deepseek-coder:14b',
      capabilities: ['code-completion', 'code-generation', 'code-refactor', 'code-test'],
      priority: 90,
      enabled: true,
      contextWindow: 16384,
      strengths: ['代码补全', '代码重构', '测试生成'],
    });

    this.registerModel({
      id: 'ollama-codellama-13b',
      name: 'CodeLlama 13B',
      provider: 'ollama',
      model: 'codellama:13b',
      capabilities: ['code-completion', 'code-generation', 'code-test', 'review'],
      priority: 85,
      enabled: true,
      contextWindow: 16384,
      strengths: ['代码补全', '代码审查', '测试用例'],
    });

    this.registerModel({
      id: 'ollama-general-7b',
      name: 'Qwen2.5 7B（通用）',
      provider: 'ollama',
      model: 'qwen2.5:7b',
      capabilities: ['chat', 'translation', 'summary', 'error-diagnosis'],
      priority: 70,
      enabled: true,
      contextWindow: 8192,
      strengths: ['对话问答', '错误诊断', '通用推理'],
    });

    this.registerModel({
      id: 'ollama-math-7b',
      name: 'MathStral 7B',
      provider: 'ollama',
      model: 'mathstral:7b',
      capabilities: ['error-diagnosis', 'review'],
      priority: 75,
      enabled: false,
      contextWindow: 8192,
      strengths: ['数学推理', '错误分析', '逻辑推理'],
    });

    // 云端模型 - OpenAI 系列
    this.registerModel({
      id: 'openai-gpt4o',
      name: 'GPT-4o',
      provider: 'openai',
      model: 'gpt-4o',
      capabilities: ['code-generation', 'code-refactor', 'code-test', 'chat', 'review', 'error-diagnosis'],
      priority: 98,
      enabled: false,
      contextWindow: 128000,
      strengths: ['最强综合能力', '多模态', '高质量输出'],
    });

    this.registerModel({
      id: 'openai-gpt4',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      model: 'gpt-4-turbo',
      capabilities: ['code-generation', 'code-refactor', 'code-test', 'chat', 'review', 'error-diagnosis'],
      priority: 95,
      enabled: false,
      contextWindow: 128000,
      strengths: ['全面能力', '高质量输出', '长上下文'],
    });

    this.registerModel({
      id: 'openai-gpt35',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      capabilities: ['code-generation', 'code-comment', 'chat', 'translation', 'summary'],
      priority: 85,
      enabled: false,
      contextWindow: 16384,
      strengths: ['速度快', '性价比高', '日常任务'],
    });

    // 云端模型 - Claude 系列
    this.registerModel({
      id: 'claude-opus',
      name: 'Claude Opus',
      provider: 'claude',
      model: 'claude-opus-4-20250514',
      capabilities: ['code-generation', 'code-refactor', 'chat', 'review', 'error-diagnosis'],
      priority: 99,
      enabled: false,
      contextWindow: 200000,
      strengths: ['最强推理', '超长上下文', '代码理解深'],
    });

    this.registerModel({
      id: 'claude-sonnet',
      name: 'Claude Sonnet',
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      capabilities: ['code-generation', 'code-refactor', 'chat', 'review', 'error-diagnosis'],
      priority: 93,
      enabled: false,
      contextWindow: 200000,
      strengths: ['长上下文', '代码理解', '安全性高'],
    });

    this.registerModel({
      id: 'claude-haiku',
      name: 'Claude Haiku',
      provider: 'claude',
      model: 'claude-haiku-4-20250514',
      capabilities: ['code-completion', 'code-generation', 'chat', 'summary', 'translation'],
      priority: 82,
      enabled: false,
      contextWindow: 200000,
      strengths: ['速度最快', '性价比高', '长上下文'],
    });

    // 云端模型 - 国内主流
    this.registerModel({
      id: 'qwen-plus',
      name: '通义千问 Plus',
      provider: 'qwen',
      model: 'qwen-plus',
      capabilities: ['code-generation', 'code-refactor', 'chat', 'review', 'error-diagnosis'],
      priority: 92,
      enabled: false,
      contextWindow: 131072,
      strengths: ['中文最好', '国内访问快', '性价比高'],
    });

    this.registerModel({
      id: 'qwen-coder',
      name: '通义千问 Coder',
      provider: 'qwen',
      model: 'qwen-coder-plus',
      capabilities: ['code-completion', 'code-generation', 'code-refactor', 'code-test'],
      priority: 90,
      enabled: false,
      contextWindow: 131072,
      strengths: ['代码生成强', '中文理解好', '国内访问快'],
    });

    this.registerModel({
      id: 'deepseek-v3',
      name: 'DeepSeek V3',
      provider: 'deepseek',
      model: 'deepseek-chat',
      capabilities: ['code-generation', 'code-refactor', 'chat', 'review', 'error-diagnosis'],
      priority: 91,
      enabled: false,
      contextWindow: 65536,
      strengths: ['推理强', '代码能力强', '性价比高'],
    });

    this.registerModel({
      id: 'deepseek-coder-v2',
      name: 'DeepSeek Coder V2',
      provider: 'deepseek',
      model: 'deepseek-coder',
      capabilities: ['code-completion', 'code-generation', 'code-refactor', 'code-test'],
      priority: 92,
      enabled: false,
      contextWindow: 131072,
      strengths: ['顶级代码能力', '长上下文', '开源'],
    });

    this.registerModel({
      id: 'doubao-pro',
      name: '豆包 Pro',
      provider: 'doubao',
      model: 'doubao-pro-32k',
      capabilities: ['code-generation', 'chat', 'translation', 'summary'],
      priority: 88,
      enabled: false,
      contextWindow: 32768,
      strengths: ['字节生态', '中文好', '国内访问快'],
    });

    this.registerModel({
      id: 'zhipu-glm4',
      name: '智谱 GLM-4',
      provider: 'zhipu',
      model: 'glm-4',
      capabilities: ['code-generation', 'code-refactor', 'chat', 'review'],
      priority: 89,
      enabled: false,
      contextWindow: 131072,
      strengths: ['清华团队', '长上下文', '国内访问快'],
    });

    this.registerModel({
      id: 'moonshot-v1',
      name: '月之暗面 Kimi',
      provider: 'moonshot',
      model: 'moonshot-v1-128k',
      capabilities: ['code-generation', 'chat', 'summary', 'review'],
      priority: 90,
      enabled: false,
      contextWindow: 131072,
      strengths: ['超长上下文', '中文好', '文档处理强'],
    });

    this.registerModel({
      id: 'gemini-pro',
      name: 'Gemini 2.0 Flash',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      capabilities: ['code-generation', 'chat', 'review', 'translation'],
      priority: 91,
      enabled: false,
      contextWindow: 1048576,
      strengths: ['超长上下文', '多模态', '速度快'],
    });
  }

  /** 初始化默认路由规则 - 本地+云端混合协同 */
  private initDefaultRules(): void {
    // 代码补全 - 本地coder模型 + 云端coder模型并行
    this.setRoutingRule('code-completion', {
      taskType: 'code-completion',
      modelIds: [
        'ollama-coder-14b',       // 本地 DeepSeek Coder 14B
        'deepseek-coder-v2',       // 云端 DeepSeek Coder
        'ollama-codellama-13b',    // 本地 CodeLlama
        'qwen-coder',              // 云端通义千问 Coder
      ],
      mode: 'parallel',
      parallelLimit: 2,
    });

    // 代码生成 - 本地coder + 云端高质量模型
    this.setRoutingRule('code-generation', {
      taskType: 'code-generation',
      modelIds: [
        'ollama-coder-14b',       // 本地优先
        'deepseek-coder-v2',      // 云端备选
        'qwen-coder',             // 国内云端
        'claude-sonnet',           // 高质量云端
      ],
      mode: 'cascade',
      cascadeTimeout: 8000,
    });

    // 代码重构 - 本地coder + 云端coder并行，取最优
    this.setRoutingRule('code-refactor', {
      taskType: 'code-refactor',
      modelIds: [
        'ollama-coder-14b',
        'deepseek-coder-v2',
        'ollama-codellama-13b',
        'claude-opus',
      ],
      mode: 'parallel',
      parallelLimit: 2,
    });

    // 代码审查 - 本地+云端协同审查
    this.setRoutingRule('review', {
      taskType: 'review',
      modelIds: [
        'ollama-codellama-13b',  // 本地 CodeLlama
        'claude-sonnet',           // 云端 Claude
        'ollama-general-7b',       // 本地通用
        'deepseek-v3',             // 云端 DeepSeek
      ],
      mode: 'parallel',
      parallelLimit: 2,
    });

    // 错误诊断 - 本地快速诊断 + 云端深度分析
    this.setRoutingRule('error-diagnosis', {
      taskType: 'error-diagnosis',
      modelIds: [
        'ollama-general-7b',      // 本地快速响应
        'qwen-plus',               // 国内云端
        'ollama-coder-14b',        // 本地coder分析
        'claude-opus',             // 云端深度分析
        'deepseek-v3',             // DeepSeek分析
      ],
      mode: 'cascade',
      cascadeTimeout: 10000,
    });

    // 对话问答 - 本地通用 + 云端深度对话
    this.setRoutingRule('chat', {
      taskType: 'chat',
      modelIds: [
        'ollama-general-7b',      // 本地快速响应
        'qwen-plus',               // 通义千问
        'deepseek-v3',             // DeepSeek
        'claude-sonnet',           // Claude
        'moonshot-v1',             // Kimi
      ],
      mode: 'cascade',
      cascadeTimeout: 8000,
    });

    // 测试生成 - 本地coder + 云端coder并行
    this.setRoutingRule('code-test', {
      taskType: 'code-test',
      modelIds: [
        'ollama-coder-14b',
        'deepseek-coder-v2',
        'ollama-codellama-13b',
        'qwen-coder',
      ],
      mode: 'parallel',
      parallelLimit: 2,
    });

    // 翻译 - 本地通用 + 云端翻译模型
    this.setRoutingRule('translation', {
      taskType: 'translation',
      modelIds: [
        'ollama-general-7b',
        'qwen-plus',
        'deepseek-v3',
        'gemini-pro',
      ],
      mode: 'cascade',
      cascadeTimeout: 5000,
    });

    // 总结摘要 - 本地快速 + 云端深度
    this.setRoutingRule('summary', {
      taskType: 'summary',
      modelIds: [
        'ollama-general-7b',
        'moonshot-v1',
        'qwen-plus',
        'deepseek-v3',
      ],
      mode: 'cascade',
      cascadeTimeout: 6000,
    });

    // 代码注释 - 本地coder
    this.setRoutingRule('code-comment', {
      taskType: 'code-comment',
      modelIds: [
        'ollama-coder-7b',
        'qwen-coder',
        'ollama-coder-14b',
      ],
      mode: 'single',
    });

    // 文档生成 - 本地coder + 云端长上下文模型
    this.setRoutingRule('code-document', {
      taskType: 'code-document',
      modelIds: [
        'ollama-coder-7b',
        'qwen-coder',
        'claude-sonnet',
      ],
      mode: 'cascade',
      cascadeTimeout: 5000,
    });

    // 文档生成（独立任务）- 长上下文模型
    this.setRoutingRule('doc-generate', {
      taskType: 'doc-generate',
      modelIds: [
        'ollama-general-7b',
        'moonshot-v1',
        'qwen-plus',
        'claude-sonnet',
        'gemini-pro',
      ],
      mode: 'cascade',
      cascadeTimeout: 10000,
    });

    // 编程教学 - 本地通用 + 云端深度
    this.setRoutingRule('tutor', {
      taskType: 'tutor',
      modelIds: [
        'ollama-general-7b',
        'qwen-plus',
        'deepseek-v3',
        'claude-sonnet',
        'openai-gpt4o',
      ],
      mode: 'cascade',
      cascadeTimeout: 8000,
    });

    // 团队知识 - 长上下文模型
    this.setRoutingRule('team-knowledge', {
      taskType: 'team-knowledge',
      modelIds: [
        'moonshot-v1',
        'qwen-plus',
        'claude-sonnet',
        'gemini-pro',
        'openai-gpt4o',
      ],
      mode: 'cascade',
      cascadeTimeout: 10000,
    });

    // 模型微调 - 本地模型处理
    this.setRoutingRule('finetune', {
      taskType: 'finetune',
      modelIds: [
        'ollama-general-7b',
        'ollama-coder-14b',
      ],
      mode: 'single',
    });

    // 插件安装 - 轻量级任务
    this.setRoutingRule('plugin-install', {
      taskType: 'plugin-install',
      modelIds: [
        'ollama-general-7b',
        'qwen-plus',
      ],
      mode: 'single',
    });
  }

  /** 注册模型 */
  registerModel(model: ModelInstance): void {
    this.modelRegistry.set(model.id, model);
  }

  /** 移除模型 */
  unregisterModel(modelId: string): void {
    this.modelRegistry.delete(modelId);
  }

  /** 获取模型 */
  getModel(modelId: string): ModelInstance | undefined {
    return this.modelRegistry.get(modelId);
  }

  /** 列出所有已启用的模型 */
  listEnabledModels(): ModelInstance[] {
    return Array.from(this.modelRegistry.values()).filter(m => m.enabled);
  }

  /** 更新模型 */
  updateModel(modelId: string, updates: Partial<ModelInstance>): void {
    const model = this.modelRegistry.get(modelId);
    if (model) {
      this.modelRegistry.set(modelId, { ...model, ...updates });
    }
  }

  /** 设置路由规则 */
  setRoutingRule(taskType: TaskType, rule: RoutingRule): void {
    this.routingRules.set(taskType, rule);
  }

  /** 获取路由规则 */
  getRoutingRule(taskType: TaskType): RoutingRule | undefined {
    return this.routingRules.get(taskType);
  }

  /** 发现 Ollama 实例和模型 */
  async discoverOllamaInstances(): Promise<OllamaInstance[]> {
    const instances: OllamaInstance[] = [];

    try {
      const response = await fetch(`${this.defaultOllamaUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json() as { models: { name: string }[] };
        instances.push({
          baseUrl: this.defaultOllamaUrl,
          installedModels: data.models.map(m => m.name),
          status: 'connected',
        });
        this.ollamaInstances.set(this.defaultOllamaUrl, instances[0]);
      }
    } catch {
      // Ollama 未运行
    }

    return instances;
  }

  /** 检查模型是否可用 */
  async checkModelAvailability(modelId: string): Promise<boolean> {
    const model = this.modelRegistry.get(modelId);
    if (!model || !model.enabled) return false;

    if (model.provider === 'ollama') {
      try {
        const url = model.baseUrl ?? this.defaultOllamaUrl;
        const response = await fetch(`${url}/api/tags`);
        if (response.ok) {
          const data = await response.json() as { models: { name: string }[] };
          return data.models.some(m => m.name === model.model);
        }
      } catch {
        return false;
      }
    }

    return true;
  }

  /** 设置混合协同模式 */
  setHybridMode(mode: HybridMode): void {
    this.hybridMode = mode;
  }

  /** 获取当前混合协同模式 */
  getHybridMode(): HybridMode {
    return this.hybridMode;
  }

  /** 获取当前调用状态 */
  getCallStatus(): HybridCallStatus {
    return { ...this.callStatus };
  }

  /** 获取本地模型列表 */
  getLocalModels(): ModelInstance[] {
    return Array.from(this.modelRegistry.values())
      .filter(m => m.enabled && m.provider === 'ollama');
  }

  /** 获取云端模型列表 */
  getCloudModels(): ModelInstance[] {
    return Array.from(this.modelRegistry.values())
      .filter(m => m.enabled && m.provider !== 'ollama');
  }

  /** 根据混合模式过滤模型 */
  private filterModelsByHybridMode(models: ModelInstance[]): ModelInstance[] {
    const localModels = models.filter(m => m.provider === 'ollama');
    const cloudModels = models.filter(m => m.provider !== 'ollama');

    switch (this.hybridMode) {
      case 'local-only':
        return localModels;
      case 'cloud-only':
        return cloudModels;
      case 'local-first':
        return [...localModels, ...cloudModels];
      case 'cloud-first':
        return [...cloudModels, ...localModels];
      case 'parallel':
        return models;
      default:
        return models;
    }
  }

  /** 执行任务 - 核心方法 */
  async execute(
    taskType: TaskType,
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AggregatedResult> {
    // 更新调用状态
    this.callStatus = {
      isCalling: true,
      taskType,
      mode: this.hybridMode,
    };

    const rule = this.routingRules.get(taskType);
    if (!rule) {
      this.callStatus.isCalling = false;
      throw new Error(`未找到任务类型 ${taskType} 的路由规则`);
    }

    let models = this.selectModels(rule);
    // 应用混合模式过滤
    models = this.filterModelsByHybridMode(models);

    if (models.length === 0) {
      this.callStatus.isCalling = false;
      throw new Error('没有可用的模型');
    }

    const startTime = Date.now();
    let responses: ModelResponse[];

    try {
      switch (rule.mode) {
        case 'single':
          responses = [await this.callSingleModel(models[0].id, prompt, options)];
          break;
        case 'parallel':
          responses = await this.callParallelModels(models, prompt, options, rule.parallelLimit);
          break;
        case 'cascade':
          responses = await this.callCascadeModels(models, prompt, options, rule.cascadeTimeout);
          break;
        default:
          responses = [await this.callSingleModel(models[0].id, prompt, options)];
      }

      // 过滤失败响应
      responses = responses.filter(r => !r.error);

      if (responses.length === 0) {
        return {
          content: '所有模型调用失败',
          responses,
          strategy: rule.mode === 'single' ? 'best' : 'merge',
          totalLatency: Date.now() - startTime,
        };
      }

      // 聚合结果
      const content = this.aggregateResults(responses, rule.mode);

      // 更新调用状态
      const bestResponse = responses.reduce((a, b) => (a.score ?? 0) > (b.score ?? 0) ? a : b);
      this.callStatus.isCalling = false;
      this.callStatus.selectedModel = bestResponse.modelId;
      this.callStatus.result = content;
      this.callStatus.localStatus = responses
        .filter(r => r.modelId.startsWith('ollama'))
        .map(r => ({
          modelId: r.modelId,
          startedAt: startTime,
          latency: r.latency,
          content: r.content,
          error: r.error,
        }))[0];
      this.callStatus.cloudStatus = responses
        .filter(r => !r.modelId.startsWith('ollama'))
        .map(r => ({
          modelId: r.modelId,
          startedAt: startTime,
          latency: r.latency,
          content: r.content,
          error: r.error,
        }))[0];

      return {
        content,
        responses,
        strategy: this.getAggregationStrategy(rule.mode),
        totalLatency: Date.now() - startTime,
      };
    } catch (err) {
      this.callStatus.isCalling = false;
      throw err;
    }
  }

  /** 选择模型 */
  private selectModels(rule: RoutingRule): ModelInstance[] {
    return rule.modelIds
      .map(id => this.modelRegistry.get(id))
      .filter((m): m is ModelInstance => m !== undefined && m.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /** 调用单个模型 */
  private async callSingleModel(
    modelId: string,
    prompt: string,
    options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
  ): Promise<ModelResponse> {
    const start = Date.now();
    const model = this.modelRegistry.get(modelId);

    if (!model) {
      return { modelId, content: '', latency: 0, error: '模型不存在' };
    }

    try {
      const content = await this.callModel(model, prompt, options);
      return {
        modelId,
        content,
        latency: Date.now() - start,
        score: this.scoreResponse(content, prompt),
      };
    } catch (err) {
      return {
        modelId,
        content: '',
        latency: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** 并行调用多个模型 */
  private async callParallelModels(
    models: ModelInstance[],
    prompt: string,
    options: { systemPrompt?: string; temperature?: number; maxTokens?: number } | undefined,
    limit?: number
  ): Promise<ModelResponse[]> {
    const selected = (limit ? models.slice(0, limit) : models);
    const promises = selected.map(m => this.callSingleModel(m.id, prompt, options));
    return Promise.all(promises);
  }

  /** 级联调用 - 第一个成功就返回 */
  private async callCascadeModels(
    models: ModelInstance[],
    prompt: string,
    options: { systemPrompt?: string; temperature?: number; maxTokens?: number } | undefined,
    timeout?: number
  ): Promise<ModelResponse[]> {
    const results: ModelResponse[] = [];
    const timeoutMs = timeout ?? 10000;

    for (const model of models) {
      try {
        const result = await Promise.race([
          this.callSingleModel(model.id, prompt, options),
          new Promise<ModelResponse>((_, reject) =>
            setTimeout(() => reject(new Error('超时')), timeoutMs)
          ),
        ]);
        results.push(result);
        if (!result.error) {
          // 第一个成功就返回
          return results;
        }
      } catch {
        results.push({
          modelId: model.id,
          content: '',
          latency: timeoutMs,
          error: '超时或失败',
        });
      }
    }

    return results;
  }

  /** 调用模型 */
  private async callModel(
    model: ModelInstance,
    prompt: string,
    options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const baseConfig = this.getConfig();

    const config: any = {
      provider: model.provider,
      model: model.model,
      baseUrl: model.baseUrl ?? this.getProviderBaseUrl(model.provider),
      apiKey: model.apiKey ?? baseConfig.apiKey,
      temperature: options?.temperature ?? baseConfig.temperature,
      maxTokens: options?.maxTokens ?? baseConfig.maxTokens,
    };

    if (this.isOpenAICompatible(model.provider)) {
      return this.callOpenAICompatibleModel(config, prompt, options?.systemPrompt);
    }

    switch (model.provider) {
      case 'ollama':
        return this.callOllamaModel(config, prompt, options?.systemPrompt);
      case 'claude':
        return this.callClaudeModel(config, prompt, options?.systemPrompt);
      case 'gemini':
        return this.callGeminiModel(config, prompt, options?.systemPrompt);
      case 'mock':
        return this.mockResponse(prompt);
      default:
        throw new Error(`不支持的提供商: ${model.provider}`);
    }
  }

  private getProviderBaseUrl(provider: string): string {
    const urls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      claude: 'https://api.anthropic.com',
      ollama: this.defaultOllamaUrl,
      qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      deepseek: 'https://api.deepseek.com',
      doubao: 'https://ark.cn-beijing.volces.com/api/v3',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
      moonshot: 'https://api.moonshot.cn/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta',
    };
    return urls[provider] ?? '';
  }

  private isOpenAICompatible(provider: string): boolean {
    return ['openai', 'qwen', 'deepseek', 'doubao', 'zhipu', 'moonshot'].includes(provider);
  }

  private async callOpenAICompatibleModel(
    config: any,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const url = `${config.baseUrl}/chat/completions`;
    const messages: any[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`${config.provider} ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async callOllamaModel(
    config: any,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const url = `${config.baseUrl}/api/generate`;
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as { response: string };
    return data.response ?? '';
  }

  private async callClaudeModel(
    config: any,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const url = `${config.baseUrl}/v1/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens ?? 1024,
        temperature: config.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as { content: { text: string }[] };
    return data.content?.[0]?.text ?? '';
  }

  private async callGeminiModel(
    config: any,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt ? systemPrompt + '\n\n' + prompt : prompt }],
      },
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  /** 评分响应质量 */
  private scoreResponse(content: string, prompt: string): number {
    if (!content) return 0;

    let score = 0.5;

    // 长度合理性（不能太短也不能太长）
    const expectedLength = Math.min(prompt.length * 2, 1000);
    const actualLength = content.length;
    const lengthRatio = actualLength / expectedLength;
    if (lengthRatio > 0.5 && lengthRatio < 2) score += 0.1;
    else if (lengthRatio > 0.3 && lengthRatio < 3) score += 0.05;

    // 代码块检查
    if (content.includes('```')) score += 0.1;

    // 包含关键词（简单检查）
    const keywords = ['function', 'class', 'const', 'import', 'export', 'return', 'if', 'for'];
    const hasKeywords = keywords.some(k => content.toLowerCase().includes(k));
    if (hasKeywords) score += 0.15;

    // 无明显错误标记
    if (!content.includes('ERROR') && !content.includes('undefined')) score += 0.15;

    return Math.min(score, 1);
  }

  /** 聚合结果 */
  private aggregateResults(responses: ModelResponse[], mode: 'single' | 'parallel' | 'cascade'): string {
    if (responses.length === 0) return '';
    if (responses.length === 1) return responses[0].content;

    switch (mode) {
      case 'parallel':
        // 选择评分最高的
        const best = responses.reduce((a, b) => (a.score ?? 0) > (b.score ?? 0) ? a : b);
        return best.content;

      case 'cascade':
        // 返回第一个成功的结果
        const first = responses.find(r => !r.error);
        return first?.content ?? responses[0].content;

      default:
        return responses[0].content;
    }
  }

  /** 获取聚合策略 */
  private getAggregationStrategy(mode: 'single' | 'parallel' | 'cascade'): 'best' | 'merge' | 'vote' | 'cascade' {
    switch (mode) {
      case 'parallel': return 'best';
      case 'cascade': return 'cascade';
      default: return 'best';
    }
  }

  /** 获取路由配置 */
  getRouterConfig() {
    return {
      models: this.listEnabledModels(),
      rules: Array.from(this.routingRules.entries()).map(([type, rule]) => ({ type, rule })),
    };
  }
}

export const multiModelRouter = new MultiModelRouter();
