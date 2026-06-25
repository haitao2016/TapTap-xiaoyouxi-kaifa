/**
 * AI 错误诊断服务
 * - 监听调试器异常事件
 * - 收集错误上下文（堆栈 + 相关代码）
 * - 调用 AI 生成修复建议
 * - 一键应用补丁
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';
import { AIProviderBase } from './ai-provider-base';

export interface ErrorContext {
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 出错的文件路径 */
  filePath?: string;
  /** 出错的行号 */
  line?: number;
  /** 出错的列号 */
  column?: number;
  /** 相关代码片段 */
  codeSnippet?: string;
  /** 触发错误的用户操作 */
  userAction?: string;
  /** 项目 SDK 类型 */
  projectTypes?: string[];
  /** 错误分类 */
  category?: DiagnosisSuggestion['category'];
}

export interface DiagnosisSuggestion {
  id: string;
  /** 错误类型分类 */
  category: 'syntax' | 'runtime' | 'network' | 'permission' | 'performance' | 'sdk' | 'unknown';
  /** 根本原因 */
  rootCause: string;
  /** 修复建议（多步） */
  fixes: FixStep[];
  /** 置信度 0-1 */
  confidence: number;
  /** 相关文档链接 */
  references: string[];
  /** 耗时 ms */
  latency: number;
}

export interface FixStep {
  title: string;
  description: string;
  /** 可应用的代码补丁（如果有） */
  patch?: {
    filePath: string;
    searchText: string;
    replaceText: string;
  };
  /** 相关文档链接 */
  references?: string[];
}

export class AIErrorDiagnosis extends AIProviderBase {
  private history: DiagnosisSuggestion[] = [];
  private readonly maxHistory = 50;

  /**
   * 诊断错误
   */
  async diagnose(ctx: ErrorContext): Promise<DiagnosisSuggestion> {
    const start = Date.now();
    const id = randomUUID();
    const category = this.classify(ctx);
    const suggestion: DiagnosisSuggestion = {
      id,
      category,
      rootCause: '',
      fixes: [],
      confidence: 0,
      references: [],
      latency: 0,
    };

    try {
      const config = this.getConfig();
      if (config.provider === 'mock') {
        const analysis = this.mockAnalyze(ctx, category);
        suggestion.rootCause = analysis.rootCause;
        suggestion.fixes = analysis.fixes;
        suggestion.confidence = analysis.confidence;
        suggestion.references = analysis.references;
      } else {
        const analysis = await this.aiAnalyze(ctx, category);
        suggestion.rootCause = analysis.rootCause;
        suggestion.fixes = analysis.fixes;
        suggestion.confidence = analysis.confidence;
        suggestion.references = analysis.references;
      }
    } catch (err) {
      suggestion.rootCause = '诊断失败：' + (err instanceof Error ? err.message : String(err));
      const fallback = this.mockAnalyze(ctx, category);
      suggestion.fixes = fallback.fixes;
    } finally {
      suggestion.latency = Date.now() - start;
    }

    this.history.unshift(suggestion);
    if (this.history.length > this.maxHistory) this.history.pop();
    globalEventBus.emit({ type: 'ai:diagnosis', payload: suggestion });
    return suggestion;
  }

  /**
   * 获取历史诊断
   */
  getHistory(): DiagnosisSuggestion[] {
    return [...this.history];
  }

  /**
   * 应用补丁
   */
  applyPatch(patch: NonNullable<FixStep['patch']>, fileContent: string): string | null {
    const idx = fileContent.indexOf(patch.searchText);
    if (idx === -1) return null;
    return (
      fileContent.slice(0, idx) +
      patch.replaceText +
      fileContent.slice(idx + patch.searchText.length)
    );
  }

  private classify(ctx: ErrorContext): DiagnosisSuggestion['category'] {
    const m = ctx.message.toLowerCase();
    if (/syntax|unexpected|expected/i.test(m)) return 'syntax';
    if (/network|fetch|request|cors|timeout/i.test(m)) return 'network';
    if (/permission|denied|forbidden|unauthorized/i.test(m)) return 'permission';
    if (/memory|performance|slow|lag/i.test(m)) return 'performance';
    if (/taptap|sdk|api/i.test(m)) return 'sdk';
    if (/cannot|undefined|null|nan/i.test(m)) return 'runtime';
    return 'unknown';
  }

  private async aiAnalyze(
    ctx: ErrorContext,
    category: DiagnosisSuggestion['category']
  ): Promise<Omit<DiagnosisSuggestion, 'id' | 'category' | 'latency'>> {
    const systemPrompt = `你是一个专业的代码调试助手。请分析以下错误并提供修复建议。
请严格以 JSON 格式返回，包含以下字段：
- rootCause: 根本原因（字符串）
- fixes: 修复步骤数组，每项包含 title, description, references（可选，字符串数组）
- confidence: 置信度 0-1（数字）
- references: 相关文档链接数组`;

    const userPrompt = `错误类型: ${category}
错误消息: ${ctx.message}
${ctx.stack ? `堆栈: ${ctx.stack}` : ''}
${ctx.filePath ? `文件: ${ctx.filePath}` : ''}
${ctx.line ? `行号: ${ctx.line}` : ''}
${ctx.codeSnippet ? `代码片段:\n\`\`\`\n${ctx.codeSnippet}\n\`\`\`` : ''}
${ctx.projectTypes?.length ? `项目类型: ${ctx.projectTypes.join(', ')}` : ''}

请提供详细的诊断和修复建议。`;

    try {
      const response = await this.callChat({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
      });
      return this.parseDiagnosisResponse(response, category);
    } catch (err) {
      console.warn('AI 诊断失败，使用 mock 兜底:', err);
      return this.mockAnalyze(ctx, category);
    }
  }

  private parseDiagnosisResponse(
    response: string,
    category: DiagnosisSuggestion['category']
  ): Omit<DiagnosisSuggestion, 'id' | 'category' | 'latency'> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rootCause: parsed.rootCause || '未知原因',
          fixes: Array.isArray(parsed.fixes)
            ? parsed.fixes.map((f: any) => ({
                title: f.title || '修复步骤',
                description: f.description || '',
                references: f.references || [],
              }))
            : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
          references: Array.isArray(parsed.references) ? parsed.references : [],
        };
      }
    } catch {
      // 解析失败，使用 mock 结果
    }

    return {
      rootCause: response.slice(0, 200),
      fixes: [{ title: '查看详细分析', description: response }],
      confidence: 0.5,
      references: [],
    };
  }

  private mockAnalyze(
    ctx: ErrorContext,
    category: DiagnosisSuggestion['category']
  ): Omit<DiagnosisSuggestion, 'id' | 'category' | 'latency'> {
    const fixes: FixStep[] = [];
    if (category === 'syntax') {
      fixes.push({
        title: '检查语法',
        description: `错误 "${ctx.message}" 通常是语法问题。检查 ${ctx.filePath ?? '文件'} 第 ${ctx.line ?? '?'} 行附近。`,
      });
    } else if (category === 'network') {
      fixes.push({
        title: '检查网络',
        description: '网络请求失败，请检查：1) URL 是否正确 2) 是否需要 HTTPS 3) CORS 配置 4) 真机调试的代理设置',
        references: ['https://developer.taptap.cn/minigameapidoc/'],
      });
    } else if (category === 'sdk') {
      fixes.push({
        title: '检查 SDK 调用',
        description: '请确认已正确初始化 TapTap SDK 并在用户登录后调用相关 API。',
        references: ['https://developer.taptap.cn/minigameapidoc/api/'],
      });
    } else if (category === 'runtime') {
      fixes.push({
        title: '检查空值',
        description: '运行时错误通常是访问未定义属性或空对象。检查变量初始化时机。',
      });
    } else {
      fixes.push({
        title: '查看堆栈',
        description: `错误信息: ${ctx.message}`,
      });
    }

    return {
      rootCause: `${ctx.message}（${ctx.filePath ?? '未知文件'}:${ctx.line ?? '?'}）`,
      fixes,
      confidence: 0.6,
      references: [],
    };
  }
}

export const aiErrorDiagnosis = new AIErrorDiagnosis();
