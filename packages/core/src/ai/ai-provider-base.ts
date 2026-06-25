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
        return this.callOpenAI(config, options, temperature, maxTokens);
      case 'claude':
        return this.callClaude(config, options, temperature, maxTokens);
      case 'ollama':
        return this.callOllama(config, options, temperature, maxTokens);
      default:
        throw new Error(`未知的 AI 提供商: ${config.provider}`);
    }
  }

  private async callOpenAI(
    config: AIConfig,
    options: AICallOptions,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const url = (config.baseUrl ?? 'https://api.openai.com') + '/v1/chat/completions';
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
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
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

  protected mockResponse(prompt: string): string {
    return `[Mock 响应] 收到请求: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`;
  }
}
