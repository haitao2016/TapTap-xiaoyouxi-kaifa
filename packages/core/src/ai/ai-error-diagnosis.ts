import { globalEventBus } from '../event-bus';
import { randomUUID } from '../utils/crypto-utils';

export type ErrorCategory =
  | 'syntax'
  | 'runtime'
  | 'network'
  | 'permission'
  | 'performance'
  | 'sdk'
  | 'memory'
  | 'security'
  | 'type'
  | 'reference'
  | 'resource'
  | 'build'
  | 'debug'
  | 'unknown';

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface ErrorContext {
  message: string;
  stack?: string;
  filePath?: string;
  line?: number;
  column?: number;
  codeSnippet?: string;
  userAction?: string;
  projectTypes?: string[];
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  timestamp?: number;
  environment?: {
    platform?: string;
    os?: string;
    browser?: string;
    engine?: string;
    sdkVersion?: string;
  };
  additionalContext?: Record<string, unknown>;
}

export interface DiagnosisSuggestion {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  rootCause: string;
  detailedCause?: string;
  fixes: FixStep[];
  confidence: number;
  references: ErrorReference[];
  latency: number;
  relatedErrors?: string[];
  preventionTips?: string[];
}

export interface FixStep {
  id: string;
  title: string;
  description: string;
  order: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime?: string;
  patch?: FixPatch;
  references?: string[];
  verificationSteps?: string[];
}

export interface FixPatch {
  filePath: string;
  searchText: string;
  replaceText: string;
  explanation?: string;
}

export interface ErrorReference {
  title: string;
  url: string;
  type: 'doc' | 'faq' | 'tutorial' | 'api' | 'community';
}

export interface ErrorRule {
  id: string;
  pattern: RegExp;
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  description: string;
  rootCause: string;
  detailedCause?: string;
  fixes: Omit<FixStep, 'id'>[];
  references: ErrorReference[];
  preventionTips?: string[];
  relatedErrors?: string[];
}

export class AIErrorDiagnosis {
  private history: DiagnosisSuggestion[] = [];
  private readonly maxHistory = 100;
  private rules: ErrorRule[] = [];

  constructor() {
    this.loadBuiltinRules();
  }

  private loadBuiltinRules(): void {
    this.rules = [
      {
        id: 'syntax-unexpected-token',
        pattern: /Unexpected token/i,
        category: 'syntax',
        severity: 'error',
        title: '语法错误：意外的标记',
        description: '代码中存在语法错误，解析器遇到了意外的标记。',
        rootCause: '代码语法不正确，可能是缺少括号、分号或其他语法元素。',
        detailedCause:
          'JavaScript/TypeScript 解析器在解析代码时遇到了不符合语法规范的标记。常见原因包括：1) 缺少闭合括号或花括号 2) 缺少分号 3) 错误的关键字使用 4) 不匹配的引号',
        fixes: [
          {
            title: '检查错误行附近的语法',
            description: '定位到错误提示的行号，检查该行及上一行的语法是否正确。',
            order: 1,
            difficulty: 'easy',
            verificationSteps: [
              '确认所有括号都正确闭合',
              '确认所有引号都正确配对',
              '确认关键字使用正确',
            ],
          },
          {
            title: '使用代码编辑器的语法检查',
            description: '使用 VS Code 等编辑器的语法高亮和错误提示功能来定位问题。',
            order: 2,
            difficulty: 'easy',
          },
        ],
        references: [
          {
            title: 'MDN - JavaScript 语法',
            url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference',
            type: 'doc',
          },
        ],
        preventionTips: [
          '使用 ESLint 等工具进行代码检查',
          '使用 TypeScript 提供类型安全',
          '定期格式化代码',
        ],
      },
      {
        id: 'syntax-expected-token',
        pattern: /Expected.*but found/i,
        category: 'syntax',
        severity: 'error',
        title: '语法错误：缺少预期的标记',
        description: '代码中缺少预期的语法标记。',
        rootCause: '语法结构不完整，缺少必要的标记。',
        fixes: [
          {
            title: '补全缺失的语法元素',
            description: '根据错误提示，补全缺失的语法元素（如括号、逗号、分号等）。',
            order: 1,
            difficulty: 'easy',
          },
        ],
        references: [],
      },
      {
        id: 'runtime-undefined',
        pattern: /Cannot read (property|properties) of undefined/i,
        category: 'runtime',
        severity: 'error',
        title: '运行时错误：访问 undefined 的属性',
        description: '试图访问 undefined 值的属性或方法。',
        rootCause: '变量或对象属性的值为 undefined，但代码试图访问其属性或调用其方法。',
        detailedCause:
          '这是最常见的 JavaScript 运行时错误之一。通常发生在：1) 变量未正确初始化 2) 异步数据尚未加载完成就被访问 3) 对象属性不存在 4) 函数返回值与预期不符',
        fixes: [
          {
            title: '添加空值检查',
            description: '在访问属性前检查对象是否为 null 或 undefined。',
            order: 1,
            difficulty: 'easy',
            patch: {
              filePath: '',
              searchText: 'obj.property',
              replaceText: 'obj?.property',
              explanation: '使用可选链操作符 ?. 安全地访问嵌套属性',
            },
            verificationSteps: ['确认添加了空值检查', '测试边界情况'],
          },
          {
            title: '检查变量初始化',
            description: '确保变量在使用前已正确初始化。',
            order: 2,
            difficulty: 'medium',
          },
          {
            title: '检查异步数据加载',
            description: '如果数据来自异步请求，确保在数据加载完成后再访问。',
            order: 3,
            difficulty: 'medium',
          },
        ],
        references: [
          {
            title: 'MDN - 可选链操作符',
            url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
            type: 'doc',
          },
        ],
        preventionTips: [
          '使用可选链操作符 ?.',
          '使用 TypeScript 严格模式',
          '初始化变量时提供默认值',
        ],
      },
      {
        id: 'runtime-null',
        pattern: /Cannot read (property|properties) of null/i,
        category: 'runtime',
        severity: 'error',
        title: '运行时错误：访问 null 的属性',
        description: '试图访问 null 值的属性或方法。',
        rootCause: '变量或对象属性的值为 null，但代码试图访问其属性或调用其方法。',
        fixes: [
          {
            title: '添加 null 检查',
            description: '在访问属性前检查对象是否为 null。',
            order: 1,
            difficulty: 'easy',
          },
        ],
        references: [],
      },
      {
        id: 'runtime-not-a-function',
        pattern: /is not a function/i,
        category: 'runtime',
        severity: 'error',
        title: '运行时错误：不是函数',
        description: '试图调用一个不是函数的值。',
        rootCause: '变量的值不是函数，但代码试图调用它。',
        detailedCause:
          '常见原因：1) 函数名拼写错误 2) 变量被重新赋值为非函数值 3) 导入的模块不存在或导出方式错误 4) this 上下文问题',
        fixes: [
          {
            title: '检查函数名拼写',
            description: '确认函数名拼写正确，包括大小写。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '检查变量类型',
            description: '使用 typeof 检查变量是否为函数类型。',
            order: 2,
            difficulty: 'easy',
            patch: {
              filePath: '',
              searchText: 'func();',
              replaceText: 'if (typeof func === "function") {\n  func();\n}',
              explanation: '添加类型检查，确保变量是函数后再调用',
            },
          },
          {
            title: '检查模块导入',
            description: '确认导入的模块和函数存在且导出方式正确。',
            order: 3,
            difficulty: 'medium',
          },
        ],
        references: [],
        preventionTips: ['使用 TypeScript 进行类型检查', '使用 ESLint 检查未定义变量'],
      },
      {
        id: 'network-cors',
        pattern: /CORS|cross-origin|Access-Control-Allow-Origin/i,
        category: 'network',
        severity: 'error',
        title: '网络错误：跨域请求被阻止',
        description: '跨域资源共享 (CORS) 策略阻止了请求。',
        rootCause: '浏览器的同源策略阻止了跨域请求，服务器未正确配置 CORS 响应头。',
        detailedCause:
          'CORS（跨域资源共享）是一种安全机制，用于限制网页从不同源的服务器请求资源。当浏览器发出跨域请求时，服务器需要返回适当的响应头来允许该请求。',
        fixes: [
          {
            title: '配置服务器 CORS 响应头',
            description: '在服务器端添加 Access-Control-Allow-Origin 等响应头。',
            order: 1,
            difficulty: 'medium',
            verificationSteps: [
              '确认服务器返回了正确的 CORS 响应头',
              '使用浏览器开发者工具检查响应头',
            ],
          },
          {
            title: '使用代理服务器',
            description: '在开发环境中使用代理服务器转发请求。',
            order: 2,
            difficulty: 'medium',
            references: ['https://vitejs.dev/config/server-options.html#server-proxy'],
          },
          {
            title: '使用 JSONP（仅限 GET 请求）',
            description: '对于简单的 GET 请求，可以考虑使用 JSONP 方式。',
            order: 3,
            difficulty: 'medium',
          },
        ],
        references: [
          {
            title: 'MDN - 跨域资源共享',
            url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS',
            type: 'doc',
          },
          {
            title: 'TapTap 开发者文档 - 网络请求',
            url: 'https://developer.taptap.cn/minigameapidoc/',
            type: 'doc',
          },
        ],
        preventionTips: ['开发阶段使用代理', '确保服务器正确配置 CORS', '使用 HTTPS'],
      },
      {
        id: 'network-fetch-failed',
        pattern: /Failed to fetch|NetworkError|net::ERR/i,
        category: 'network',
        severity: 'error',
        title: '网络错误：请求失败',
        description: '网络请求失败，无法连接到服务器。',
        rootCause: '网络连接问题或服务器不可用导致请求失败。',
        fixes: [
          {
            title: '检查网络连接',
            description: '确保设备已连接到互联网。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '检查服务器状态',
            description: '确认目标服务器是否正常运行。',
            order: 2,
            difficulty: 'medium',
          },
          {
            title: '添加请求重试机制',
            description: '为网络请求添加重试逻辑，提高稳定性。',
            order: 3,
            difficulty: 'medium',
          },
        ],
        references: [],
      },
      {
        id: 'network-timeout',
        pattern: /timeout|timed out/i,
        category: 'network',
        severity: 'warning',
        title: '网络错误：请求超时',
        description: '网络请求在规定时间内未完成。',
        rootCause: '网络延迟高或服务器响应慢导致请求超时。',
        fixes: [
          {
            title: '增加超时时间',
            description: '适当增加请求的超时时间。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '优化网络请求',
            description: '减少请求数据量，使用压缩，合并请求等。',
            order: 2,
            difficulty: 'medium',
          },
          {
            title: '添加加载状态提示',
            description: '为用户提供明确的加载状态和重试选项。',
            order: 3,
            difficulty: 'easy',
          },
        ],
        references: [],
      },
      {
        id: 'permission-denied',
        pattern: /Permission denied|not allowed|forbidden|403/i,
        category: 'permission',
        severity: 'error',
        title: '权限错误：操作被拒绝',
        description: '没有足够的权限执行该操作。',
        rootCause: '用户或应用没有执行该操作所需的权限。',
        fixes: [
          {
            title: '检查用户登录状态',
            description: '确认用户已登录且具有相应权限。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '检查 SDK 权限配置',
            description: '确认 TapTap SDK 的权限配置是否正确。',
            order: 2,
            difficulty: 'medium',
            references: ['https://developer.taptap.cn/minigameapidoc/'],
          },
        ],
        references: [
          {
            title: 'TapTap 开发者文档',
            url: 'https://developer.taptap.cn/minigameapidoc/',
            type: 'doc',
          },
        ],
      },
      {
        id: 'permission-unauthorized',
        pattern: /unauthorized|401/i,
        category: 'permission',
        severity: 'error',
        title: '权限错误：未授权',
        description: '用户未认证或认证已过期。',
        rootCause: '缺少有效的认证凭证或认证已过期。',
        fixes: [
          {
            title: '检查登录状态',
            description: '确认用户是否已登录。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '刷新认证凭证',
            description: '如果认证已过期，尝试刷新 token 或重新登录。',
            order: 2,
            difficulty: 'medium',
          },
        ],
        references: [],
      },
      {
        id: 'memory-leak',
        pattern: /memory leak|out of memory|heap limit|allocation failed/i,
        category: 'memory',
        severity: 'critical',
        title: '内存错误：内存不足或泄漏',
        description: '内存使用量过高，可能存在内存泄漏。',
        rootCause: '程序使用了过多内存，可能存在内存泄漏或资源未正确释放。',
        detailedCause:
          '内存泄漏是指程序中已动态分配的堆内存由于某种原因未释放或无法释放，造成系统内存的浪费。常见原因：1) 未清理的事件监听器 2) 未取消的定时器 3) 闭包引用 4) DOM 元素未移除 5) 缓存无限增长',
        fixes: [
          {
            title: '检查事件监听器',
            description: '确保所有事件监听器在不需要时被正确移除。',
            order: 1,
            difficulty: 'medium',
            verificationSteps: [
              '确认 addEventListener 有对应的 removeEventListener',
              '确认组件卸载时清理了监听器',
            ],
          },
          {
            title: '检查定时器',
            description: '确保所有 setTimeout 和 setInterval 在不需要时被清除。',
            order: 2,
            difficulty: 'easy',
          },
          {
            title: '使用内存分析工具',
            description: '使用 Chrome DevTools 的 Memory 面板分析内存使用情况。',
            order: 3,
            difficulty: 'hard',
            references: ['https://developer.chrome.com/docs/devtools/memory/'],
          },
        ],
        references: [
          {
            title: 'Chrome DevTools - 内存分析',
            url: 'https://developer.chrome.com/docs/devtools/memory/',
            type: 'tutorial',
          },
        ],
        preventionTips: [
          '及时清理事件监听器',
          '及时清理定时器',
          '使用 WeakMap/WeakSet',
          '组件卸载时清理资源',
        ],
      },
      {
        id: 'performance-slow-render',
        pattern: /long task|reflow|repaint|forced reflow/i,
        category: 'performance',
        severity: 'warning',
        title: '性能问题：渲染缓慢',
        description: '页面渲染性能不佳，可能导致卡顿。',
        rootCause: '频繁的重排重绘或复杂的 DOM 操作导致渲染性能下降。',
        fixes: [
          {
            title: '减少重排重绘',
            description: '批量修改 DOM，使用 documentFragment 或虚拟 DOM。',
            order: 1,
            difficulty: 'medium',
          },
          {
            title: '使用 CSS 变换',
            description: '使用 transform 和 opacity 进行动画，它们不会触发重排。',
            order: 2,
            difficulty: 'easy',
          },
          {
            title: '使用虚拟列表',
            description: '对于长列表，使用虚拟滚动只渲染可见区域。',
            order: 3,
            difficulty: 'hard',
          },
        ],
        references: [],
      },
      {
        id: 'sdk-not-initialized',
        pattern: /SDK.*not.*init|initialize|TapSDK/i,
        category: 'sdk',
        severity: 'error',
        title: 'SDK 错误：未初始化',
        description: 'TapTap SDK 未正确初始化。',
        rootCause: '在调用 SDK 功能前未进行初始化，或初始化失败。',
        fixes: [
          {
            title: '检查 SDK 初始化代码',
            description: '确保在调用 SDK 功能前已正确调用 TapSDK.init()。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '检查 Client ID',
            description: '确认使用了正确的 Client ID。',
            order: 2,
            difficulty: 'easy',
          },
          {
            title: '检查初始化时机',
            description: '确保在应用启动时就初始化 SDK。',
            order: 3,
            difficulty: 'easy',
          },
        ],
        references: [
          {
            title: 'TapTap 开发者文档 - 快速开始',
            url: 'https://developer.taptap.cn/minigameapidoc/guide/start/quickstart.html',
            type: 'doc',
          },
        ],
      },
      {
        id: 'sdk-login-required',
        pattern: /login.*required|not logged in|用户未登录/i,
        category: 'sdk',
        severity: 'warning',
        title: 'SDK 错误：需要登录',
        description: '需要用户登录才能使用该功能。',
        rootCause: '调用了需要登录才能使用的 SDK 功能，但用户尚未登录。',
        fixes: [
          {
            title: '检查登录状态',
            description: '在调用功能前检查用户是否已登录。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '引导用户登录',
            description: '如果用户未登录，引导用户进行登录。',
            order: 2,
            difficulty: 'medium',
          },
        ],
        references: [
          {
            title: 'TapTap 开发者文档 - 登录',
            url: 'https://developer.taptap.cn/minigameapidoc/api/taptap-login.html',
            type: 'api',
          },
        ],
      },
      {
        id: 'type-mismatch',
        pattern: /Type.*is not assignable to type|Argument of type.*is not assignable/i,
        category: 'type',
        severity: 'error',
        title: '类型错误：类型不匹配',
        description: 'TypeScript 类型检查失败，类型不匹配。',
        rootCause: '传入的值类型与期望的类型不匹配。',
        fixes: [
          {
            title: '检查变量类型',
            description: '确认变量的类型是否与预期一致。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '使用类型断言',
            description: '在确定类型正确的情况下，可以使用类型断言。',
            order: 2,
            difficulty: 'medium',
          },
          {
            title: '修复类型定义',
            description: '如果是类型定义有误，修复类型定义。',
            order: 3,
            difficulty: 'medium',
          },
        ],
        references: [
          {
            title: 'TypeScript 官方文档',
            url: 'https://www.typescriptlang.org/docs/',
            type: 'doc',
          },
        ],
      },
      {
        id: 'reference-not-defined',
        pattern: /is not defined|ReferenceError/i,
        category: 'reference',
        severity: 'error',
        title: '引用错误：变量未定义',
        description: '使用了未定义的变量或函数。',
        rootCause: '变量或函数未声明，或者作用域不正确。',
        fixes: [
          {
            title: '检查变量名拼写',
            description: '确认变量名拼写正确，包括大小写。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '检查变量声明',
            description: '确认变量已正确声明（var/let/const）。',
            order: 2,
            difficulty: 'easy',
          },
          {
            title: '检查导入语句',
            description: '确认导入了需要的模块和变量。',
            order: 3,
            difficulty: 'medium',
          },
        ],
        references: [],
      },
      {
        id: 'resource-not-found',
        pattern: /404|not found|ENOENT|找不到文件/i,
        category: 'resource',
        severity: 'error',
        title: '资源错误：资源未找到',
        description: '请求的资源或文件不存在。',
        rootCause: '资源路径错误或资源已被删除。',
        fixes: [
          {
            title: '检查文件路径',
            description: '确认文件路径是否正确，包括大小写。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '检查文件是否存在',
            description: '确认文件确实存在于指定位置。',
            order: 2,
            difficulty: 'easy',
          },
          {
            title: '检查导入/引用方式',
            description: '确认导入语句或资源引用的方式正确。',
            order: 3,
            difficulty: 'medium',
          },
        ],
        references: [],
      },
      {
        id: 'build-webpack',
        pattern: /Module not found|Can't resolve|webpack/i,
        category: 'build',
        severity: 'error',
        title: '构建错误：模块未找到',
        description: '构建工具无法找到指定的模块。',
        rootCause: '模块未安装、路径错误或配置问题。',
        fixes: [
          {
            title: '检查依赖是否安装',
            description: '运行 npm install 或 yarn install 安装所有依赖。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '检查导入路径',
            description: '确认导入路径是否正确。',
            order: 2,
            difficulty: 'medium',
          },
          {
            title: '检查构建配置',
            description: '确认 webpack/vite 等构建工具配置正确。',
            order: 3,
            difficulty: 'hard',
          },
        ],
        references: [],
      },
      {
        id: 'security-xss',
        pattern: /XSS|cross-site scripting|innerHTML.*danger/i,
        category: 'security',
        severity: 'warning',
        title: '安全警告：XSS 风险',
        description: '代码可能存在跨站脚本攻击风险。',
        rootCause: '直接将用户输入插入到 DOM 中，可能导致 XSS 攻击。',
        fixes: [
          {
            title: '使用 textContent 代替 innerHTML',
            description: '对于纯文本内容，使用 textContent 而不是 innerHTML。',
            order: 1,
            difficulty: 'easy',
          },
          {
            title: '对用户输入进行转义',
            description: '在插入 HTML 前对用户输入进行转义处理。',
            order: 2,
            difficulty: 'medium',
          },
          {
            title: '使用 CSP 策略',
            description: '配置内容安全策略 (CSP) 以减少 XSS 风险。',
            order: 3,
            difficulty: 'hard',
          },
        ],
        references: [
          {
            title: 'MDN - 跨站脚本攻击',
            url: 'https://developer.mozilla.org/zh-CN/docs/Glossary/Cross-site_scripting',
            type: 'doc',
          },
        ],
        preventionTips: ['永远不要相信用户输入', '对输出进行转义', '使用 CSP'],
      },
      {
        id: 'debug-breakpoint',
        pattern: /debugger|breakpoint/i,
        category: 'debug',
        severity: 'info',
        title: '调试信息：断点',
        description: '代码中包含 debugger 语句。',
        rootCause: '开发人员在代码中留下了 debugger 语句。',
        fixes: [
          {
            title: '移除 debugger 语句',
            description: '在发布代码前移除所有 debugger 语句。',
            order: 1,
            difficulty: 'easy',
          },
        ],
        references: [],
        preventionTips: ['使用 ESLint 规则禁止 debugger 语句', '代码审查时检查调试代码'],
      },
      {
        id: 'promise-unhandled',
        pattern: /UnhandledPromiseRejection|unhandled promise/i,
        category: 'runtime',
        severity: 'warning',
        title: '运行时警告：未处理的 Promise 拒绝',
        description: 'Promise 被拒绝但没有错误处理。',
        rootCause: '异步操作失败但没有 catch 处理错误。',
        fixes: [
          {
            title: '添加 catch 处理',
            description: '为所有 Promise 添加 .catch() 或使用 try-catch。',
            order: 1,
            difficulty: 'easy',
            patch: {
              filePath: '',
              searchText: 'promise.then(result => {})',
              replaceText:
                'promise\n  .then(result => {})\n  .catch(error => console.error(error));',
              explanation: '添加错误处理，避免未处理的 Promise 拒绝',
            },
          },
          {
            title: '使用 async/await 配合 try-catch',
            description: '使用 async/await 语法时，用 try-catch 包裹可能失败的操作。',
            order: 2,
            difficulty: 'easy',
          },
        ],
        references: [],
        preventionTips: ['始终处理 Promise 错误', '添加全局 unhandledrejection 监听器'],
      },
    ];
  }

  async diagnose(ctx: ErrorContext): Promise<DiagnosisSuggestion> {
    const start = Date.now();
    const id = randomUUID();
    const timestamp = ctx.timestamp ?? Date.now();

    const suggestion: DiagnosisSuggestion = {
      id,
      category: ctx.category ?? 'unknown',
      severity: ctx.severity ?? 'error',
      rootCause: '',
      detailedCause: '',
      fixes: [],
      confidence: 0,
      references: [],
      latency: 0,
    };

    try {
      const analysis = await this.analyze(ctx);
      suggestion.category = analysis.category;
      suggestion.severity = analysis.severity;
      suggestion.rootCause = analysis.rootCause;
      suggestion.detailedCause = analysis.detailedCause;
      suggestion.fixes = analysis.fixes.map((f, i) => ({ ...f, id: `${id}-fix-${i + 1}` }));
      suggestion.confidence = analysis.confidence;
      suggestion.references = analysis.references;
      suggestion.relatedErrors = analysis.relatedErrors;
      suggestion.preventionTips = analysis.preventionTips;
    } catch (err) {
      suggestion.rootCause = `诊断失败：${err instanceof Error ? err.message : String(err)}`;
      suggestion.confidence = 0;
    } finally {
      suggestion.latency = Date.now() - start;
    }

    this.history.unshift({ ...suggestion, latency: Date.now() - start });
    if (this.history.length > this.maxHistory) this.history.pop();

    globalEventBus.emit({ type: 'ai:diagnosis', payload: suggestion });
    return suggestion;
  }

  getHistory(): DiagnosisSuggestion[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  getHistoryByCategory(category: ErrorCategory): DiagnosisSuggestion[] {
    return this.history.filter((h) => h.category === category);
  }

  getHistoryBySeverity(severity: ErrorSeverity): DiagnosisSuggestion[] {
    return this.history.filter((h) => h.severity === severity);
  }

  getStatistics(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
  } {
    const byCategory = {} as Record<ErrorCategory, number>;
    const bySeverity = {} as Record<ErrorSeverity, number>;

    for (const h of this.history) {
      byCategory[h.category] = (byCategory[h.category] ?? 0) + 1;
      bySeverity[h.severity] = (bySeverity[h.severity] ?? 0) + 1;
    }

    return {
      total: this.history.length,
      byCategory,
      bySeverity,
    };
  }

  getRules(): ErrorRule[] {
    return [...this.rules];
  }

  addRule(rule: ErrorRule): void {
    this.rules.push(rule);
  }

  removeRule(id: string): boolean {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  applyPatch(patch: FixPatch, fileContent: string): string | null {
    const idx = fileContent.indexOf(patch.searchText);
    if (idx === -1) return null;
    return (
      fileContent.slice(0, idx) +
      patch.replaceText +
      fileContent.slice(idx + patch.searchText.length)
    );
  }

  async batchDiagnose(errors: ErrorContext[]): Promise<DiagnosisSuggestion[]> {
    const results: DiagnosisSuggestion[] = [];
    for (const error of errors) {
      results.push(await this.diagnose(error));
    }
    return results;
  }

  private async analyze(ctx: ErrorContext): Promise<{
    category: ErrorCategory;
    severity: ErrorSeverity;
    rootCause: string;
    detailedCause?: string;
    fixes: Omit<FixStep, 'id'>[];
    confidence: number;
    references: ErrorReference[];
    relatedErrors?: string[];
    preventionTips?: string[];
  }> {
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

    const matchedRule = this.matchRule(ctx.message);

    if (matchedRule) {
      return {
        category: matchedRule.category,
        severity: matchedRule.severity,
        rootCause: matchedRule.rootCause,
        detailedCause: matchedRule.detailedCause,
        fixes: matchedRule.fixes.map((f) => ({
          ...f,
          ...(f.patch && ctx.filePath ? { patch: { ...f.patch, filePath: ctx.filePath } } : {}),
        })),
        confidence: 0.85,
        references: matchedRule.references,
        relatedErrors: matchedRule.relatedErrors,
        preventionTips: matchedRule.preventionTips,
      };
    }

    const category = this.classify(ctx);
    const severity = this.determineSeverity(ctx, category);
    const fixes = this.generateFixes(ctx, category);

    return {
      category,
      severity,
      rootCause: this.generateRootCause(ctx, category),
      detailedCause: this.generateDetailedCause(ctx, category),
      fixes,
      confidence: 0.6,
      references: this.generateReferences(ctx, category),
      preventionTips: this.generatePreventionTips(category),
    };
  }

  private matchRule(message: string): ErrorRule | null {
    for (const rule of this.rules) {
      if (rule.pattern.test(message)) {
        return rule;
      }
    }
    return null;
  }

  private classify(ctx: ErrorContext): ErrorCategory {
    const m = ctx.message.toLowerCase();
    const s = ctx.stack?.toLowerCase() ?? '';
    const combined = m + ' ' + s;

    if (/syntax|unexpected|expected|parse error|syntaxerror/i.test(combined)) return 'syntax';
    if (/network|fetch|request|cors|timeout|xmlhttprequest|ajax/i.test(combined)) return 'network';
    if (/permission|denied|forbidden|unauthorized|403|401/i.test(combined)) return 'permission';
    if (/memory|leak|heap|out of memory|allocation failed/i.test(combined)) return 'memory';
    if (/performance|slow|lag|long task|reflow|repaint/i.test(combined)) return 'performance';
    if (/taptap|sdk|tapsdk|tdsdk/i.test(combined)) return 'sdk';
    if (/type|assignable|typescript|ts23/i.test(combined)) return 'type';
    if (/not defined|referenceerror|is not defined/i.test(combined)) return 'reference';
    if (/not found|404|enoent|找不到|资源/i.test(combined)) return 'resource';
    if (/webpack|vite|rollup|module not found|can't resolve|build|编译/i.test(combined))
      return 'build';
    if (/xss|security|vulnerability|injection/i.test(combined)) return 'security';
    if (/debug|debugger|breakpoint/i.test(combined)) return 'debug';
    if (/cannot|undefined|null|nan|typeerror|rangeerror/i.test(combined)) return 'runtime';
    return 'unknown';
  }

  private determineSeverity(ctx: ErrorContext, category: ErrorCategory): ErrorSeverity {
    if (ctx.severity) return ctx.severity;

    const m = ctx.message.toLowerCase();

    if (/critical|fatal|crash|oom|out of memory/i.test(m)) return 'critical';
    if (category === 'syntax' || category === 'runtime') return 'error';
    if (category === 'network' || category === 'sdk') return 'error';
    if (category === 'performance' || category === 'memory') return 'warning';
    if (category === 'debug') return 'info';
    if (category === 'unknown') return 'warning';

    return 'error';
  }

  private generateRootCause(ctx: ErrorContext, category: ErrorCategory): string {
    const location = ctx.filePath
      ? `${ctx.filePath}${ctx.line ? `:${ctx.line}` : ''}${ctx.column ? `:${ctx.column}` : ''}`
      : '未知位置';

    const causes: Record<ErrorCategory, string> = {
      syntax: `语法错误（${location}）：${ctx.message}`,
      runtime: `运行时错误（${location}）：${ctx.message}`,
      network: `网络错误：${ctx.message}`,
      permission: `权限错误：${ctx.message}`,
      performance: `性能问题：${ctx.message}`,
      sdk: `SDK 错误：${ctx.message}`,
      memory: `内存错误：${ctx.message}`,
      security: `安全问题：${ctx.message}`,
      type: `类型错误：${ctx.message}`,
      reference: `引用错误：${ctx.message}`,
      resource: `资源错误：${ctx.message}`,
      build: `构建错误：${ctx.message}`,
      debug: `调试信息：${ctx.message}`,
      unknown: `未知错误（${location}）：${ctx.message}`,
    };

    return causes[category];
  }

  private generateDetailedCause(ctx: ErrorContext, category: ErrorCategory): string {
    const details: Record<ErrorCategory, string> = {
      syntax:
        '代码中存在语法错误，导致解析器无法正确解析。常见原因包括：缺少括号、引号不匹配、关键字拼写错误等。',
      runtime:
        '代码在运行时发生错误，通常是由于变量值不符合预期、空值访问或函数调用方式不正确导致的。',
      network: '网络请求失败，可能是由于网络连接问题、服务器不可用、跨域限制或请求超时等原因导致。',
      permission: '操作被拒绝，可能是由于用户未登录、权限不足或认证过期等原因导致。',
      performance:
        '代码执行性能不佳，可能导致页面卡顿或响应缓慢。常见原因包括：频繁的 DOM 操作、内存泄漏、复杂计算等。',
      sdk: 'TapTap SDK 使用过程中出现错误，请检查 SDK 初始化、调用时机和参数是否正确。',
      memory: '内存使用异常，可能存在内存泄漏或资源未正确释放的问题。',
      security: '代码可能存在安全隐患，需要注意数据验证、输入转义和权限控制。',
      type: 'TypeScript 类型检查失败，传入的值类型与期望的类型不匹配。',
      reference: '使用了未定义的变量或函数，请检查变量是否已声明或是否正确导入。',
      resource: '请求的资源或文件不存在，请检查路径是否正确。',
      build: '构建过程中出现错误，可能是依赖缺失、配置错误或代码语法问题导致。',
      debug: '代码中包含调试相关的代码，发布前需要清理。',
      unknown: '无法确定错误的具体原因，需要进一步分析。',
    };

    return details[category];
  }

  private generateFixes(ctx: ErrorContext, category: ErrorCategory): Omit<FixStep, 'id'>[] {
    const fixes: Omit<FixStep, 'id'>[] = [];

    const baseFixes: Record<ErrorCategory, Omit<FixStep, 'id'>[]> = {
      syntax: [
        {
          title: '检查错误位置的语法',
          description: `定位到 ${ctx.filePath ?? '文件'} 第 ${ctx.line ?? '?'} 行附近，检查语法是否正确。`,
          order: 1,
          difficulty: 'easy',
          verificationSteps: ['确认所有括号正确闭合', '确认所有引号正确配对', '确认关键字使用正确'],
        },
        {
          title: '使用编辑器的语法检查',
          description: '使用 VS Code 等编辑器的语法高亮和错误提示功能来定位问题。',
          order: 2,
          difficulty: 'easy',
        },
      ],
      runtime: [
        {
          title: '检查变量值',
          description: '使用 console.log 或调试器检查相关变量的值是否符合预期。',
          order: 1,
          difficulty: 'easy',
        },
        {
          title: '添加空值检查',
          description: '在访问对象属性前，添加 null/undefined 检查。',
          order: 2,
          difficulty: 'easy',
        },
        {
          title: '查看错误堆栈',
          description: '仔细查看错误堆栈信息，定位错误发生的具体位置。',
          order: 3,
          difficulty: 'medium',
        },
      ],
      network: [
        {
          title: '检查网络连接',
          description: '确保设备已连接到互联网，网络状况良好。',
          order: 1,
          difficulty: 'easy',
        },
        {
          title: '检查请求地址',
          description: '确认请求的 URL 地址正确，服务器正常运行。',
          order: 2,
          difficulty: 'easy',
        },
        {
          title: '检查 CORS 配置',
          description: '确认服务器已正确配置 CORS 响应头。',
          order: 3,
          difficulty: 'medium',
          references: ['https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS'],
        },
      ],
      permission: [
        {
          title: '检查用户登录状态',
          description: '确认用户已登录并且具有相应的权限。',
          order: 1,
          difficulty: 'easy',
        },
        {
          title: '检查 SDK 权限配置',
          description: '确认 TapTap SDK 的权限配置是否正确。',
          order: 2,
          difficulty: 'medium',
          references: ['https://developer.taptap.cn/minigameapidoc/'],
        },
      ],
      performance: [
        {
          title: '使用性能分析工具',
          description: '使用 Chrome DevTools 的 Performance 面板分析性能瓶颈。',
          order: 1,
          difficulty: 'medium',
          references: ['https://developer.chrome.com/docs/devtools/performance/'],
        },
        {
          title: '优化 DOM 操作',
          description: '减少不必要的 DOM 操作，使用文档片段批量修改。',
          order: 2,
          difficulty: 'medium',
        },
      ],
      sdk: [
        {
          title: '检查 SDK 初始化',
          description: '确认 TapSDK 是否已正确初始化，Client ID 是否正确。',
          order: 1,
          difficulty: 'easy',
          references: ['https://developer.taptap.cn/minigameapidoc/guide/start/quickstart.html'],
        },
        {
          title: '查看官方文档',
          description: '查阅 TapTap 开发者文档，确认 API 的正确使用方式。',
          order: 2,
          difficulty: 'medium',
          references: ['https://developer.taptap.cn/minigameapidoc/'],
        },
      ],
      memory: [
        {
          title: '检查事件监听器',
          description: '确保所有事件监听器在不需要时被正确移除。',
          order: 1,
          difficulty: 'medium',
        },
        {
          title: '检查定时器',
          description: '确保所有定时器在不需要时被清除。',
          order: 2,
          difficulty: 'easy',
        },
        {
          title: '使用内存分析工具',
          description: '使用 Chrome DevTools 的 Memory 面板分析内存使用情况。',
          order: 3,
          difficulty: 'hard',
          references: ['https://developer.chrome.com/docs/devtools/memory/'],
        },
      ],
      security: [
        {
          title: '验证用户输入',
          description: '对所有用户输入进行验证和转义。',
          order: 1,
          difficulty: 'medium',
        },
        {
          title: '审查安全代码',
          description: '请安全专家审查相关代码。',
          order: 2,
          difficulty: 'hard',
        },
      ],
      type: [
        {
          title: '检查类型定义',
          description: '确认变量和函数的类型定义是否正确。',
          order: 1,
          difficulty: 'easy',
        },
        {
          title: '检查类型导入',
          description: '确认是否正确导入了所需的类型。',
          order: 2,
          difficulty: 'easy',
        },
      ],
      reference: [
        {
          title: '检查变量名拼写',
          description: '确认变量名或函数名的拼写是否正确。',
          order: 1,
          difficulty: 'easy',
        },
        {
          title: '检查变量声明',
          description: '确认变量或函数是否已正确声明。',
          order: 2,
          difficulty: 'easy',
        },
        {
          title: '检查模块导入',
          description: '确认是否正确导入了所需的模块。',
          order: 3,
          difficulty: 'medium',
        },
      ],
      resource: [
        {
          title: '检查文件路径',
          description: '确认文件或资源的路径是否正确。',
          order: 1,
          difficulty: 'easy',
        },
        {
          title: '检查文件是否存在',
          description: '确认文件或资源确实存在。',
          order: 2,
          difficulty: 'easy',
        },
      ],
      build: [
        {
          title: '检查依赖安装',
          description: '运行 npm install 确保所有依赖都已安装。',
          order: 1,
          difficulty: 'easy',
        },
        {
          title: '检查构建配置',
          description: '确认构建配置文件（如 vite.config.ts、webpack.config.js）是否正确。',
          order: 2,
          difficulty: 'medium',
        },
      ],
      debug: [
        {
          title: '移除调试代码',
          description: '在发布前移除所有调试代码（如 debugger、console.log 等）。',
          order: 1,
          difficulty: 'easy',
        },
      ],
      unknown: [
        {
          title: '查看详细错误信息',
          description: '仔细查看错误信息和堆栈跟踪，尝试理解错误的原因。',
          order: 1,
          difficulty: 'medium',
        },
        {
          title: '搜索解决方案',
          description: '使用错误信息在搜索引擎或社区中搜索解决方案。',
          order: 2,
          difficulty: 'medium',
        },
        {
          title: '查看相关文档',
          description: '查阅相关技术文档，了解正确的使用方式。',
          order: 3,
          difficulty: 'medium',
        },
      ],
    };

    fixes.push(...baseFixes[category]);

    if (ctx.codeSnippet) {
      fixes.push({
        title: '检查相关代码',
        description: '根据代码片段检查具体的问题所在。',
        order: fixes.length + 1,
        difficulty: 'medium',
      });
    }

    return fixes;
  }

  private generateReferences(ctx: ErrorContext, category: ErrorCategory): ErrorReference[] {
    const refs: ErrorReference[] = [];

    if (category === 'sdk') {
      refs.push({
        title: 'TapTap 开发者文档',
        url: 'https://developer.taptap.cn/minigameapidoc/',
        type: 'doc',
      });
    }

    if (category === 'network') {
      refs.push({
        title: 'MDN - 网络请求',
        url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP',
        type: 'doc',
      });
    }

    if (category === 'syntax' || category === 'runtime') {
      refs.push({
        title: 'MDN - JavaScript 参考',
        url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference',
        type: 'doc',
      });
    }

    return refs;
  }

  private generatePreventionTips(category: ErrorCategory): string[] {
    const tips: Record<ErrorCategory, string[]> = {
      syntax: [
        '使用 ESLint 进行代码检查',
        '使用 TypeScript 提供类型安全',
        '使用代码格式化工具',
        '定期代码审查',
      ],
      runtime: [
        '添加充分的空值检查',
        '使用 TypeScript 严格模式',
        '编写单元测试',
        '使用可选链操作符',
      ],
      network: [
        '添加请求重试机制',
        '实现请求超时处理',
        '添加错误提示和加载状态',
        '使用缓存减少请求',
      ],
      permission: ['检查登录状态后再操作', '提供清晰的权限说明', '实现自动重试登录'],
      performance: ['使用虚拟列表', '图片懒加载', '使用节流防抖', '避免频繁的重排重绘'],
      sdk: ['仔细阅读官方文档', '按正确顺序初始化 SDK', '处理 SDK 错误回调'],
      memory: [
        '及时清理事件监听器',
        '及时清理定时器',
        '使用 WeakMap/WeakSet',
        '组件卸载时清理资源',
      ],
      security: ['永远不要相信用户输入', '对输出进行转义', '使用 CSP 策略', '定期更新依赖'],
      type: ['启用 TypeScript 严格模式', '避免使用 any 类型', '使用类型守卫'],
      reference: ['使用 ESLint 检查未定义变量', '保持一致的命名规范'],
      resource: ['使用静态资源检查', '添加资源加载失败的降级处理'],
      build: ['定期更新依赖', '保持构建配置简洁', '使用 CI/CD 自动构建'],
      debug: ['使用 ESLint 禁止调试代码', '代码审查时检查调试代码'],
      unknown: ['添加详细的错误日志', '建立错误监控系统', '持续积累错误处理经验'],
    };

    return tips[category] ?? [];
  }
}

export const aiErrorDiagnosis = new AIErrorDiagnosis();
