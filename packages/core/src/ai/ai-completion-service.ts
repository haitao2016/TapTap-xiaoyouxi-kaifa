import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type AIProvider = 'openai' | 'claude' | 'ollama' | 'mock' | 'local';

export type CompletionTrigger = 'auto' | 'manual' | 'on-type';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  autoTrigger?: boolean;
  triggerDelay?: number;
  maxContextLines?: number;
  enabledLanguages?: string[];
}

export interface CompletionContext {
  filePath: string;
  language: string;
  prefix: string;
  suffix: string;
  cursor: { line: number; column: number };
  projectTypes?: string[];
  selectedText?: string;
  imports?: string[];
  symbols?: string[];
}

export interface CompletionRequest {
  id: string;
  context: CompletionContext;
  multiline: boolean;
  trigger: CompletionTrigger;
}

export interface CompletionItem {
  id: string;
  text: string;
  displayText?: string;
  description?: string;
  type?: 'function' | 'variable' | 'class' | 'keyword' | 'snippet' | 'property' | 'method';
  confidence: number;
  detail?: string;
}

export interface CompletionResult {
  id: string;
  items: CompletionItem[];
  confidence: number;
  model: string;
  provider: AIProvider;
  latency: number;
  cached?: boolean;
}

export interface LocalCompletionRule {
  id: string;
  language: string;
  pattern: RegExp;
  generate: (match: RegExpMatchArray, context: CompletionContext) => CompletionItem[];
  priority: number;
}

export interface SnippetCompletion {
  id: string;
  label: string;
  description?: string;
  body: string;
  scope: string;
  prefix: string;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'mock',
  model: 'gpt-3.5-turbo',
  temperature: 0.2,
  maxTokens: 256,
  topP: 0.95,
  frequencyPenalty: 0,
  presencePenalty: 0,
  autoTrigger: true,
  triggerDelay: 150,
  maxContextLines: 100,
  enabledLanguages: ['javascript', 'typescript', 'html', 'css', 'json', 'python', 'csharp', 'lua'],
};

const OPENAI_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'];
const CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307',
];
const OLLAMA_MODELS = [
  'qwen2.5-coder:7b',
  'deepseek-coder:6.7b',
  'codellama:13b',
  'codegemma:7b',
  'starcoder2:7b',
];
const LOCAL_MODELS = ['local-completion-engine'];

const BUILTIN_SNIPPETS: SnippetCompletion[] = [
  {
    id: 'js-console-log',
    label: 'console.log',
    description: '输出日志',
    body: 'console.log(${1:message});',
    scope: 'javascript,typescript',
    prefix: 'log',
  },
  {
    id: 'js-console-error',
    label: 'console.error',
    description: '输出错误',
    body: 'console.error(${1:error});',
    scope: 'javascript,typescript',
    prefix: 'error',
  },
  {
    id: 'js-console-warn',
    label: 'console.warn',
    description: '输出警告',
    body: 'console.warn(${1:message});',
    scope: 'javascript,typescript',
    prefix: 'warn',
  },
  {
    id: 'js-function',
    label: 'function',
    description: '函数定义',
    body: 'function ${1:functionName}(${2:params}) {\n\t${3:// code}\n}',
    scope: 'javascript,typescript',
    prefix: 'func',
  },
  {
    id: 'js-arrow-function',
    label: 'arrow function',
    description: '箭头函数',
    body: 'const ${1:functionName} = (${2:params}) => {\n\t${3:// code}\n};',
    scope: 'javascript,typescript',
    prefix: 'arrow',
  },
  {
    id: 'js-async-function',
    label: 'async function',
    description: '异步函数',
    body: 'async function ${1:functionName}(${2:params}) {\n\t${3:// code}\n}',
    scope: 'javascript,typescript',
    prefix: 'async',
  },
  {
    id: 'js-if',
    label: 'if statement',
    description: 'if 语句',
    body: 'if (${1:condition}) {\n\t${2:// code}\n}',
    scope: 'javascript,typescript',
    prefix: 'if',
  },
  {
    id: 'js-if-else',
    label: 'if-else statement',
    description: 'if-else 语句',
    body: 'if (${1:condition}) {\n\t${2:// code}\n} else {\n\t${3:// code}\n}',
    scope: 'javascript,typescript',
    prefix: 'ife',
  },
  {
    id: 'js-for',
    label: 'for loop',
    description: 'for 循环',
    body: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3:// code}\n}',
    scope: 'javascript,typescript',
    prefix: 'for',
  },
  {
    id: 'js-foreach',
    label: 'forEach',
    description: 'forEach 循环',
    body: '${1:array}.forEach((${2:item}) => {\n\t${3:// code}\n});',
    scope: 'javascript,typescript',
    prefix: 'foreach',
  },
  {
    id: 'js-class',
    label: 'class',
    description: '类定义',
    body: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t${3:// code}\n\t}\n}',
    scope: 'javascript,typescript',
    prefix: 'class',
  },
  {
    id: 'js-try-catch',
    label: 'try-catch',
    description: 'try-catch 块',
    body: 'try {\n\t${1:// code}\n} catch (${2:error}) {\n\t${3:// handle error}\n}',
    scope: 'javascript,typescript',
    prefix: 'try',
  },
  {
    id: 'js-import',
    label: 'import',
    description: '导入语句',
    body: "import { ${1:module} } from '${2:package}';",
    scope: 'javascript,typescript',
    prefix: 'import',
  },
  {
    id: 'js-export-default',
    label: 'export default',
    description: '默认导出',
    body: 'export default ${1:name};',
    scope: 'javascript,typescript',
    prefix: 'expd',
  },
  {
    id: 'ts-interface',
    label: 'interface',
    description: '接口定义',
    body: 'interface ${1:InterfaceName} {\n\t${2:property}: ${3:string};\n}',
    scope: 'typescript',
    prefix: 'inter',
  },
  {
    id: 'ts-type',
    label: 'type alias',
    description: '类型别名',
    body: 'type ${1:TypeName} = {\n\t${2:property}: ${3:string};\n};',
    scope: 'typescript',
    prefix: 'type',
  },
  {
    id: 'ts-enum',
    label: 'enum',
    description: '枚举定义',
    body: "enum ${1:EnumName} {\n\t${2:Value} = '${2:Value}',\n}",
    scope: 'typescript',
    prefix: 'enum',
  },
  {
    id: 'html-template',
    label: 'HTML5 template',
    description: 'HTML5 模板',
    body: '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Title}</title>\n</head>\n<body>\n\t${2:content}\n</body>\n</html>',
    scope: 'html',
    prefix: 'html',
  },
  {
    id: 'css-flex',
    label: 'flexbox',
    description: 'Flexbox 布局',
    body: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};',
    scope: 'css',
    prefix: 'flex',
  },
  {
    id: 'json-object',
    label: 'JSON object',
    description: 'JSON 对象',
    body: '{\n\t"${1:key}": "${2:value}"\n}',
    scope: 'json',
    prefix: 'obj',
  },
];

export class AICompletionService {
  private config: AIConfig = { ...DEFAULT_CONFIG };
  private cache = new Map<string, CompletionResult>();
  private inflight = new Map<string, Promise<CompletionResult>>();
  private localRules: LocalCompletionRule[] = [];
  private snippets: SnippetCompletion[] = [...BUILTIN_SNIPPETS];
  private debounceTimer: number | null = null;

  constructor() {
    this.loadLocalRules();
  }

  private loadLocalRules(): void {
    this.localRules = [
      {
        id: 'js-dot-property',
        language: 'javascript,typescript',
        pattern: /\.(\w*)$/,
        generate: (match, context) => {
          const prefix = match[1] ?? '';
          const properties = this.extractProperties(context.prefix);
          return properties
            .filter((p) => p.startsWith(prefix))
            .slice(0, 10)
            .map((p, i) => ({
              id: `prop-${i}`,
              text: p,
              displayText: p,
              type: 'property' as const,
              confidence: 0.8 - i * 0.05,
            }));
        },
        priority: 100,
      },
      {
        id: 'js-keyword',
        language: 'javascript,typescript',
        pattern: /(\w+)$/,
        generate: (match) => {
          const prefix = match[1] ?? '';
          const keywords = [
            'const',
            'let',
            'var',
            'function',
            'return',
            'if',
            'else',
            'for',
            'while',
            'do',
            'switch',
            'case',
            'break',
            'continue',
            'try',
            'catch',
            'finally',
            'throw',
            'new',
            'class',
            'extends',
            'super',
            'this',
            'import',
            'export',
            'default',
            'from',
            'as',
            'async',
            'await',
            'yield',
            'typeof',
            'instanceof',
            'in',
            'of',
            'void',
            'delete',
            'interface',
            'type',
            'enum',
            'implements',
            'private',
            'public',
            'protected',
            'readonly',
            'static',
            'abstract',
            'override',
          ];
          return keywords
            .filter((k) => k.startsWith(prefix))
            .slice(0, 15)
            .map((k, i) => ({
              id: `kw-${i}`,
              text: k,
              displayText: k,
              type: 'keyword' as const,
              confidence: 0.9 - i * 0.03,
              detail: '关键字',
            }));
        },
        priority: 80,
      },
      {
        id: 'js-function-call',
        language: 'javascript,typescript',
        pattern: /(\w+)\($/,
        generate: (match, context) => {
          const funcName = match[1] ?? '';
          const functions = this.extractFunctions(context.prefix);
          const func = functions.find((f) => f.name === funcName);
          if (func) {
            return [
              {
                id: 'func-sig',
                text: func.params.map((_, i) => `\${${i + 1}:${func.params[i]}}`).join(', '),
                displayText: `${func.name}(${func.params.join(', ')})`,
                type: 'function' as const,
                confidence: 0.9,
                detail: '函数签名',
              },
            ];
          }
          return [];
        },
        priority: 90,
      },
      {
        id: 'html-tag',
        language: 'html',
        pattern: /<(\w*)$/,
        generate: (match) => {
          const prefix = match[1] ?? '';
          const tags = [
            'div',
            'span',
            'p',
            'a',
            'img',
            'button',
            'input',
            'form',
            'label',
            'ul',
            'ol',
            'li',
            'table',
            'tr',
            'td',
            'th',
            'thead',
            'tbody',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'section',
            'article',
            'header',
            'footer',
            'nav',
            'main',
            'aside',
            'figure',
            'figcaption',
            'video',
            'audio',
            'canvas',
            'script',
            'style',
            'link',
            'meta',
            'title',
          ];
          return tags
            .filter((t) => t.startsWith(prefix))
            .slice(0, 15)
            .map((t, i) => ({
              id: `tag-${i}`,
              text: `${t}>`,
              displayText: `<${t}>`,
              type: 'snippet' as const,
              confidence: 0.85 - i * 0.03,
            }));
        },
        priority: 85,
      },
      {
        id: 'css-property',
        language: 'css',
        pattern: /(\w*)$/,
        generate: (match) => {
          const prefix = match[1] ?? '';
          const properties = [
            'color',
            'background',
            'background-color',
            'font-size',
            'font-weight',
            'font-family',
            'margin',
            'padding',
            'border',
            'width',
            'height',
            'display',
            'position',
            'top',
            'left',
            'right',
            'bottom',
            'float',
            'clear',
            'overflow',
            'text-align',
            'text-decoration',
            'line-height',
            'letter-spacing',
            'opacity',
            'z-index',
            'transform',
            'transition',
            'animation',
            'flex',
            'flex-direction',
            'justify-content',
            'align-items',
            'grid',
            'grid-template-columns',
            'grid-template-rows',
            'gap',
            'box-shadow',
            'border-radius',
            'cursor',
            'pointer-events',
          ];
          return properties
            .filter((p) => p.startsWith(prefix))
            .slice(0, 15)
            .map((p, i) => ({
              id: `css-${i}`,
              text: `${p}: `,
              displayText: p,
              type: 'property' as const,
              confidence: 0.8 - i * 0.03,
            }));
        },
        priority: 80,
      },
      {
        id: 'json-key',
        language: 'json',
        pattern: /"(\w*)$/,
        generate: (match, context) => {
          const prefix = match[1] ?? '';
          const keys = this.extractJsonKeys(context.prefix);
          return keys
            .filter((k) => k.startsWith(prefix))
            .slice(0, 10)
            .map((k, i) => ({
              id: `key-${i}`,
              text: `${k}": `,
              displayText: k,
              type: 'property' as const,
              confidence: 0.75 - i * 0.05,
            }));
        },
        priority: 75,
      },
      {
        id: 'python-keyword',
        language: 'python',
        pattern: /(\w+)$/,
        generate: (match) => {
          const prefix = match[1] ?? '';
          const keywords = [
            'def',
            'class',
            'import',
            'from',
            'return',
            'if',
            'elif',
            'else',
            'for',
            'while',
            'break',
            'continue',
            'pass',
            'try',
            'except',
            'finally',
            'raise',
            'with',
            'as',
            'lambda',
            'yield',
            'global',
            'nonlocal',
            'in',
            'is',
            'not',
            'and',
            'or',
            'True',
            'False',
            'None',
            'self',
            'print',
            'len',
            'range',
            'str',
            'int',
            'float',
            'list',
            'dict',
            'set',
            'tuple',
            'append',
            'extend',
            'pop',
          ];
          return keywords
            .filter((k) => k.startsWith(prefix))
            .slice(0, 15)
            .map((k, i) => ({
              id: `py-kw-${i}`,
              text: k,
              displayText: k,
              type: 'keyword' as const,
              confidence: 0.85 - i * 0.03,
            }));
        },
        priority: 80,
      },
      {
        id: 'csharp-keyword',
        language: 'csharp',
        pattern: /(\w+)$/,
        generate: (match) => {
          const prefix = match[1] ?? '';
          const keywords = [
            'public',
            'private',
            'protected',
            'internal',
            'static',
            'void',
            'int',
            'string',
            'float',
            'double',
            'bool',
            'class',
            'interface',
            'enum',
            'struct',
            'namespace',
            'using',
            'return',
            'if',
            'else',
            'for',
            'foreach',
            'while',
            'do',
            'switch',
            'case',
            'break',
            'continue',
            'try',
            'catch',
            'finally',
            'throw',
            'new',
            'this',
            'base',
            'virtual',
            'override',
            'abstract',
            'sealed',
            'readonly',
            'const',
            'var',
            'async',
            'await',
            'Task',
            'IEnumerable',
            'List',
            'Dictionary',
            'Console',
            'Debug',
            'MonoBehaviour',
            'GameObject',
            'Transform',
            'Vector3',
            'Vector2',
            'Quaternion',
            'Color',
          ];
          return keywords
            .filter((k) => k.toLowerCase().startsWith(prefix.toLowerCase()))
            .slice(0, 15)
            .map((k, i) => ({
              id: `cs-kw-${i}`,
              text: k,
              displayText: k,
              type: 'keyword' as const,
              confidence: 0.8 - i * 0.03,
            }));
        },
        priority: 80,
      },
      {
        id: 'lua-keyword',
        language: 'lua',
        pattern: /(\w+)$/,
        generate: (match) => {
          const prefix = match[1] ?? '';
          const keywords = [
            'function',
            'local',
            'return',
            'if',
            'then',
            'else',
            'elseif',
            'end',
            'for',
            'while',
            'do',
            'repeat',
            'until',
            'break',
            'true',
            'false',
            'nil',
            'and',
            'or',
            'not',
            'in',
            'ipairs',
            'pairs',
            'print',
            'table',
            'string',
            'math',
            'io',
            'os',
            'require',
            'module',
            'setmetatable',
            'getmetatable',
            'type',
            'tostring',
            'tonumber',
            'pcall',
            'xpcall',
            'error',
            'assert',
            'cc',
            'display',
            'transition',
            'audio',
            'ccui',
          ];
          return keywords
            .filter((k) => k.startsWith(prefix))
            .slice(0, 15)
            .map((k, i) => ({
              id: `lua-kw-${i}`,
              text: k,
              displayText: k,
              type: 'keyword' as const,
              confidence: 0.8 - i * 0.03,
            }));
        },
        priority: 80,
      },
    ];
  }

  configure(partial: Partial<AIConfig>): void {
    this.config = { ...this.config, ...partial };
    globalEventBus.emit({ type: 'ai:config-change', payload: this.config });
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  listModels(provider: AIProvider): string[] {
    switch (provider) {
      case 'openai':
        return [...OPENAI_MODELS];
      case 'claude':
        return [...CLAUDE_MODELS];
      case 'ollama':
        return [...OLLAMA_MODELS];
      case 'local':
        return [...LOCAL_MODELS];
      case 'mock':
        return ['mock-fast', 'mock-quality'];
    }
  }

  addSnippet(snippet: SnippetCompletion): void {
    this.snippets.push(snippet);
  }

  removeSnippet(id: string): boolean {
    const index = this.snippets.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.snippets.splice(index, 1);
      return true;
    }
    return false;
  }

  getSnippets(language?: string): SnippetCompletion[] {
    if (!language) return [...this.snippets];
    return this.snippets.filter((s) => s.scope.includes(language));
  }

  addLocalRule(rule: LocalCompletionRule): void {
    this.localRules.push(rule);
    this.localRules.sort((a, b) => b.priority - a.priority);
  }

  removeLocalRule(id: string): boolean {
    const index = this.localRules.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.localRules.splice(index, 1);
      return true;
    }
    return false;
  }

  async complete(
    req: Partial<CompletionRequest> & { context: CompletionContext }
  ): Promise<CompletionResult> {
    const request: CompletionRequest = {
      id: req.id ?? randomUUID(),
      context: req.context,
      multiline: req.multiline ?? false,
      trigger: req.trigger ?? 'auto',
    };

    const cacheKey = this.cacheKey(request);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { ...cached, cached: true };
    }
    if (this.inflight.has(cacheKey)) {
      return this.inflight.get(cacheKey)!;
    }

    const promise = this.dispatch(request);
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
    const { filePath, language, prefix, cursor } = req.context;
    const prefixEnd = prefix.slice(-300);
    return `${filePath}:${language}:${cursor.line}:${cursor.column}:${prefixEnd}:${req.multiline}`;
  }

  private async dispatch(req: CompletionRequest): Promise<CompletionResult> {
    const start = Date.now();
    let items: CompletionItem[] = [];
    let model = this.config.model;
    let provider = this.config.provider;

    try {
      if (!this.isLanguageEnabled(req.context.language)) {
        return {
          id: req.id,
          items: [],
          confidence: 0,
          model,
          provider,
          latency: Date.now() - start,
        };
      }

      const localItems = await this.getLocalCompletions(req.context);
      items = [...localItems];

      const snippetItems = this.getSnippetCompletions(req.context);
      items = [...items, ...snippetItems];

      if (this.config.provider === 'mock') {
        const mockItems = this.mockComplete(req);
        items = [...items, ...mockItems];
      } else if (this.config.provider === 'local') {
        const localEngineItems = await this.callLocalEngine(req);
        items = [...items, ...localEngineItems];
      } else if (this.config.provider === 'ollama') {
        const ollamaItems = await this.callOllama(req);
        items = [...items, ...ollamaItems];
      } else if (this.config.provider === 'openai') {
        const openaiItems = await this.callOpenAI(req);
        items = [...items, ...openaiItems];
      } else if (this.config.provider === 'claude') {
        const claudeItems = await this.callClaude(req);
        items = [...items, ...claudeItems];
      }

      items.sort((a, b) => b.confidence - a.confidence);
      items = items.slice(0, 20);
    } catch (err) {
      globalEventBus.emit({
        type: 'ai:error',
        payload: {
          provider: this.config.provider,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }

    const result: CompletionResult = {
      id: req.id,
      items,
      confidence: items.length > 0 ? Math.max(...items.map((i) => i.confidence)) : 0,
      model,
      provider,
      latency: Date.now() - start,
    };

    globalEventBus.emit({ type: 'ai:completion', payload: result });
    return result;
  }

  private isLanguageEnabled(language: string): boolean {
    if (!this.config.enabledLanguages?.length) return true;
    return this.config.enabledLanguages.includes(language.toLowerCase());
  }

  private async getLocalCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const items: CompletionItem[] = [];
    const line = this.getCurrentLine(context);

    for (const rule of this.localRules) {
      const languages = rule.language.split(',').map((l) => l.trim().toLowerCase());
      if (!languages.includes(context.language.toLowerCase())) continue;

      const match = line.match(rule.pattern);
      if (match) {
        try {
          const ruleItems = rule.generate(match, context);
          items.push(...ruleItems);
        } catch (err) {
          console.warn(`本地补全规则 ${rule.id} 执行失败:`, err);
        }
      }
    }

    return items;
  }

  private getSnippetCompletions(context: CompletionContext): CompletionItem[] {
    const line = this.getCurrentLine(context).trim();
    const languageSnippets = this.snippets.filter((s) =>
      s.scope.toLowerCase().includes(context.language.toLowerCase())
    );

    return languageSnippets
      .filter((s) => {
        const prefix = s.prefix.toLowerCase();
        return line.toLowerCase().endsWith(prefix) || prefix.includes(line.toLowerCase());
      })
      .slice(0, 5)
      .map((s, i) => ({
        id: `snippet-${s.id}`,
        text: s.body,
        displayText: s.label,
        description: s.description,
        type: 'snippet' as const,
        confidence: 0.7 - i * 0.05,
      }));
  }

  private getCurrentLine(context: CompletionContext): string {
    const lines = context.prefix.split('\n');
    return lines[lines.length - 1] ?? '';
  }

  private extractProperties(prefix: string): string[] {
    const props = new Set<string>();
    const re = /\.(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(prefix))) {
      props.add(match[1]);
    }
    return [...props];
  }

  private extractFunctions(prefix: string): { name: string; params: string[] }[] {
    const functions: { name: string; params: string[] }[] = [];
    const re = /(?:function|const)\s+(\w+)\s*(?:=\s*)?\(([^)]*)\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(prefix))) {
      const params = match[2]
        .split(',')
        .map((p) => p.trim().split(':')[0].trim().split('=')[0].trim())
        .filter((p) => p);
      functions.push({ name: match[1], params });
    }
    return functions;
  }

  private extractJsonKeys(prefix: string): string[] {
    const keys = new Set<string>();
    const re = /"([^"]+)"\s*:/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(prefix))) {
      keys.add(match[1]);
    }
    return [...keys];
  }

  private mockComplete(req: CompletionRequest): CompletionItem[] {
    const { language, prefix } = req.context;
    const trimmed = prefix.trimEnd();
    const items: CompletionItem[] = [];

    if (language === 'typescript' || language === 'javascript') {
      if (trimmed.endsWith('console.')) {
        items.push(
          { id: 'mock-log', text: 'log();', displayText: 'log()', type: 'method', confidence: 0.9 },
          {
            id: 'mock-error',
            text: 'error();',
            displayText: 'error()',
            type: 'method',
            confidence: 0.85,
          },
          {
            id: 'mock-warn',
            text: 'warn();',
            displayText: 'warn()',
            type: 'method',
            confidence: 0.8,
          }
        );
      }
      if (trimmed.endsWith('function ')) {
        items.push({
          id: 'mock-func',
          text: 'name() {\n  \n}',
          displayText: 'name() { ... }',
          type: 'function',
          confidence: 0.85,
        });
      }
      if (trimmed.endsWith('=> ')) {
        items.push({
          id: 'mock-arrow',
          text: '{\n  \n};',
          displayText: '{ ... }',
          type: 'snippet',
          confidence: 0.8,
        });
      }
      if (trimmed.endsWith('import ')) {
        items.push({
          id: 'mock-import',
          text: "{ } from '';",
          displayText: "{ } from ''",
          type: 'snippet',
          confidence: 0.8,
        });
      }
      if (trimmed.endsWith('const ')) {
        items.push({
          id: 'mock-const',
          text: 'value = ;',
          displayText: 'value = ;',
          type: 'variable',
          confidence: 0.75,
        });
      }
    }

    if (language === 'json') {
      if (trimmed.endsWith(':')) {
        items.push({
          id: 'mock-json',
          text: ' ""',
          displayText: '""',
          type: 'snippet',
          confidence: 0.8,
        });
      }
    }

    if (language === 'html') {
      if (trimmed.endsWith('<div')) {
        items.push({
          id: 'mock-div',
          text: ' className="">',
          displayText: 'className="">',
          type: 'snippet',
          confidence: 0.8,
        });
      }
    }

    return items;
  }

  private async callLocalEngine(req: CompletionRequest): Promise<CompletionItem[]> {
    await new Promise((r) => setTimeout(r, 50));

    const { prefix, language } = req.context;
    const line = this.getCurrentLine(req.context);
    const items: CompletionItem[] = [];

    const wordMatch = line.match(/(\w+)$/);
    if (wordMatch) {
      const word = wordMatch[1];
      const completions = this.fuzzyMatchCompletions(word, language);
      items.push(...completions);
    }

    return items;
  }

  private fuzzyMatchCompletions(prefix: string, language: string): CompletionItem[] {
    const allCompletions = this.getAllCompletionsForLanguage(language);
    return allCompletions
      .filter((c) => c.text.toLowerCase().startsWith(prefix.toLowerCase()))
      .slice(0, 10)
      .map((c, i) => ({
        ...c,
        id: `local-${c.id}`,
        confidence: Math.max(0.5, c.confidence - i * 0.03),
      }));
  }

  private getAllCompletionsForLanguage(language: string): CompletionItem[] {
    const completions: CompletionItem[] = [];
    const langLower = language.toLowerCase();

    if (langLower === 'typescript' || langLower === 'javascript') {
      const jsCompletions = [
        { text: 'addEventListener', type: 'method' as const },
        { text: 'removeEventListener', type: 'method' as const },
        { text: 'getElementById', type: 'method' as const },
        { text: 'querySelector', type: 'method' as const },
        { text: 'querySelectorAll', type: 'method' as const },
        { text: 'setTimeout', type: 'function' as const },
        { text: 'setInterval', type: 'function' as const },
        { text: 'clearTimeout', type: 'function' as const },
        { text: 'clearInterval', type: 'function' as const },
        { text: 'Promise', type: 'class' as const },
        { text: 'async', type: 'keyword' as const },
        { text: 'await', type: 'keyword' as const },
        { text: 'Array', type: 'class' as const },
        { text: 'Object', type: 'class' as const },
        { text: 'String', type: 'class' as const },
        { text: 'Number', type: 'class' as const },
        { text: 'Math', type: 'class' as const },
        { text: 'JSON', type: 'class' as const },
        { text: 'Date', type: 'class' as const },
        { text: 'Map', type: 'class' as const },
        { text: 'Set', type: 'class' as const },
      ];
      completions.push(
        ...jsCompletions.map((c, i) => ({
          id: `js-${i}`,
          text: c.text,
          type: c.type,
          confidence: 0.7,
        }))
      );
    }

    if (langLower === 'python') {
      const pyCompletions = [
        { text: 'print', type: 'function' as const },
        { text: 'len', type: 'function' as const },
        { text: 'range', type: 'function' as const },
        { text: 'list', type: 'class' as const },
        { text: 'dict', type: 'class' as const },
        { text: 'set', type: 'class' as const },
        { text: 'tuple', type: 'class' as const },
        { text: 'str', type: 'class' as const },
        { text: 'int', type: 'class' as const },
        { text: 'float', type: 'class' as const },
        { text: 'bool', type: 'class' as const },
      ];
      completions.push(
        ...pyCompletions.map((c, i) => ({
          id: `py-${i}`,
          text: c.text,
          type: c.type,
          confidence: 0.7,
        }))
      );
    }

    return completions;
  }

  private async callOpenAI(req: CompletionRequest): Promise<CompletionItem[]> {
    try {
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
          top_p: this.config.topP,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty,
          messages: [
            { role: 'system', content: this.systemPrompt() },
            { role: 'user', content: this.userPrompt(req) },
          ],
          stop: ['\n\n'],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const content = data.choices?.[0]?.message?.content ?? '';
      return this.parseCompletionResponse(content);
    } catch (err) {
      console.warn('OpenAI 补全失败:', err);
      return [];
    }
  }

  private async callClaude(req: CompletionRequest): Promise<CompletionItem[]> {
    try {
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
      const content = data.content?.[0]?.text ?? '';
      return this.parseCompletionResponse(content);
    } catch (err) {
      console.warn('Claude 补全失败:', err);
      return [];
    }
  }

  private async callOllama(req: CompletionRequest): Promise<CompletionItem[]> {
    try {
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
      const content = data.response ?? '';
      return this.parseCompletionResponse(content);
    } catch (err) {
      console.warn('Ollama 补全失败:', err);
      return [];
    }
  }

  private parseCompletionResponse(content: string): CompletionItem[] {
    const lines = content
      .trim()
      .split('\n')
      .filter((l) => l.trim());
    return lines.slice(0, 10).map((line, i) => {
      const text = line.replace(/^\d+\.\s*|- /, '').trim();
      return {
        id: `ai-${i}`,
        text,
        displayText: text,
        type: 'snippet',
        confidence: 0.7 - i * 0.05,
      };
    });
  }

  private systemPrompt(): string {
    return `你是 TapTap 小游戏开发助手。根据上下文补全代码。只返回补全内容，不要解释。保持代码风格一致，使用现代 ES2020+ 语法。支持 TypeScript、JavaScript、HTML、CSS、JSON、Python、C#、Lua 等语言。`;
  }

  private userPrompt(req: CompletionRequest): string {
    const { prefix, suffix, language } = req.context;
    const suffixPreview = suffix.slice(0, 200);
    return `Language: ${language}\n\n<prefix>\n${prefix.slice(-500)}\n</prefix>\n\n<suffix>\n${suffixPreview}\n</suffix>\n\n请补全光标处代码，只返回补全的代码内容:`;
  }
}

export const aiCompletionService = new AICompletionService();
