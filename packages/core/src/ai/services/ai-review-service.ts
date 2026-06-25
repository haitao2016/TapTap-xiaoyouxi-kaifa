import { multiModelRouter } from '../multi-model-router';

export interface ReviewIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'code-style' | 'best-practice' | 'bug';
  message: string;
  line?: number;
  suggestion: string;
}

export interface ReviewResult {
  score: number;
  issues: ReviewIssue[];
  suggestions: string[];
  summary: string;
  timestamp: number;
}

export interface ReviewRequest {
  code: string;
  language?: string;
  rules?: string[];
  filePath?: string;
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

export class AIReviewService {
  private reviewHistory: Map<string, ReviewResult[]> = new Map();

  async review(request: ReviewRequest): Promise<ReviewResult> {
    const { code, language = 'typescript', rules, filePath } = request;

    const systemPrompt = `你是一名高级代码审查专家。请对以下代码进行全面审查，包括：
1. 代码质量和可读性
2. 安全漏洞检测
3. 性能问题
4. 代码规范
5. 潜在的 bug

请按照 JSON 格式输出审查结果，格式如下：
{
  "score": 0-100,
  "issues": [
    {
      "id": "唯一标识",
      "severity": "critical|high|medium|low",
      "category": "security|performance|code-style|best-practice|bug",
      "message": "问题描述",
      "line": 行号（可选）,
      "suggestion": "修复建议"
    }
  ],
  "suggestions": ["改进建议列表"],
  "summary": "简短总结"
}

代码语言: ${language}
文件路径: ${filePath || 'unknown'}
${rules && rules.length > 0 ? `检查规则: ${rules.join(', ')}` : ''}
`;

    const result = await multiModelRouter.execute('review', code, {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 4096,
    });

    const reviewResult = this.parseReviewResult(result.content);
    reviewResult.timestamp = Date.now();

    if (filePath) {
      const history = this.reviewHistory.get(filePath) || [];
      history.unshift(reviewResult);
      this.reviewHistory.set(filePath, history.slice(0, 10));
    }

    return reviewResult;
  }

  private parseReviewResult(content: string): ReviewResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ReviewResult;
      }
    } catch {
      // JSON 解析失败，返回降级结果
    }

    return {
      score: this.extractScore(content),
      issues: this.extractIssues(content),
      suggestions: this.extractSuggestions(content),
      summary: content.substring(0, 200),
      timestamp: Date.now(),
    };
  }

  private extractScore(content: string): number {
    const match = content.match(/score[^\d]*(\d+)/i);
    return match ? Math.min(100, parseInt(match[1], 10)) : 75;
  }

  private extractIssues(content: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = content.split('\n');
    let currentIssue: Partial<ReviewIssue> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('critical') || line.includes('high') || line.includes('medium') || line.includes('low')) {
        if (currentIssue.message) {
          issues.push(currentIssue as ReviewIssue);
        }
        currentIssue = {
          id: `issue-${Date.now()}-${issues.length}`,
          severity: this.extractSeverity(line),
          category: 'code-style',
          message: '',
          suggestion: '',
        };
      }
      if (currentIssue.message !== undefined) {
        if (line.includes('问题') || line.includes('Issue')) {
          currentIssue.message += line.replace(/^[\d\.\-\*]+\s*/, '') + ' ';
        } else if (line.includes('建议') || line.includes('Suggestion')) {
          currentIssue.suggestion += line.replace(/^[\d\.\-\*]+\s*/, '') + ' ';
        } else {
          currentIssue.message += line + ' ';
        }
      }
    }
    if (currentIssue.message) {
      issues.push(currentIssue as ReviewIssue);
    }
    return issues.slice(0, 20);
  }

  private extractSeverity(line: string): ReviewIssue['severity'] {
    if (line.includes('critical')) return 'critical';
    if (line.includes('high')) return 'high';
    if (line.includes('medium')) return 'medium';
    return 'low';
  }

  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('建议') || line.includes('改进') || line.includes('优化')) {
        suggestions.push(line.replace(/^[\d\.\-\*]+\s*/, '').trim());
      }
    }
    return suggestions.slice(0, 10);
  }

  getReviewHistory(filePath: string): ReviewResult[] {
    return this.reviewHistory.get(filePath) || [];
  }

  clearReviewHistory(filePath?: string): void {
    if (filePath) {
      this.reviewHistory.delete(filePath);
    } else {
      this.reviewHistory.clear();
    }
  }

  calculateOverallScore(issues: ReviewIssue[]): number {
    let score = 100;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical': score -= 15; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    }
    return Math.max(0, score);
  }

  sortIssuesBySeverity(issues: ReviewIssue[]): ReviewIssue[] {
    return [...issues].sort((a, b) => {
      return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    });
  }
}

export const aiReviewService = new AIReviewService();
