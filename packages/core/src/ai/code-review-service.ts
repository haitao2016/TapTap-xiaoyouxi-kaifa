// AI 代码审查与重构建议
// 自动检测代码异味、性能问题、安全漏洞、最佳实践违规

import { globalEventBus } from '../core/event-bus';
import { codeIndexService, CodeSymbol } from './code-index-service';

// 审查问题严重程度
export type IssueSeverity = 'error' | 'warning' | 'info' | 'hint';

// 审查问题
export interface ReviewIssue {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: IssueSeverity;
  category: 'style' | 'bug' | 'performance' | 'security' | 'maintainability' | 'best-practice';
  message: string;
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  codeSnippet: string;
  suggestion?: string;
  fixCode?: string;
  documentation?: string;
}

// 审查报告
export interface ReviewReport {
  id: string;
  filePath?: string;
  timestamp: number;
  issues: ReviewIssue[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    hints: number;
    score: number; // 0-100
  };
  metrics: {
    linesOfCode: number;
    cyclomaticComplexity: number;
    maintainabilityIndex: number;
    duplicateLines: number;
  };
}

// 重构建议
export interface RefactorSuggestion {
  id: string;
  type: 'extract-function' | 'extract-class' | 'rename' | 'inline' | 'move' | 'simplify' | 'modernize';
  title: string;
  description: string;
  filePath: string;
  startLine: number;
  endLine: number;
  before: string;
  after: string;
  benefits: string[];
  riskLevel: 'low' | 'medium' | 'high';
  automated: boolean;
}

// 审查规则
interface ReviewRule {
  id: string;
  name: string;
  severity: IssueSeverity;
  category: ReviewIssue['category'];
  description: string;
  check: (content: string, lines: string[], filePath: string) => Omit<ReviewIssue, 'id' | 'ruleId' | 'ruleName'>[];
  fixSuggestion?: (issue: ReviewIssue) => string;
}

class CodeReviewService {
  private rules: ReviewRule[] = [];
  private reviewHistory: ReviewReport[] = [];
  private maxHistory = 50;

  constructor() {
    this.registerDefaultRules();
  }

  // 注册默认规则
  private registerDefaultRules(): void {
    this.rules.push(
      {
        id: 'no-console-log',
        name: '禁止使用 console.log',
        severity: 'warning',
        category: 'best-practice',
        description: '生产代码中不应使用 console.log，应使用日志系统',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('console.log') && !filePath.includes('debug') && !filePath.includes('test')) {
              issues.push({
                severity: 'warning',
                category: 'best-practice',
                message: '检测到 console.log，应使用 logger',
                filePath,
                startLine: i + 1,
                endLine: i + 1,
                codeSnippet: lines[i].trim(),
                suggestion: '使用项目统一的 logger 替代',
                fixCode: lines[i].replace(/console\.log/g, 'logger.info')
              });
            }
          }
          return issues;
        }
      },
      {
        id: 'no-any-type',
        name: '避免使用 any 类型',
        severity: 'warning',
        category: 'best-practice',
        description: '使用 any 会失去类型安全',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 排除注释行
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
            if (line.includes(': any') || line.includes('<any>') || line.includes('as any')) {
              issues.push({
                severity: 'warning',
                category: 'best-practice',
                message: '使用了 any 类型，建议使用具体类型',
                filePath,
                startLine: i + 1,
                endLine: i + 1,
                codeSnippet: line.trim(),
                suggestion: '使用具体类型或 unknown'
              });
            }
          }
          return issues;
        }
      },
      {
        id: 'function-length',
        name: '函数过长',
        severity: 'warning',
        category: 'maintainability',
        description: '函数超过 50 行可能难以维护',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          let inFunction = false;
          let functionStart = 0;
          let functionName = '';
          let braceCount = 0;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const funcMatch = line.match(/(?:function|method)\s+(\w+)\s*\(/);
            if (funcMatch && !inFunction) {
              inFunction = true;
              functionStart = i;
              functionName = funcMatch[1];
              braceCount = 0;
            }
            if (inFunction) {
              for (const ch of line) {
                if (ch === '{') braceCount++;
                else if (ch === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    const length = i - functionStart;
                    if (length > 50) {
                      issues.push({
                        severity: 'warning',
                        category: 'maintainability',
                        message: `函数 "${functionName}" 有 ${length} 行，建议拆分`,
                        filePath,
                        startLine: functionStart + 1,
                        endLine: i + 1,
                        codeSnippet: `function ${functionName}() { ... ${length} lines ... }`,
                        suggestion: '将函数拆分为多个职责单一的小函数'
                      });
                    }
                    inFunction = false;
                    break;
                  }
                }
              }
            }
          }
          return issues;
        }
      },
      {
        id: 'naming-convention',
        name: '命名规范',
        severity: 'info',
        category: 'style',
        description: '检查命名是否符合 TypeScript 规范',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 检查常量命名（应为 UPPER_CASE）
            const constMatch = line.match(/^const\s+([a-z][a-zA-Z0-9]*)\s*=/);
            // 检查类名（应为 PascalCase）
            const classMatch = line.match(/^class\s+([a-z][a-zA-Z0-9]*)/);
            if (constMatch && /^[A-Z_]+$/.test(constMatch[1]) === false &&
                /^[a-z][a-zA-Z0-9]*$/.test(constMatch[1]) === false) {
              // OK - camelCase
            }
            if (classMatch) {
              issues.push({
                severity: 'info',
                category: 'style',
                message: `类名 "${classMatch[1]}" 应使用 PascalCase`,
                filePath,
                startLine: i + 1,
                endLine: i + 1,
                codeSnippet: line.trim(),
                suggestion: `重命名为 ${classMatch[1].charAt(0).toUpperCase() + classMatch[1].slice(1)}`
              });
            }
          }
          return issues;
        }
      },
      {
        id: 'missing-return-type',
        name: '缺少返回类型注解',
        severity: 'info',
        category: 'best-practice',
        description: '公共函数应有明确的返回类型',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const funcMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?!\s*:\s*\w)/);
            if (funcMatch && !line.includes('=>')) {
              issues.push({
                severity: 'info',
                category: 'best-practice',
                message: `函数 "${funcMatch[1]}" 缺少返回类型注解`,
                filePath,
                startLine: i + 1,
                endLine: i + 1,
                codeSnippet: line.trim(),
                suggestion: '添加返回类型注解以提高可读性'
              });
            }
          }
          return issues;
        }
      },
      {
        id: 'no-error-handling',
        name: '缺少错误处理',
        severity: 'error',
        category: 'bug',
        description: '异步操作或可能抛出异常的代码应包含错误处理',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('await ') || line.includes('JSON.parse') || line.includes('fetch(')) {
              // 检查后续 5 行内是否有 try/catch
              let hasTryCatch = false;
              for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 5); j++) {
                if (lines[j].includes('try') || lines[j].includes('catch')) {
                  hasTryCatch = true;
                  break;
                }
              }
              if (!hasTryCatch) {
                issues.push({
                  severity: 'error',
                  category: 'bug',
                  message: '异步操作缺少错误处理',
                  filePath,
                  startLine: i + 1,
                  endLine: i + 1,
                  codeSnippet: line.trim(),
                  suggestion: '添加 try/catch 处理可能的异常'
                });
              }
            }
          }
          return issues;
        }
      },
      {
        id: 'hardcoded-secret',
        name: '硬编码敏感信息',
        severity: 'error',
        category: 'security',
        description: '检测到可能的硬编码密钥或密码',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          const secretPatterns = [
            /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/i,
            /password\s*[:=]\s*['"][^'"]+['"]/i,
            /token\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/i,
            /secret\s*[:=]\s*['"][^'"]+['"]/i
          ];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // 排除测试文件和注释
            if (filePath.includes('test') || filePath.includes('spec')) continue;
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
            for (const pattern of secretPatterns) {
              if (pattern.test(line)) {
                issues.push({
                  severity: 'error',
                  category: 'security',
                  message: '检测到硬编码的敏感信息',
                  filePath,
                  startLine: i + 1,
                  endLine: i + 1,
                  codeSnippet: line.replace(/['"][^'"]+['"]/, '"***REDACTED***"'),
                  suggestion: '将敏感信息移到环境变量或配置文件中'
                });
              }
            }
          }
          return issues;
        }
      },
      {
        id: 'unused-imports',
        name: '未使用的导入',
        severity: 'info',
        category: 'maintainability',
        description: '检查并报告未使用的导入',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          const imports: { name: string; line: number }[] = [];

          for (let i = 0; i < lines.length; i++) {
            const importMatch = lines[i].match(/import\s+(?:\{([^}]+)\}|(\w+))/);
            if (importMatch) {
              const names = importMatch[1] ? importMatch[1].split(',').map(s => s.trim()) : [importMatch[2]];
              for (const name of names) {
                if (name) imports.push({ name, line: i + 1 });
              }
            }
          }

          for (const imp of imports) {
            let used = false;
            for (let i = 0; i < lines.length; i++) {
              if (i + 1 === imp.line) continue;
              const regex = new RegExp(`\\b${imp.name}\\b`);
              if (regex.test(lines[i])) { used = true; break; }
            }
            if (!used) {
              issues.push({
                severity: 'info',
                category: 'maintainability',
                message: `未使用的导入: ${imp.name}`,
                filePath,
                startLine: imp.line,
                endLine: imp.line,
                codeSnippet: lines[imp.line - 1].trim(),
                suggestion: '移除未使用的导入'
              });
            }
          }
          return issues;
        }
      },
      {
        id: 'sync-loop',
        name: '循环中的 await',
        severity: 'warning',
        category: 'performance',
        description: '循环中的 await 串行执行可能影响性能',
        check: (content, lines, filePath) => {
          const issues: any[] = [];
          let inLoop = false;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/\bfor\s*\(|\.forEach\s*\(|\.map\s*\(/.test(line)) inLoop = true;
            if (inLoop && line.includes('await ')) {
              issues.push({
                severity: 'warning',
                category: 'performance',
                message: '循环中使用了 await，建议使用 Promise.all 并行处理',
                filePath,
                startLine: i + 1,
                endLine: i + 1,
                codeSnippet: line.trim(),
                suggestion: '使用 Promise.all 替代串行 await'
              });
            }
            if (line.includes('}') && inLoop) inLoop = false;
          }
          return issues;
        }
      }
    );
  }

  // 审查文件
  reviewFile(filePath: string, content: string): ReviewReport {
    const lines = content.split('\n');
    const issues: ReviewIssue[] = [];

    for (const rule of this.rules) {
      try {
        const found = rule.check(content, lines, filePath);
        for (const f of found) {
          issues.push({
            id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ruleId: rule.id,
            ruleName: rule.name,
            ...f
          });
        }
      } catch (e) {
        // 规则执行错误，跳过
      }
    }

    return this.buildReport(filePath, issues, lines);
  }

  // 审查多个文件
  reviewFiles(files: { path: string; content: string }[]): ReviewReport {
    const allIssues: ReviewIssue[] = [];
    let totalLines = 0;

    for (const file of files) {
      const report = this.reviewFile(file.path, file.content);
      allIssues.push(...report.issues);
      totalLines += file.content.split('\n').length;
    }

    return {
      id: `report-${Date.now()}`,
      timestamp: Date.now(),
      issues: allIssues,
      summary: this.summarize(allIssues),
      metrics: {
        linesOfCode: totalLines,
        cyclomaticComplexity: 0,
        maintainabilityIndex: 0,
        duplicateLines: 0
      }
    };
  }

  // 构建报告
  private buildReport(filePath: string, issues: ReviewIssue[], lines: string[]): ReviewReport {
    return {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      filePath,
      timestamp: Date.now(),
      issues,
      summary: this.summarize(issues),
      metrics: {
        linesOfCode: lines.filter(l => l.trim() && !l.trim().startsWith('//')).length,
        cyclomaticComplexity: this.calcComplexity(lines),
        maintainabilityIndex: this.calcMaintainability(lines, issues.length),
        duplicateLines: 0
      }
    };
  }

  // 计算圈复杂度
  private calcComplexity(lines: string[]): number {
    let count = 1;
    for (const line of lines) {
      if (/\bif\s*\(/.test(line)) count++;
      if (/\belse\s+if\b/.test(line)) count++;
      if (/\bfor\s*\(/.test(line)) count++;
      if (/\bwhile\s*\(/.test(line)) count++;
      if (/\bcase\s+/.test(line)) count++;
      if (/\bcatch\s*\(/.test(line)) count++;
      if (/\?.*:/.test(line)) count++; // 三元
    }
    return count;
  }

  // 计算可维护性指数
  private calcMaintainability(lines: string[], issues: number): number {
    const loc = lines.length;
    if (loc === 0) return 100;
    // 简化计算：100 - (issues / loc * 1000)
    return Math.max(0, Math.min(100, 100 - (issues / loc * 1000)));
  }

  // 汇总
  private summarize(issues: ReviewIssue[]): ReviewReport['summary'] {
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info').length;
    const hints = issues.filter(i => i.severity === 'hint').length;
    const total = issues.length;
    // 分数：errors * 10, warnings * 3, info * 1
    const penalty = errors * 10 + warnings * 3 + info;
    const score = Math.max(0, 100 - penalty);
    return { total, errors, warnings, info, hints, score };
  }

  // 生成重构建议
  generateRefactorSuggestions(filePath: string, content: string): RefactorSuggestion[] {
    const suggestions: RefactorSuggestion[] = [];
    const lines = content.split('\n');

    // 提取长函数
    let inFunction = false;
    let functionStart = 0;
    let functionName = '';
    let functionBody: string[] = [];
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const funcMatch = line.match(/(?:function|method)\s+(\w+)\s*\(/);
      if (funcMatch && !inFunction) {
        inFunction = true;
        functionStart = i;
        functionName = funcMatch[1];
        functionBody = [];
        braceCount = 0;
        functionBody.push(line);
        continue;
      }
      if (inFunction) {
        functionBody.push(line);
        for (const ch of line) {
          if (ch === '{') braceCount++;
          else if (ch === '}') {
            braceCount--;
            if (braceCount === 0) {
              if (functionBody.length > 50) {
                suggestions.push({
                  id: `refactor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type: 'extract-function',
                  title: `拆分长函数: ${functionName}`,
                  description: `函数 "${functionName}" 有 ${functionBody.length} 行，建议拆分为多个小函数`,
                  filePath,
                  startLine: functionStart + 1,
                  endLine: i + 1,
                  before: functionBody.slice(0, 3).join('\n') + '\n...',
                  after: `// 拆分为多个职责单一的函数\nfunction ${functionName}Part1() { ... }\nfunction ${functionName}Part2() { ... }`,
                  benefits: ['提高可读性', '便于测试', '复用性增强'],
                  riskLevel: 'medium',
                  automated: false
                });
              }
              inFunction = false;
              break;
            }
          }
        }
      }
    }

    // 现代语法建议
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // var -> const/let
      if (line.match(/^\s*var\s+/)) {
        suggestions.push({
          id: `refactor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'modernize',
          title: 'var -> const/let',
          description: '使用 const 或 let 替代 var',
          filePath,
          startLine: i + 1,
          endLine: i + 1,
          before: line.trim(),
          after: line.replace(/\bvar\b/, 'const').trim(),
          benefits: ['块级作用域', '避免变量提升问题'],
          riskLevel: 'low',
          automated: true
        });
      }
    }

    return suggestions;
  }

  // 应用修复
  applyFix(filePath: string, content: string, issue: ReviewIssue): string {
    if (!issue.fixCode) return content;
    const lines = content.split('\n');
    if (issue.startLine >= 1 && issue.startLine <= lines.length) {
      lines[issue.startLine - 1] = issue.fixCode;
    }
    return lines.join('\n');
  }

  // 获取历史
  getHistory(limit = 20): ReviewReport[] {
    return this.reviewHistory.slice(0, limit);
  }

  // 列出规则
  listRules(): { id: string; name: string; severity: IssueSeverity; category: string }[] {
    return this.rules.map(r => ({ id: r.id, name: r.name, severity: r.severity, category: r.category }));
  }

  // 启用/禁用规则
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      // 通过在 check 函数前加判断实现
      (rule as any)._disabled = !enabled;
    }
  }

  // 保存报告
  private saveReport(report: ReviewReport): void {
    this.reviewHistory.unshift(report);
    if (this.reviewHistory.length > this.maxHistory) {
      this.reviewHistory = this.reviewHistory.slice(0, this.maxHistory);
    }
  }
}

export const codeReviewService = new CodeReviewService();
