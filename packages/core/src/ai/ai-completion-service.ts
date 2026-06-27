/**
 * AI 代码补全服务
 * - 多后端支持（OpenAI / Claude / 本地 Ollama / Mock）
 * - 上下文感知（当前文件 + 项目 SDK 类型）
 * - 多行补全、注释生成代码
 * - API Key 配置管理
 */
import { globalEventBus } from '../event-bus';
import { generateId as randomUUID } from '../utils/uuid';

export type AIProvider = 'openai' | 'claude' | 'ollama' | 'mock';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  /** 温度 0-2，越高越有创造性 */
  temperature: number;
  /** 最大 token */
  maxTokens: number;
}

export interface CompletionContext {
  /** 当前文件路径 */
  filePath: string;
  /** 当前文件语言 */
  language: string;
  /** 光标前的内容 */
  prefix: string;
  /** 光标后的内容 */
  suffix: string;
  /** 光标位置 */
  cursor: { line: number; column: number };
  /** 项目 SDK 类型信息 */
  projectTypes?: string[];
}

export interface CompletionRequest {
  id: string;
  context: CompletionContext;
  /** 多行模式 */
  multiline: boolean;
}

export interface CompletionResult {
  id: string;
  /** 补全文本 */
  text: string;
  /** 完成度 0-1 */
  confidence: number;
  /** 模型名称 */
  model: string;
  /** 耗时 ms */
  latency: number;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'mock',
  model: 'gpt-3.5-turbo',
  temperature: 0.2,
  maxTokens: 256,
};

const OPENAI_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4-turbo'];
const CLAUDE_MODELS = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
const OLLAMA_MODELS = ['qwen2.5-coder:7b', 'deepseek-coder:6.7b', 'codellama:13b'];

export class AICompletionService {
  private config: AIConfig = { ...DEFAULT_CONFIG };
  private cache = new Map<string, CompletionResult>();
  private inflight = new Map<string, Promise<CompletionResult>>();

  configure(partial: Partial<AIConfig>): void {
    this.config = { ...this.config, ...partial };
    globalEventBus.emit({ type: 'ai:config-change', payload: this.config });
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  listModels(provider: AIProvider): string[] {
    switch (provider) {
      case 'openai': return [...OPENAI_MODELS];
      case 'claude': return [...CLAUDE_MODELS];
      case 'ollama': return [...OLLAMA_MODELS];
      case 'mock': return ['mock-fast', 'mock-quality'];
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const cacheKey = this.cacheKey(req);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    if (this.inflight.has(cacheKey)) {
      return this.inflight.get(cacheKey)!;
    }

    const promise = this.dispatch(req);
    this.inflight.set(cacheKey, promise);
    try {
      const result = await promise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.inflight.delete(cacheKey);
    }
  }

  cancel(requestId: string): void {
    this.inflight.delete(requestId);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private cacheKey(req: CompletionRequest): string {
    return `${req.context.filePath}:${req.context.cursor.line}:${req.context.cursor.column}:${req.context.prefix.slice(-200)}`;
  }

  private async dispatch(req: CompletionRequest): Promise<CompletionResult> {
    const start = Date.now();
    let text = '';
    let model = this.config.model;

    try {
      if (this.config.provider === 'mock') {
        text = this.mockComplete(req);
      } else if (this.config.provider === 'ollama') {
        text = await this.callOllama(req);
      } else if (this.config.provider === 'openai') {
        text = await this.callOpenAI(req);
      } else if (this.config.provider === 'claude') {
        text = await this.callClaude(req);
      }
    } catch (err) {
      text = '';
      globalEventBus.emit({
        type: 'ai:error',
        payload: { provider: this.config.provider, error: err instanceof Error ? err.message : String(err) },
      });
    }

    return {
      id: req.id,
      text,
      confidence: text ? 0.7 : 0,
      model,
      latency: Date.now() - start,
    };
  }

  private async callOpenAI(req: CompletionRequest): Promise<string> {
    const url = (this.config.baseUrl ?? 'https://api.openai.com') + '/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        messages: [
          { role: 'system', content: this.systemPrompt() },
          { role: 'user', content: this.userPrompt(req) },
        ],
        stop: ['\n\n'],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async callClaude(req: CompletionRequest): Promise<string> {
    const url = (this.config.baseUrl ?? 'https://api.anthropic.com') + '/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: this.systemPrompt(),
        messages: [{ role: 'user', content: this.userPrompt(req) }],
      }),
    });
    if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: { text: string }[] };
    return data.content?.[0]?.text ?? '';
  }

  private async callOllama(req: CompletionRequest): Promise<string> {
    const url = (this.config.baseUrl ?? 'http://localhost:11434') + '/api/generate';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: this.systemPrompt() + '\n\n' + this.userPrompt(req),
        stream: false,
        options: { temperature: this.config.temperature, num_predict: this.config.maxTokens },
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { response: string };
    return data.response ?? '';
  }

  private systemPrompt(): string {
    return `你是 TapTap 小游戏开发助手。根据上下文补全代码。只返回补全内容，不要解释。保持代码风格一致，使用现代 ES2020+ 语法。`;
  }

  private userPrompt(req: CompletionRequest): string {
    const { prefix, suffix, language } = req.context;
    return `Language: ${language}\n\n<prefix>\n${prefix}\n</prefix>\n\n<suffix>\n${suffix.slice(0, 200)}\n</suffix>\n\n请补全光标处代码:`;
  }

  private mockComplete(req: CompletionRequest): string {
    const { language, prefix } = req.context;
    const trimmed = prefix.trimEnd();
    if (language === 'typescript' || language === 'javascript') {
      if (trimmed.endsWith('console.')) return 'log("");';
      if (trimmed.endsWith('function ')) return 'name() {\n  \n}';
      if (trimmed.endsWith('=> ')) return '{\n  \n};';
      if (trimmed.endsWith('import ')) return "{ } from '';";
      if (trimmed.endsWith('const ')) return 'value = ;';
    }
    if (language === 'json') {
      if (trimmed.endsWith(':')) return ' ""';
    }
    return '';
  }
}

export const aiCompletionService = new AICompletionService();
