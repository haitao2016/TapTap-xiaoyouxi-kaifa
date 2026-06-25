import { aiCompletionService } from './ai-completion-service';
import type { AIConfig, AIProvider } from './ai-completion-service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICallOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIProviderBase {
  protected getConfig(): AIConfig {
    return aiCompletionService.getConfig();
  }

  protected configure(partial: Partial<AIConfig>): void {
    aiCompletionService.configure(partial);
  }

  protected listModels(provider: AIProvider): string[] {
    return aiCompletionService.listModels(provider);
  }

  protected async callChat(options: AICallOptions): Promise<string> {
    const config = this.getConfig();
    const temperature = options.temperature ?? config.temperature;
    const maxTokens = options.maxTokens ?? config.maxTokens;

    switch (config.provider) {
      case 'mock':
        return this.mockResponse(options.userPrompt);
      case 'openai':
      case 'deepseek':
      case 'moonshot':
      case 'qwen':
      case 'doubao':
      case 'zhipu':
        return this.callOpenAICompatible(config, options, temperature, maxTokens);
      case 'claude':
        return this.callClaude(config, options, temperature, maxTokens);
      case 'ollama':
        return this.callOllama(config, options, temperature, maxTokens);
      case 'gemini':
        return this.callGemini(config, options, temperature, maxTokens);
      default:
        throw new Error(`未知的 AI 提供商: ${config.provider}`);
    }
  }

  private getBaseUrl(provider: AIProvider): string {
    const urls: Record<AIProvider, string> = {
      openai: 'https://api.openai.com',
      claude: 'https://api.anthropic.com',
      ollama: 'http://localhost:11434',
      mock: '',
      qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      deepseek: 'https://api.deepseek.com',
      doubao: 'https://ark.cn-beijing.volces.com/api/v3',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
      moonshot: 'https://api.moonshot.cn/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta',
    };
    return urls[provider] ?? '';
  }

  private async callOpenAICompatible(
    config: AIConfig,
    options: AICallOptions,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const baseUrl = config.baseUrl ?? this.getBaseUrl(config.provider);
    const url = baseUrl + '/chat/completions';
    const messages: ChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.userPrompt });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature,
        max_tokens: maxTokens,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`${config.provider} ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async callClaude(
    config: AIConfig,
    options: AICallOptions,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const url = (config.baseUrl ?? 'https://api.anthropic.com') + '/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        temperature,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: options.userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: { text: string }[] };
    return data.content?.[0]?.text ?? '';
  }

  private async callOllama(
    config: AIConfig,
    options: AICallOptions,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const url = (config.baseUrl ?? 'http://localhost:11434') + '/api/generate';
    const prompt = options.systemPrompt
      ? options.systemPrompt + '\n\n' + options.userPrompt
      : options.userPrompt;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
        options: { temperature, num_predict: maxTokens },
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { response: string };
    return data.response ?? '';
  }

  private async callGemini(
    config: AIConfig,
    options: AICallOptions,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const baseUrl = config.baseUrl ?? this.getBaseUrl(config.provider);
    const url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
    const contents = [
      {
        role: 'user',
        parts: [{ text: options.systemPrompt ? options.systemPrompt + '\n\n' + options.userPrompt : options.userPrompt }],
      },
    ];

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  protected mockResponse(prompt: string): string {
    return `[Mock 响应] 收到请求: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`;
  }
}
