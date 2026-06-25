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
  | 'review'            // 代码审查

export interface ModelInstance {
  /** 模型唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 提供商 */
  provider: 'ollama' | 'openai' | 'claude' | 'mock';
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

export class MultiModelRouter extends AIProviderBase {
  /** 模型实例注册表 */
  private modelRegistry = new Map<string, ModelInstance>();
  /** Ollama 实例列表 */
  private ollamaInstances = new Map<string, OllamaInstance>();
  /** 路由规则 */
  private routingRules = new Map<TaskType, RoutingRule>();
  /** 默认 Ollama 地址 */
  private defaultOllamaUrl = 'http://localhost:11434';

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

    // 云端模型作为备选
    this.registerModel({
      id: 'openai-gpt4',
      name: 'GPT-4',
      provider: 'openai',
      model: 'gpt-4',
      capabilities: ['code-generation', 'code-refactor', 'code-test', 'chat', 'review', 'error-diagnosis'],
      priority: 95,
      enabled: false,
      contextWindow: 128000,
      strengths: ['全面能力', '高质量输出'],
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
  }

  /** 初始化默认路由规则 */
  private initDefaultRules(): void {
    // 代码补全 - 使用本地coder模型并行调用
    this.setRoutingRule('code-completion', {
      taskType: 'code-completion',
      modelIds: ['ollama-coder-14b', 'ollama-codellama-13b', 'ollama-coder-7b'],
      mode: 'parallel',
      parallelLimit: 2,
    });

    // 代码生成 - 使用coder模型
    this.setRoutingRule('code-generation', {
      taskType: 'code-generation',
      modelIds: ['ollama-coder-14b', 'ollama-coder-7b'],
      mode: 'single',
    });

    // 代码重构 - 使用coder模型，可能并行
    this.setRoutingRule('code-refactor', {
      taskType: 'code-refactor',
      modelIds: ['ollama-coder-14b', 'ollama-codellama-13b'],
      mode: 'parallel',
      parallelLimit: 2,
    });

    // 代码审查 - 多个模型协同
    this.setRoutingRule('review', {
      taskType: 'review',
      modelIds: ['ollama-codellama-13b', 'ollama-general-7b'],
      mode: 'parallel',
      parallelLimit: 2,
    });

    // 错误诊断 - 通用模型 + coder模型协同
    this.setRoutingRule('error-diagnosis', {
      taskType: 'error-diagnosis',
      modelIds: ['ollama-general-7b', 'ollama-coder-14b', 'ollama-math-7b'],
      mode: 'cascade',
      cascadeTimeout: 5000,
    });

    // 对话问答 - 通用模型
    this.setRoutingRule('chat', {
      taskType: 'chat',
      modelIds: ['ollama-general-7b'],
      mode: 'single',
    });

    // 测试生成 - coder模型
    this.setRoutingRule('code-test', {
      taskType: 'code-test',
      modelIds: ['ollama-coder-14b', 'ollama-codellama-13b'],
      mode: 'parallel',
      parallelLimit: 2,
    });

    // 其他任务默认用通用模型
    this.setRoutingRule('chat', { taskType: 'chat', modelIds: ['ollama-general-7b'], mode: 'single' });
    this.setRoutingRule('translation', { taskType: 'translation', modelIds: ['ollama-general-7b'], mode: 'single' });
    this.setRoutingRule('summary', { taskType: 'summary', modelIds: ['ollama-general-7b'], mode: 'single' });
    this.setRoutingRule('code-comment', { taskType: 'code-comment', modelIds: ['ollama-coder-7b'], mode: 'single' });
    this.setRoutingRule('code-document', { taskType: 'code-document', modelIds: ['ollama-coder-7b'], mode: 'single' });
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
    const rule = this.routingRules.get(taskType);
    if (!rule) {
      throw new Error(`未找到任务类型 ${taskType} 的路由规则`);
    }

    const models = this.selectModels(rule);
    if (models.length === 0) {
      throw new Error('没有可用的模型');
    }

    const startTime = Date.now();
    let responses: ModelResponse[];

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

    return {
      content,
      responses,
      strategy: this.getAggregationStrategy(rule.mode),
      totalLatency: Date.now() - startTime,
    };
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

    // 构建调用配置
    const config: any = {
      provider: model.provider,
      model: model.model,
      baseUrl: model.baseUrl ?? (model.provider === 'ollama' ? this.defaultOllamaUrl : baseConfig.baseUrl),
      apiKey: model.apiKey ?? baseConfig.apiKey,
      temperature: options?.temperature ?? baseConfig.temperature,
      maxTokens: options?.maxTokens ?? baseConfig.maxTokens,
    };

    switch (model.provider) {
      case 'ollama':
        return this.callOllamaModel(config, prompt, options?.systemPrompt);
      case 'openai':
        return this.callOpenAIModel(config, prompt, options?.systemPrompt);
      case 'claude':
        return this.callClaudeModel(config, prompt, options?.systemPrompt);
      case 'mock':
        return this.mockResponse(prompt);
      default:
        throw new Error(`不支持的提供商: ${model.provider}`);
    }
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

  private async callOpenAIModel(
    config: any,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const url = `${config.baseUrl}/v1/chat/completions`;
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
      throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
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
