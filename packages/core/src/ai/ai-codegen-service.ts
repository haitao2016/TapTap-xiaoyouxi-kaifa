/**
 * AI 代码生成/重构服务
 * - 用自然语言描述生成代码
 * - 重构现有代码
 * - 添加注释
 * - Diff 预览
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';
import { AIProviderBase } from './ai-provider-base';

export type CodeGenAction = 'generate' | 'refactor' | 'comment' | 'test' | 'document';

export interface CodeGenRequest {
  id: string;
  action: CodeGenAction;
  /** 自然语言描述 */
  prompt: string;
  /** 当前文件内容（重构/注释/测试时必填） */
  fileContent?: string;
  /** 当前文件语言 */
  language?: string;
  /** 当前文件路径 */
  filePath?: string;
  /** 选中的代码区域（refactor/test 用） */
  selection?: { start: number; end: number };
  /** 上下文（多文件） */
  context?: { filePath: string; content: string }[];
}

export interface CodeDiff {
  /** 旧内容 */
  oldText: string;
  /** 新内容 */
  newText: string;
  /** 起始行 */
  startLine: number;
  /** 结束行 */
  endLine: number;
}

export interface CodeGenResult {
  id: string;
  action: CodeGenAction;
  /** 生成的代码 */
  code: string;
  /** 修改 diff 列表 */
  diffs: CodeDiff[];
  /** 说明 */
  explanation: string;
  /** 置信度 0-1 */
  confidence: number;
  /** 耗时 ms */
  latency: number;
}

export class AICodeGenService extends AIProviderBase {
  private readonly templates: Record<CodeGenAction, string> = {
    generate: '请根据以下描述生成高质量的 {{language}} 代码:\n{{prompt}}',
    refactor: '请重构以下 {{language}} 代码，使其更清晰、更高效:\n```\n{{selection}}\n```\n要求: {{prompt}}',
    comment: '请为以下 {{language}} 代码添加详细注释:\n```\n{{fileContent}}\n```',
    test: '请为以下 {{language}} 代码生成单元测试:\n```\n{{selection}}\n```',
    document: '请为以下 {{language}} 代码生成 JSDoc 文档:\n```\n{{fileContent}}\n```',
  };

  async generate(req: CodeGenRequest): Promise<CodeGenResult> {
    const start = Date.now();
    const id = req.id ?? randomUUID();
    const code = await this.dispatch(req);
    const diffs = this.buildDiffs(req, code);
    const result: CodeGenResult = {
      id,
      action: req.action,
      code,
      diffs,
      explanation: this.explainResult(req, code),
      confidence: code ? 0.7 : 0,
      latency: Date.now() - start,
    };
    globalEventBus.emit({ type: 'ai:codegen', payload: result });
    return result;
  }

  private async dispatch(req: CodeGenRequest): Promise<string> {
    const config = this.getConfig();
    if (config.provider === 'mock') {
      return this.mockGenerate(req);
    }

    const prompt = this.buildPrompt(req);
    const systemPrompt = this.systemPrompt(req.action);

    try {
      const result = await this.callChat({
        systemPrompt,
        userPrompt: prompt,
      });
      return this.extractCode(result, req.action);
    } catch (err) {
      console.warn('AI 代码生成失败，使用 mock 兜底:', err);
      return this.mockGenerate(req);
    }
  }

  private buildPrompt(req: CodeGenRequest): string {
    let template = this.templates[req.action];
    template = template.replace(/\{\{language\}\}/g, req.language ?? 'javascript');
    template = template.replace(/\{\{prompt\}\}/g, req.prompt);
    template = template.replace(
      /\{\{selection\}\}/g,
      req.selection && req.fileContent
        ? req.fileContent.slice(req.selection.start, req.selection.end)
        : ''
    );
    template = template.replace(/\{\{fileContent\}\}/g, req.fileContent ?? '');
    return template;
  }

  private systemPrompt(action: CodeGenAction): string {
    const base = '你是一个专业的代码助手。';
    switch (action) {
      case 'generate':
        return base + '只返回代码，不要解释，不要用 markdown 代码块包裹。';
      case 'refactor':
        return base + '只返回重构后的完整代码，不要解释，不要用 markdown 代码块包裹。';
      case 'comment':
        return base + '只返回添加注释后的完整代码，不要解释，不要用 markdown 代码块包裹。';
      case 'test':
        return base + '只返回测试代码，不要解释，不要用 markdown 代码块包裹。使用 describe/it 风格。';
      case 'document':
        return base + '只返回添加 JSDoc 后的完整代码，不要解释，不要用 markdown 代码块包裹。';
    }
  }

  private extractCode(response: string, action: CodeGenAction): string {
    let code = response.trim();
    const fenceMatch = code.match(/```[\w]*\n([\s\S]*?)\n```/);
    if (fenceMatch) {
      code = fenceMatch[1];
    }
    return code;
  }

  private mockGenerate(req: CodeGenRequest): string {
    switch (req.action) {
      case 'generate':
        return `// ${req.prompt}\nfunction generated() {\n  // TODO: 实现\n}\n`;
      case 'refactor':
        return req.fileContent ?? '';
      case 'comment':
        return req.fileContent ?? '';
      case 'test':
        return `describe('${req.filePath ?? 'module'}', () => {\n  it('should work', () => {\n    // TODO\n  });\n});\n`;
      case 'document':
        return req.fileContent ?? '';
    }
  }

  private buildDiffs(req: CodeGenRequest, newCode: string): CodeDiff[] {
    if (!req.fileContent) {
      return [
        {
          oldText: '',
          newText: newCode,
          startLine: 0,
          endLine: newCode.split('\n').length,
        },
      ];
    }
    if (req.selection) {
      return [
        {
          oldText: req.fileContent.slice(req.selection.start, req.selection.end),
          newText: newCode,
          startLine: this.lineFromOffset(req.fileContent, req.selection.start),
          endLine: this.lineFromOffset(req.fileContent, req.selection.end),
        },
      ];
    }
    return [
      {
        oldText: '',
        newText: newCode,
        startLine: 0,
        endLine: newCode.split('\n').length,
      },
    ];
  }

  private lineFromOffset(text: string, offset: number): number {
    return text.slice(0, offset).split('\n').length - 1;
  }

  private explainResult(req: CodeGenRequest, code: string): string {
    switch (req.action) {
      case 'generate': return `已根据描述生成代码（共 ${code.split('\n').length} 行）`;
      case 'refactor': return '已重构代码，提高可读性和性能';
      case 'comment': return '已为代码添加详细注释';
      case 'test': return '已生成单元测试';
      case 'document': return '已生成 JSDoc 文档';
    }
  }
}

export const aiCodeGenService = new AICodeGenService();
