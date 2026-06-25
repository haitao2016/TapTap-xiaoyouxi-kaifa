import type { PluginContext, PluginMeta, PluginHook } from '@tapdev/types';

export const meta: PluginMeta = {
  id: 'tapdev.ai-assistant',
  name: 'AI 编程助手',
  version: '1.0.0',
  description: '智能 AI 编程助手，提供代码补全、生成、重构和错误诊断',
  author: 'TapDev Studio',
  enabled: false,
  entry: 'ai-assistant-plugin',
  hooks: ['onProjectOpen'] as PluginHook[],
  icon: 'sparkles',
  category: 'AI',
  homepage: 'https://tapdev.io/plugins/ai-assistant',
};

export type AIModel = 'tapdev-default' | 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'deepseek';

export interface AIPluginConfig {
  enabled: boolean;
  model: AIModel;
  apiKey?: string;
  apiEndpoint?: string;
  autoComplete: boolean;
  autoCompleteDelay: number;
  maxTokens: number;
  temperature: number;
  codeReview: boolean;
  errorDiagnosis: boolean;
  codeGeneration: boolean;
  codeRefactoring: boolean;
  testGeneration: boolean;
  docGeneration: boolean;
  chatHistorySize: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  codeSnippets?: CodeSnippet[];
}

export interface CodeSnippet {
  id: string;
  language: string;
  code: string;
  description?: string;
}

export class AIAssistantPlugin {
  private config: AIPluginConfig = {
    enabled: true,
    model: 'tapdev-default',
    autoComplete: true,
    autoCompleteDelay: 300,
    maxTokens: 2048,
    temperature: 0.7,
    codeReview: true,
    errorDiagnosis: true,
    codeGeneration: true,
    codeRefactoring: true,
    testGeneration: true,
    docGeneration: true,
    chatHistorySize: 50,
  };

  private chatHistory: AIMessage[] = [];
  private conversationId = '';

  getConfig(): AIPluginConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AIPluginConfig>): void {
    Object.assign(this.config, config);
  }

  async chat(message: string, context?: string): Promise<AIMessage> {
    const userMessage: AIMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    this.addToHistory(userMessage);

    const response = await this.generateResponse(message, context);
    this.addToHistory(response);

    return response;
  }

  async generateCode(prompt: string, language = 'typescript'): Promise<CodeSnippet> {
    const code = this.generateMockCode(prompt, language);
    return {
      id: `snippet_${Date.now()}`,
      language,
      code,
      description: `根据提示生成的 ${language} 代码`,
    };
  }

  async completeCode(prefix: string, suffix?: string, language = 'typescript'): Promise<string> {
    return this.generateMockCompletion(prefix, suffix, language);
  }

  async reviewCode(code: string, language = 'typescript'): Promise<{ issues: CodeIssue[]; suggestions: string[] }> {
    return this.analyzeCode(code, language);
  }

  async refactorCode(code: string, target: string, language = 'typescript'): Promise<CodeSnippet> {
    return {
      id: `refactor_${Date.now()}`,
      language,
      code: this.mockRefactor(code, target),
      description: `重构为 ${target}`,
    };
  }

  async diagnoseError(errorMessage: string, code?: string): Promise<{ diagnosis: string; solution: string }> {
    return {
      diagnosis: `分析错误: ${errorMessage}`,
      solution: '建议检查相关代码，确保语法正确且逻辑无误。',
    };
  }

  async generateTests(code: string, language = 'typescript'): Promise<CodeSnippet> {
    return {
      id: `test_${Date.now()}`,
      language,
      code: this.generateMockTests(code, language),
      description: '生成的单元测试代码',
    };
  }

  async generateDocs(code: string, language = 'typescript'): Promise<string> {
    return this.generateMockDocs(code, language);
  }

  async explainCode(code: string, language = 'typescript'): Promise<string> {
    return `这段 ${language} 代码的功能说明：\n\n代码实现了核心业务逻辑，包括数据处理和状态管理。建议阅读时重点关注主要函数的输入输出。`;
  }

  async translateCode(code: string, fromLang: string, toLang: string): Promise<CodeSnippet> {
    return {
      id: `translate_${Date.now()}`,
      language: toLang,
      code: code,
      description: `从 ${fromLang} 翻译到 ${toLang}`,
    };
  }

  getChatHistory(): AIMessage[] {
    return [...this.chatHistory];
  }

  clearChatHistory(): void {
    this.chatHistory = [];
    this.conversationId = '';
  }

  getConversationId(): string {
    if (!this.conversationId) {
      this.conversationId = `conv_${Date.now()}`;
    }
    return this.conversationId;
  }

  getAvailableModels(): AIModel[] {
    return ['tapdev-default', 'gpt-4', 'gpt-3.5-turbo', 'claude-3', 'deepseek'];
  }

  private addToHistory(message: AIMessage): void {
    this.chatHistory.push(message);
    if (this.chatHistory.length > this.config.chatHistorySize) {
      this.chatHistory.shift();
    }
  }

  private async generateResponse(message: string, _context?: string): Promise<AIMessage> {
    await this.delay(500);

    return {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: `你好！我是 AI 编程助手。关于"${message.substring(0, 50)}"的问题，我来帮你分析一下...\n\n这是一个示例回复，实际使用时会连接真实的 AI 服务。`,
      timestamp: Date.now(),
    };
  }

  private generateMockCode(prompt: string, language: string): string {
    const templates: Record<string, string> = {
      typescript: `// 根据 "${prompt}" 生成的代码
export function generatedFunction() {
  // TODO: 实现功能
  console.log('Hello from AI generated code');
  return true;
}
`,
      javascript: `// 根据 "${prompt}" 生成的代码
function generatedFunction() {
  console.log('Hello from AI generated code');
  return true;
}
`,
      python: `# 根据 "${prompt}" 生成的代码
def generated_function():
    print('Hello from AI generated code')
    return True
`,
    };
    return templates[language] || templates.typescript;
  }

  private generateMockCompletion(prefix: string, _suffix?: string, _language?: string): string {
    return `${prefix}\n  // AI 补全的代码\n  return result;\n}`;
  }

  private analyzeCode(code: string, _language: string): { issues: CodeIssue[]; suggestions: string[] } {
    const issues: CodeIssue[] = [];
    const suggestions: string[] = [];

    if (code.length > 100) {
      suggestions.push('考虑将代码拆分为更小的函数以提高可读性');
    }

    if (code.includes('console.log')) {
      issues.push({
        severity: 'warning',
        message: '生产代码中应避免使用 console.log',
        line: 0,
      });
    }

    suggestions.push('建议添加更完善的错误处理');
    suggestions.push('考虑添加单元测试以提高代码质量');

    return { issues, suggestions };
  }

  private mockRefactor(code: string, _target: string): string {
    return `// 重构后的代码\n${code}`;
  }

  private generateMockTests(_code: string, language: string): string {
    const templates: Record<string, string> = {
      typescript: `import { describe, it, expect } from 'vitest';

describe('Test Suite', () => {
  it('should work correctly', () => {
    // TODO: 添加测试用例
    expect(true).toBe(true);
  });
});
`,
      javascript: `describe('Test Suite', () => {
  it('should work correctly', () => {
    // TODO: 添加测试用例
    expect(true).toBe(true);
  });
});
`,
    };
    return templates[language] || templates.typescript;
  }

  private generateMockDocs(_code: string, _language: string): string {
    return `## 函数说明

\`\`\`typescript
function example(): void
\`\`\`

### 描述

这是一个示例函数的文档说明。

### 参数

无参数。

### 返回值

无返回值。

### 示例

\`\`\`typescript
example();
\`\`\`
`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export interface CodeIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column?: number;
  ruleId?: string;
}

export const aiAssistantPlugin = new AIAssistantPlugin();

export function activate(ctx: PluginContext): void {
  const plugin = aiAssistantPlugin;

  ctx.registerCommand('ai-chat', async () => {
    ctx.showNotification('AI 助手已打开', 'info');
  }, {
    id: 'ai-chat',
    title: 'AI 助手',
    description: '打开 AI 编程助手对话面板',
    icon: 'sparkles',
    shortcut: 'Ctrl+Shift+A',
    category: 'AI',
  });

  ctx.registerCommand('ai-generate-code', async () => {
    ctx.showNotification('AI 代码生成已启动', 'info');
  }, {
    id: 'ai-generate-code',
    title: '生成代码',
    description: '使用 AI 生成代码',
    icon: 'code',
    category: 'AI',
  });

  ctx.registerCommand('ai-explain-code', async () => {
    ctx.showNotification('正在分析代码...', 'info');
  }, {
    id: 'ai-explain-code',
    title: '解释代码',
    description: '让 AI 解释当前选中的代码',
    icon: 'message-circle',
    category: 'AI',
  });

  ctx.registerCommand('ai-refactor-code', async () => {
    ctx.showNotification('正在重构代码...', 'info');
  }, {
    id: 'ai-refactor-code',
    title: '重构代码',
    description: '使用 AI 重构代码',
    icon: 'refresh-cw',
    category: 'AI',
  });

  ctx.registerCommand('ai-generate-tests', async () => {
    ctx.showNotification('正在生成测试...', 'info');
  }, {
    id: 'ai-generate-tests',
    title: '生成测试',
    description: '为当前代码生成单元测试',
    icon: 'check-circle',
    category: 'AI',
  });

  ctx.registerCommand('ai-review-code', async () => {
    ctx.showNotification('正在审查代码...', 'info');
  }, {
    id: 'ai-review-code',
    title: '代码审查',
    description: '使用 AI 进行代码审查',
    icon: 'eye',
    category: 'AI',
  });

  ctx.registerPanel('ai-assistant', {
    id: 'ai-assistant',
    title: 'AI 助手',
    icon: 'sparkles',
    component: 'AIAssistantPanel',
    defaultPosition: 'right',
    defaultSize: 420,
  });

  ctx.showNotification('AI 编程助手已激活', 'success');
}

export function deactivate(): void {
  console.log('[AI Assistant Plugin] 已停用');
}
