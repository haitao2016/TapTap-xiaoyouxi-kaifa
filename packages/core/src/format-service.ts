import type { FormatterConfig, FormatResult } from '@tapdev/types';

export class FormatService {
  private formatters: Map<string, Formatter> = new Map();

  constructor() {
    this.registerFormatters();
  }

  private registerFormatters(): void {
    this.formatters.set('javascript', new JavaScriptFormatter());
    this.formatters.set('typescript', new TypeScriptFormatter());
    this.formatters.set('json', new JsonFormatter());
    this.formatters.set('jsonc', new JsonFormatter());
    this.formatters.set('markdown', new MarkdownFormatter());
    this.formatters.set('html', new HtmlFormatter());
    this.formatters.set('css', new CssFormatter());
    this.formatters.set('scss', new CssFormatter());
  }

  format(code: string, language: string, config?: FormatterConfig): FormatResult {
    const formatter = this.formatters.get(language) || this.formatters.get('javascript');
    
    if (!formatter) {
      return {
        success: false,
        code,
        error: `不支持的语言: ${language}`,
      };
    }

    try {
      const result = formatter.format(code, config);
      return result;
    } catch (error) {
      return {
        success: false,
        code,
        error: error instanceof Error ? error.message : '格式化失败',
      };
    }
  }

  lint(code: string, language: string): LintResult {
    const formatter = this.formatters.get(language) || this.formatters.get('javascript');
    
    if (!formatter) {
      return {
        success: false,
        errors: [],
        warnings: [],
      };
    }

    try {
      return formatter.lint(code);
    } catch (error) {
      return {
        success: false,
        errors: [],
        warnings: [],
      };
    }
  }

  formatAndLint(code: string, language: string, config?: FormatterConfig): FormatAndLintResult {
    const formatResult = this.format(code, language, config);
    const lintResult = this.lint(formatResult.code, language);
    
    return {
      ...formatResult,
      ...lintResult,
    };
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.formatters.keys());
  }

  getDefaultConfig(language: string): FormatterConfig {
    return {
      tabWidth: 2,
      useTabs: false,
      printWidth: 80,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      arrowParens: 'always',
      bracketSpacing: true,
      bracketSameLine: false,
      endOfLine: 'lf',
    };
  }
}

interface Formatter {
  format(code: string, config?: FormatterConfig): FormatResult;
  lint(code: string): LintResult;
}

class JavaScriptFormatter implements Formatter {
  format(code: string, config?: FormatterConfig): FormatResult {
    const tab = config?.useTabs ? '\t' : ' '.repeat(config?.tabWidth || 2);
    const printWidth = config?.printWidth || 80;
    
    try {
      let formatted = code;
      
      formatted = this.normalizeIndentation(formatted, tab);
      formatted = this.addMissingSemicolons(formatted, config?.semi !== false);
      formatted = this.formatQuotes(formatted, config?.singleQuote !== false);
      formatted = this.formatTrailingCommas(formatted, config?.trailingComma || 'es5');
      formatted = this.wrapLines(formatted, printWidth);
      
      return {
        success: true,
        code: formatted,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        code,
        error: error instanceof Error ? error.message : '格式化失败',
      };
    }
  }

  lint(code: string): LintResult {
    const errors: LintIssue[] = [];
    const warnings: LintIssue[] = [];
    
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      if (/^(var|function)\s+\S+\s*=\s*function/.test(line)) {
        warnings.push({
          line: lineNumber,
          column: 1,
          message: '建议使用 const/let 替代 var',
          ruleId: 'prefer-const',
          severity: 'warning',
        });
      }
      
      if (/console\.(log|warn|error|info)\(/.test(line)) {
        warnings.push({
          line: lineNumber,
          column: line.indexOf('console'),
          message: '避免在生产代码中使用 console',
          ruleId: 'no-console',
          severity: 'warning',
        });
      }
      
      if (/debugger\b/.test(line)) {
        errors.push({
          line: lineNumber,
          column: line.indexOf('debugger'),
          message: '移除 debugger 语句',
          ruleId: 'no-debugger',
          severity: 'error',
        });
      }
      
      if (line.length > 120) {
        warnings.push({
          line: lineNumber,
          column: 121,
          message: '行长度超过 120 字符',
          ruleId: 'max-len',
          severity: 'warning',
        });
      }
    });
    
    return {
      success: true,
      errors,
      warnings,
    };
  }

  private normalizeIndentation(code: string, tab: string): string {
    return code.replace(/^( {2}|\t)+/gm, (match) => {
      const spaces = match.replace(/\t/g, '  ');
      const depth = Math.floor(spaces.length / 2);
      return tab.repeat(depth);
    });
  }

  private addMissingSemicolons(code: string, addSemi: boolean): string {
    if (!addSemi) return code;
    
    return code.replace(/(\b(return|throw|break|continue|import|export)\b.*?)(?=\s*[\r\n])/g, '$1;');
  }

  private formatQuotes(code: string, singleQuote: boolean): string {
    if (singleQuote) {
      return code.replace(/("[^"]*")/g, (match) => {
        if (!match.includes("'")) {
          return `'${match.slice(1, -1)}'`;
        }
        return match;
      });
    }
    return code;
  }

  private formatTrailingCommas(code: string, style: string): string {
    if (style === 'none') return code;
    
    return code.replace(/(\([^)]+\))/g, (match) => {
      if (match.includes('\n')) {
        return match.replace(/,\s*\)/, ',)');
      }
      return match;
    });
  }

  private wrapLines(code: string, printWidth: number): string {
    return code.split('\n').map(line => {
      if (line.length <= printWidth) return line;
      
      let result = line;
      const parts = line.split(',');
      if (parts.length > 1) {
        result = parts.join(',\n' + ' '.repeat(4));
      }
      
      return result;
    }).join('\n');
  }
}

class TypeScriptFormatter extends JavaScriptFormatter {
  format(code: string, config?: FormatterConfig): FormatResult {
    const result = super.format(code, config);
    
    if (!result.success) return result;
    
    let formatted = result.code;
    
    formatted = this.formatTypeAnnotations(formatted);
    
    return {
      ...result,
      code: formatted,
    };
  }

  private formatTypeAnnotations(code: string): string {
    return code.replace(/:\s*(\w+)/g, ': $1');
  }
}

class JsonFormatter implements Formatter {
  format(code: string, config?: FormatterConfig): FormatResult {
    try {
      const parsed = JSON.parse(code);
      const indent = config?.useTabs ? '\t' : ' '.repeat(config?.tabWidth || 2);
      return {
        success: true,
        code: JSON.stringify(parsed, null, indent),
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        code,
        error: error instanceof Error ? error.message : 'JSON 解析失败',
      };
    }
  }

  lint(code: string): LintResult {
    try {
      JSON.parse(code);
      return {
        success: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: true,
        errors: [{
          line: 1,
          column: 1,
          message: error instanceof Error ? error.message : 'JSON 格式错误',
          ruleId: 'json-parse-error',
          severity: 'error',
        }],
        warnings: [],
      };
    }
  }
}

class MarkdownFormatter implements Formatter {
  format(code: string, config?: FormatterConfig): FormatResult {
    try {
      let formatted = code;
      
      formatted = this.normalizeHeadings(formatted);
      formatted = this.formatLists(formatted);
      formatted = this.normalizeSpaces(formatted);
      
      return {
        success: true,
        code: formatted,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        code,
        error: error instanceof Error ? error.message : '格式化失败',
      };
    }
  }

  lint(code: string): LintResult {
    return {
      success: true,
      errors: [],
      warnings: [],
    };
  }

  private normalizeHeadings(code: string): string {
    return code.replace(/^(#+)\s+(.+?)\s+#*$/gm, '$1 $2');
  }

  private formatLists(code: string): string {
    return code.replace(/^(\d+)\.\s+/gm, '$1. ');
  }

  private normalizeSpaces(code: string): string {
    return code.replace(/\n{3,}/g, '\n\n');
  }
}

class HtmlFormatter implements Formatter {
  format(code: string, config?: FormatterConfig): FormatResult {
    try {
      let formatted = code;
      
      formatted = this.indentTags(formatted, config?.tabWidth || 2);
      
      return {
        success: true,
        code: formatted,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        code,
        error: error instanceof Error ? error.message : '格式化失败',
      };
    }
  }

  lint(code: string): LintResult {
    const errors: LintIssue[] = [];
    const warnings: LintIssue[] = [];
    
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
    
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      selfClosingTags.forEach(tag => {
        if (new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi').test(line) && !line.includes('/>')) {
          warnings.push({
            line: lineNumber,
            column: line.indexOf(`<${tag}`),
            message: `${tag} 标签应该自闭合`,
            ruleId: 'self-closing-tag',
            severity: 'warning',
          });
        }
      });
    });
    
    return {
      success: true,
      errors,
      warnings,
    };
  }

  private indentTags(code: string, tabWidth: number): string {
    const indent = ' '.repeat(tabWidth);
    let depth = 0;
    const lines: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1];
      
      if (char === '<') {
        if (nextChar === '/') {
          depth--;
          if (currentLine.trim()) {
            lines.push(indent.repeat(depth) + currentLine.trim());
            currentLine = '';
          }
        }
      } else if (char === '>') {
        if (!code.substring(i - 3, i).includes('/')) {
          depth++;
        }
        currentLine += '>';
        if (nextChar === '\n') {
          lines.push(indent.repeat(Math.max(0, depth - 1)) + currentLine);
          currentLine = '';
        } else if (nextChar === '<') {
          lines.push(indent.repeat(Math.max(0, depth - 1)) + currentLine);
          currentLine = '';
        }
      } else {
        currentLine += char;
      }
    }
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    
    return lines.join('\n');
  }
}

class CssFormatter implements Formatter {
  format(code: string, config?: FormatterConfig): FormatResult {
    try {
      let formatted = code;
      
      formatted = this.normalizeSpacing(formatted);
      formatted = this.formatProperties(formatted, config?.tabWidth || 2);
      
      return {
        success: true,
        code: formatted,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        code,
        error: error instanceof Error ? error.message : '格式化失败',
      };
    }
  }

  lint(code: string): LintResult {
    return {
      success: true,
      errors: [],
      warnings: [],
    };
  }

  private normalizeSpacing(code: string): string {
    return code.replace(/\s*{\s*/g, ' {\n').replace(/\s*}\s*/g, '\n}\n');
  }

  private formatProperties(code: string, tabWidth: number): string {
    const indent = ' '.repeat(tabWidth);
    return code.replace(/([a-z-]+)\s*:\s*/gi, `${indent}$1: `);
  }
}

export interface FormatterConfig {
  tabWidth?: number;
  useTabs?: boolean;
  printWidth?: number;
  semi?: boolean;
  singleQuote?: boolean;
  trailingComma?: 'none' | 'es5' | 'all';
  arrowParens?: 'always' | 'avoid';
  bracketSpacing?: boolean;
  bracketSameLine?: boolean;
  endOfLine?: 'lf' | 'crlf' | 'cr';
}

export interface FormatResult {
  success: boolean;
  code: string;
  error: string | null;
}

export interface LintIssue {
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'error' | 'warning';
}

export interface LintResult {
  success: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
}

export interface FormatAndLintResult extends FormatResult, LintResult {}

export const formatService = new FormatService();
