import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type CodeGenAction =
  | 'generate'
  | 'refactor'
  | 'comment'
  | 'test'
  | 'document'
  | 'explain'
  | 'optimize'
  | 'translate'
  | 'fix-bug';

export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'json'
  | 'python'
  | 'csharp'
  | 'lua';

export interface CodeGenTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  language: CodeLanguage;
  prompt: string;
  tags: string[];
}

export interface CodeGenRequest {
  id: string;
  action: CodeGenAction;
  prompt: string;
  fileContent?: string;
  language?: CodeLanguage;
  filePath?: string;
  selection?: { start: number; end: number };
  context?: { filePath: string; content: string }[];
  templateId?: string;
  projectTypes?: string[];
  options?: {
    includeExplanation?: boolean;
    includeComments?: boolean;
    style?: 'functional' | 'class' | 'arrow';
    framework?: string;
  };
}

export interface CodeDiff {
  type: 'insert' | 'delete' | 'replace';
  range?: { start: number; end: number };
  content: string;
}

export interface CodeGenResult {
  code: string;
  diffs?: CodeDiff[];
  explanation?: string;
  suggestions?: CodeGenSuggestion[];
  language?: CodeLanguage;
}

export interface CodeGenSuggestion {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'best-practice';
}

const TEMPLATES: CodeGenTemplate[] = [
  {
    id: 'taptap-login',
    name: 'TapTap 登录模块',
    description: '生成 TapSDK 登录功能封装，包含初始化、登录、登出、获取用户信息等',
    category: 'TapSDK',
    language: 'typescript',
    prompt: '生成 TapTap 登录模块',
    tags: ['taptap', 'login', 'sdk'],
  },
  {
    id: 'taptap-payment',
    name: 'TapTap 支付模块',
    description: '生成 TapSDK 支付功能封装，包含商品查询、支付、订单查询等',
    category: 'TapSDK',
    language: 'typescript',
    prompt: '生成 TapTap 支付模块',
    tags: ['taptap', 'payment', 'sdk'],
  },
  {
    id: 'taptap-achievement',
    name: 'TapTap 成就模块',
    description: '生成 TapSDK 成就功能封装，包含成就解锁、进度更新等',
    category: 'TapSDK',
    language: 'typescript',
    prompt: '生成 TapTap 成就模块',
    tags: ['taptap', 'achievement', 'sdk'],
  },
  {
    id: 'taptap-leaderboard',
    name: 'TapTap 排行榜模块',
    description: '生成 TapSDK 排行榜功能封装，包含分数提交、排行榜查询等',
    category: 'TapSDK',
    language: 'typescript',
    prompt: '生成 TapTap 排行榜模块',
    tags: ['taptap', 'leaderboard', 'sdk'],
  },
  {
    id: 'http-request',
    name: 'HTTP 请求工具',
    description: '生成完整的 HTTP 请求封装，支持拦截器、超时、错误处理等',
    category: '工具类',
    language: 'typescript',
    prompt: '生成 HTTP 请求工具类',
    tags: ['http', 'request', 'network'],
  },
  {
    id: 'local-storage',
    name: '本地存储工具',
    description: '生成带有命名空间、过期时间、类型安全的本地存储封装',
    category: '工具类',
    language: 'typescript',
    prompt: '生成本地存储工具类',
    tags: ['storage', 'cache', 'local'],
  },
  {
    id: 'event-emitter',
    name: '事件发射器',
    description: '生成类型安全的事件发射器，支持订阅、取消订阅、一次性监听等',
    category: '工具类',
    language: 'typescript',
    prompt: '生成事件发射器类',
    tags: ['event', 'emitter', 'observer'],
  },
  {
    id: 'debounce-throttle',
    name: '防抖节流工具',
    description: '生成防抖和节流函数，支持立即执行、取消、刷新等功能',
    category: '工具函数',
    language: 'typescript',
    prompt: '生成防抖节流工具函数',
    tags: ['debounce', 'throttle', 'performance'],
  },
  {
    id: 'date-utils',
    name: '日期工具函数',
    description: '生成常用的日期处理函数，包含格式化、解析、计算等',
    category: '工具函数',
    language: 'typescript',
    prompt: '生成日期工具函数',
    tags: ['date', 'time', 'utils'],
  },
  {
    id: 'validation',
    name: '数据验证函数',
    description: '生成常用的数据验证函数，包含手机号、邮箱、身份证等',
    category: '工具函数',
    language: 'typescript',
    prompt: '生成数据验证函数',
    tags: ['validation', 'form', 'validate'],
  },
  {
    id: 'react-component',
    name: 'React 组件模板',
    description: '生成标准的 React 函数组件，包含状态管理、副作用处理等',
    category: '前端框架',
    language: 'typescript',
    prompt: '生成 React 组件',
    tags: ['react', 'component', 'hooks'],
  },
  {
    id: 'vue-component',
    name: 'Vue 组件模板',
    description: '生成标准的 Vue 3 单文件组件，包含响应式数据、计算属性等',
    category: '前端框架',
    language: 'html',
    prompt: '生成 Vue 组件',
    tags: ['vue', 'component', 'composition'],
  },
  {
    id: 'game-scene',
    name: '游戏场景管理器',
    description: '生成游戏场景管理器，支持场景切换、加载、生命周期管理等',
    category: '游戏开发',
    language: 'typescript',
    prompt: '生成游戏场景管理器',
    tags: ['game', 'scene', 'manager'],
  },
  {
    id: 'csharp-monobehaviour',
    name: 'Unity MonoBehaviour 基类',
    description: '生成 Unity MonoBehaviour 基类，包含常用的日志、对象销毁等方法',
    category: 'Unity',
    language: 'csharp',
    prompt: '生成 Unity MonoBehaviour 基类',
    tags: ['unity', 'csharp', 'monobehaviour'],
  },
  {
    id: 'lua-ccs-layer',
    name: 'Cocos Lua 层基类',
    description: '生成 Cocos Lua 层基类，包含触摸事件、生命周期、资源管理等',
    category: 'Cocos',
    language: 'lua',
    prompt: '生成 Cocos Lua 层基类',
    tags: ['cocos', 'lua', 'layer'],
  },
];

export class AICodeGenService {
  private templates: CodeGenTemplate[] = TEMPLATES;

  constructor() {}

  getTemplates(category?: string): CodeGenTemplate[] {
    if (category) {
      return this.templates.filter((t) => t.category === category);
    }
    return [...this.templates];
  }

  getTemplateById(id: string): CodeGenTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  getTemplateCategories(): string[] {
    const categories = new Set(this.templates.map((t) => t.category));
    return Array.from(categories);
  }

  async generateCode(req: CodeGenRequest): Promise<CodeGenResult> {
    const startTime = Date.now();

    globalEventBus.emit({
      type: 'ai:codegen:start',
      payload: { id: req.id, action: req.action },
    });

    try {
      let code = '';

      if (req.templateId) {
        const template = this.getTemplateById(req.templateId);
        if (template) {
          code = this.generateFromTemplate(template, req);
        }
      }

      if (!code) {
        code = this.generateByAction(req);
      }

      const suggestions = this.generateSuggestions(req, code);
      const lineCount = code.split('\n').length;

      // refactor action: 计算 diffs
      let diffs: CodeDiff[] | undefined;
      if (req.action === 'refactor' && req.fileContent) {
        const originalLines = req.fileContent.split('\n');
        const newLines = code.split('\n');
        diffs = [];
        const maxLen = Math.max(originalLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
          if (originalLines[i] !== newLines[i]) {
            diffs.push({
              oldText: originalLines[i] ?? '',
              newText: newLines[i] ?? '',
              startLine: i,
              endLine: i,
            });
          }
        }
        if (diffs.length === 0) {
          // 确保至少有 1 个 diff（表示修改意图）
          diffs.push({
            oldText: req.fileContent,
            newText: code,
            startLine: 0,
            endLine: 0,
          });
        }
      }

      const result: CodeGenResult & { diffs?: CodeDiff[] } = {
        code,
        language: req.language,
        suggestions,
        explanation: this.generateExplanation(req, code),
        ...(diffs ? { diffs } : {}),
      };

      globalEventBus.emit({
        type: 'ai:codegen:complete',
        payload: {
          id: req.id,
          duration: Date.now() - startTime,
          lineCount,
        },
      });

      return result;
    } catch (error) {
      globalEventBus.emit({
        type: 'ai:codegen:error',
        payload: { id: req.id, error: this.formatError(error) },
      });
      throw error;
    }
  }

  private generateByAction(req: CodeGenRequest): string {
    switch (req.action) {
      case 'generate':
        return this.generateCodeFromPrompt(req);
      case 'refactor':
        return this.refactorCode(req);
      case 'comment':
        return this.addComments(req);
      case 'test':
        return this.generateTests(req);
      case 'document':
        return this.generateDocumentation(req);
      case 'explain':
        return this.explainCode(req);
      case 'optimize':
        return this.optimizeCode(req);
      case 'translate':
        return this.translateCode(req);
      case 'fix-bug':
        return this.fixBug(req);
      default:
        throw new Error(`不支持的 action: ${req.action}`);
    }
  }

  private generateFromTemplate(template: CodeGenTemplate, req: CodeGenRequest): string {
    switch (template.id) {
      case 'taptap-login':
        return this.generateTapTapLogin();
      case 'taptap-payment':
        return this.generateTapTapPayment();
      case 'taptap-achievement':
        return this.generateTapTapAchievement();
      case 'taptap-leaderboard':
        return this.generateTapTapLeaderboard();
      case 'http-request':
        return this.generateHttpRequest();
      case 'local-storage':
        return this.generateLocalStorage();
      case 'event-emitter':
        return this.generateEventEmitter();
      case 'debounce-throttle':
        return this.generateDebounceThrottle();
      case 'date-utils':
        return this.generateDateUtils();
      case 'validation':
        return this.generateValidation();
      case 'react-component':
        return this.generateReactComponent(req);
      case 'vue-component':
        return this.generateVueComponent(req);
      case 'game-scene':
        return this.generateGameScene();
      case 'csharp-monobehaviour':
        return this.generateUnityMonoBehaviour();
      case 'lua-ccs-layer':
        return this.generateCocosLuaLayer();
      default:
        return `// ${template.name}\n// ${template.description}\n// TODO: 实现 ${template.name}`;
    }
  }

  private generateTapTapLogin(): string {
    const lines: string[] = [];
    lines.push("import { TapSDK } from '@taptap/sdk';");
    lines.push('');
    lines.push('export class TapLoginManager {');
    lines.push('  private static instance: TapLoginManager;');
    lines.push('  private isInitialized = false;');
    lines.push('  private currentUser: TapSDK.User | null = null;');
    lines.push('');
    lines.push('  static getInstance(): TapLoginManager {');
    lines.push('    if (!TapLoginManager.instance) {');
    lines.push('      TapLoginManager.instance = new TapLoginManager();');
    lines.push('    }');
    lines.push('    return TapLoginManager.instance;');
    lines.push('  }');
    lines.push('');
    lines.push('  async init(clientId: string): Promise<void> {');
    lines.push('    if (this.isInitialized) return;');
    lines.push('    try {');
    lines.push('      await TapSDK.init({ clientId });');
    lines.push('      this.isInitialized = true;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('TapSDK 初始化失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  async login(): Promise<TapSDK.User> {');
    lines.push('    if (!this.isInitialized) {');
    lines.push("      throw new Error('TapSDK 未初始化');");
    lines.push('    }');
    lines.push('    try {');
    lines.push('      const user = await TapSDK.login();');
    lines.push('      this.currentUser = user;');
    lines.push('      return user;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('登录失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  async logout(): Promise<void> {');
    lines.push('    try {');
    lines.push('      await TapSDK.logout();');
    lines.push('      this.currentUser = null;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('登出失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  getCurrentUser(): TapSDK.User | null {');
    lines.push('    return this.currentUser;');
    lines.push('  }');
    lines.push('');
    lines.push('  isLoggedIn(): boolean {');
    lines.push('    return this.currentUser !== null;');
    lines.push('  }');
    lines.push('');
    lines.push('  async getUserProfile(): Promise<TapSDK.UserProfile | null> {');
    lines.push('    if (!this.isLoggedIn()) return null;');
    lines.push('    try {');
    lines.push('      return await TapSDK.getUserProfile();');
    lines.push('    } catch (error) {');
    lines.push("      console.error('获取用户信息失败:', error);");
    lines.push('      return null;');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('export const tapLoginManager = TapLoginManager.getInstance();');
    return lines.join('\n');
  }

  private generateTapTapPayment(): string {
    const lines: string[] = [];
    lines.push("import { TapSDK } from '@taptap/sdk';");
    lines.push('');
    lines.push('export interface Product {');
    lines.push('  productId: string;');
    lines.push('  name: string;');
    lines.push('  description: string;');
    lines.push('  price: number;');
    lines.push('  currency: string;');
    lines.push('}');
    lines.push('');
    lines.push('export interface PaymentResult {');
    lines.push('  success: boolean;');
    lines.push('  orderId: string;');
    lines.push('  productId: string;');
    lines.push('  transactionId?: string;');
    lines.push('  errorMessage?: string;');
    lines.push('}');
    lines.push('');
    lines.push('export class TapPaymentManager {');
    lines.push('  private static instance: TapPaymentManager;');
    lines.push('  private products: Product[] = [];');
    lines.push('  private isInitialized = false;');
    lines.push('');
    lines.push('  static getInstance(): TapPaymentManager {');
    lines.push('    if (!TapPaymentManager.instance) {');
    lines.push('      TapPaymentManager.instance = new TapPaymentManager();');
    lines.push('    }');
    lines.push('    return TapPaymentManager.instance;');
    lines.push('  }');
    lines.push('');
    lines.push('  async init(): Promise<void> {');
    lines.push('    if (this.isInitialized) return;');
    lines.push('    try {');
    lines.push('      await TapSDK.Payment.init();');
    lines.push('      this.isInitialized = true;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('支付模块初始化失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  async queryProducts(productIds: string[]): Promise<Product[]> {');
    lines.push('    if (!this.isInitialized) {');
    lines.push("      throw new Error('支付模块未初始化');");
    lines.push('    }');
    lines.push('    try {');
    lines.push('      this.products = await TapSDK.Payment.queryProducts(productIds);');
    lines.push('      return this.products;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('查询商品失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  async pay(productId: string, serverId?: string, extra?: string): Promise<PaymentResult> {'
    );
    lines.push('    if (!this.isInitialized) {');
    lines.push("      throw new Error('支付模块未初始化');");
    lines.push('    }');
    lines.push('    try {');
    lines.push('      const result = await TapSDK.Payment.pay({ productId, serverId, extra });');
    lines.push(
      '      return { success: true, orderId: result.orderId, productId, transactionId: result.transactionId };'
    );
    lines.push('    } catch (error) {');
    lines.push("      console.error('支付失败:', error);");
    lines.push(
      "      return { success: false, orderId: '', productId, errorMessage: error instanceof Error ? error.message : String(error) };"
    );
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('export const tapPaymentManager = TapPaymentManager.getInstance();');
    return lines.join('\n');
  }

  private generateTapTapAchievement(): string {
    const lines: string[] = [];
    lines.push("import { TapSDK } from '@taptap/sdk';");
    lines.push('');
    lines.push('export interface Achievement {');
    lines.push('  id: string;');
    lines.push('  name: string;');
    lines.push('  description: string;');
    lines.push('  iconUrl: string;');
    lines.push('  isUnlocked: boolean;');
    lines.push('  unlockedAt?: number;');
    lines.push('}');
    lines.push('');
    lines.push('export class TapAchievementManager {');
    lines.push('  private static instance: TapAchievementManager;');
    lines.push('  private achievements: Achievement[] = [];');
    lines.push('  private isInitialized = false;');
    lines.push('');
    lines.push('  static getInstance(): TapAchievementManager {');
    lines.push('    if (!TapAchievementManager.instance) {');
    lines.push('      TapAchievementManager.instance = new TapAchievementManager();');
    lines.push('    }');
    lines.push('    return TapAchievementManager.instance;');
    lines.push('  }');
    lines.push('');
    lines.push('  async init(): Promise<void> {');
    lines.push('    if (this.isInitialized) return;');
    lines.push('    try {');
    lines.push('      await TapSDK.Achievement.init();');
    lines.push('      this.isInitialized = true;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('成就模块初始化失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  async unlock(achievementId: string): Promise<void> {');
    lines.push('    if (!this.isInitialized) {');
    lines.push("      throw new Error('成就模块未初始化');");
    lines.push('    }');
    lines.push('    try {');
    lines.push('      await TapSDK.Achievement.unlock(achievementId);');
    lines.push('      const achievement = this.achievements.find((a) => a.id === achievementId);');
    lines.push('      if (achievement) {');
    lines.push('        achievement.isUnlocked = true;');
    lines.push('        achievement.unlockedAt = Date.now();');
    lines.push('      }');
    lines.push('    } catch (error) {');
    lines.push("      console.error('解锁成就失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  async getAchievements(): Promise<Achievement[]> {');
    lines.push('    if (!this.isInitialized) {');
    lines.push("      throw new Error('成就模块未初始化');");
    lines.push('    }');
    lines.push('    try {');
    lines.push('      this.achievements = await TapSDK.Achievement.getAchievements();');
    lines.push('      return this.achievements;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('获取成就列表失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('export const tapAchievementManager = TapAchievementManager.getInstance();');
    return lines.join('\n');
  }

  private generateTapTapLeaderboard(): string {
    const lines: string[] = [];
    lines.push("import { TapSDK } from '@taptap/sdk';");
    lines.push('');
    lines.push('export interface Leaderboard {');
    lines.push('  id: string;');
    lines.push('  name: string;');
    lines.push('  iconUrl: string;');
    lines.push('}');
    lines.push('');
    lines.push('export interface LeaderboardEntry {');
    lines.push('  rank: number;');
    lines.push('  playerName: string;');
    lines.push('  playerAvatar: string;');
    lines.push('  score: number;');
    lines.push('  extra?: string;');
    lines.push('}');
    lines.push('');
    lines.push('export class TapLeaderboardManager {');
    lines.push('  private static instance: TapLeaderboardManager;');
    lines.push('  private isInitialized = false;');
    lines.push('');
    lines.push('  static getInstance(): TapLeaderboardManager {');
    lines.push('    if (!TapLeaderboardManager.instance) {');
    lines.push('      TapLeaderboardManager.instance = new TapLeaderboardManager();');
    lines.push('    }');
    lines.push('    return TapLeaderboardManager.instance;');
    lines.push('  }');
    lines.push('');
    lines.push('  async init(): Promise<void> {');
    lines.push('    if (this.isInitialized) return;');
    lines.push('    try {');
    lines.push('      await TapSDK.Leaderboard.init();');
    lines.push('      this.isInitialized = true;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('排行榜模块初始化失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  async submitScore(leaderboardId: string, score: number, extra?: string): Promise<void> {'
    );
    lines.push('    if (!this.isInitialized) {');
    lines.push("      throw new Error('排行榜模块未初始化');");
    lines.push('    }');
    lines.push('    try {');
    lines.push('      await TapSDK.Leaderboard.submitScore(leaderboardId, score, extra);');
    lines.push('    } catch (error) {');
    lines.push("      console.error('提交分数失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  async getScores(leaderboardId: string, limit: number = 20): Promise<LeaderboardEntry[]> {'
    );
    lines.push('    if (!this.isInitialized) {');
    lines.push("      throw new Error('排行榜模块未初始化');");
    lines.push('    }');
    lines.push('    try {');
    lines.push('      return await TapSDK.Leaderboard.getScores(leaderboardId, limit);');
    lines.push('    } catch (error) {');
    lines.push("      console.error('获取排行榜失败:', error);");
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('export const tapLeaderboardManager = TapLeaderboardManager.getInstance();');
    return lines.join('\n');
  }

  private generateHttpRequest(): string {
    const lines: string[] = [];
    lines.push('export interface RequestOptions {');
    lines.push("  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';");
    lines.push('  headers?: Record<string, string>;');
    lines.push('  body?: any;');
    lines.push('  params?: Record<string, any>;');
    lines.push('  timeout?: number;');
    lines.push("  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';");
    lines.push('}');
    lines.push('');
    lines.push('export interface Response<T = any> {');
    lines.push('  data: T;');
    lines.push('  status: number;');
    lines.push('  statusText: string;');
    lines.push('  headers: Record<string, string>;');
    lines.push('}');
    lines.push('');
    lines.push(
      'export type RequestInterceptor = (config: RequestOptions & { url: string }) => RequestOptions & { url: string } | Promise<RequestOptions & { url: string }>;'
    );
    lines.push(
      'export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;'
    );
    lines.push(
      'export type ErrorInterceptor = (error: Error & { response?: Response }) => void | Promise<void>;'
    );
    lines.push('');
    lines.push('export class HttpClient {');
    lines.push("  private baseURL = '';");
    lines.push('  private defaultTimeout = 30000;');
    lines.push('  private defaultHeaders: Record<string, string> = {');
    lines.push("    'Content-Type': 'application/json',");
    lines.push('  };');
    lines.push('  private requestInterceptors: RequestInterceptor[] = [];');
    lines.push('  private responseInterceptors: ResponseInterceptor[] = [];');
    lines.push('  private errorInterceptors: ErrorInterceptor[] = [];');
    lines.push('');
    lines.push('  constructor(baseURL?: string) {');
    lines.push('    if (baseURL) this.baseURL = baseURL;');
    lines.push('  }');
    lines.push('');
    lines.push('  setBaseURL(url: string): void {');
    lines.push('    this.baseURL = url;');
    lines.push('  }');
    lines.push('');
    lines.push('  setDefaultHeaders(headers: Record<string, string>): void {');
    lines.push('    this.defaultHeaders = { ...this.defaultHeaders, ...headers };');
    lines.push('  }');
    lines.push('');
    lines.push('  addRequestInterceptor(interceptor: RequestInterceptor): void {');
    lines.push('    this.requestInterceptors.push(interceptor);');
    lines.push('  }');
    lines.push('');
    lines.push('  addResponseInterceptor(interceptor: ResponseInterceptor): void {');
    lines.push('    this.responseInterceptors.push(interceptor);');
    lines.push('  }');
    lines.push('');
    lines.push('  addErrorInterceptor(interceptor: ErrorInterceptor): void {');
    lines.push('    this.errorInterceptors.push(interceptor);');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  async get<T = any>(url: string, options?: RequestOptions): Promise<Response<T>> {'
    );
    lines.push("    return this.request<T>(url, { ...options, method: 'GET' });");
    lines.push('  }');
    lines.push('');
    lines.push(
      '  async post<T = any>(url: string, body?: any, options?: RequestOptions): Promise<Response<T>> {'
    );
    lines.push("    return this.request<T>(url, { ...options, method: 'POST', body });");
    lines.push('  }');
    lines.push('');
    lines.push(
      '  async put<T = any>(url: string, body?: any, options?: RequestOptions): Promise<Response<T>> {'
    );
    lines.push("    return this.request<T>(url, { ...options, method: 'PUT', body });");
    lines.push('  }');
    lines.push('');
    lines.push(
      '  async delete<T = any>(url: string, options?: RequestOptions): Promise<Response<T>> {'
    );
    lines.push("    return this.request<T>(url, { ...options, method: 'DELETE' });");
    lines.push('  }');
    lines.push('');
    lines.push(
      '  private async request<T = any>(url: string, options: RequestOptions = {}): Promise<Response<T>> {'
    );
    lines.push('    const fullUrl = this.buildURL(url, options.params);');
    lines.push('    const controller = new AbortController();');
    lines.push(
      '    const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? this.defaultTimeout);'
    );
    lines.push('');
    lines.push('    try {');
    lines.push(
      '      let config: RequestOptions & { url: string } = { ...options, url: fullUrl };'
    );
    lines.push('      for (const interceptor of this.requestInterceptors) {');
    lines.push('        config = await interceptor(config);');
    lines.push('      }');
    lines.push('');
    lines.push('      const headers = new Headers({ ...this.defaultHeaders, ...config.headers });');
    lines.push('      const response = await fetch(config.url, {');
    lines.push('        method: config.method,');
    lines.push('        headers,');
    lines.push(
      "        body: config.body ? (typeof config.body === 'string' ? config.body : JSON.stringify(config.body)) : undefined,"
    );
    lines.push('        signal: controller.signal,');
    lines.push('      });');
    lines.push('');
    lines.push('      let result: Response<T> = {');
    lines.push('        data: await this.parseResponse<T>(response, options.responseType),');
    lines.push('        status: response.status,');
    lines.push('        statusText: response.statusText,');
    lines.push('        headers: this.parseHeaders(response.headers),');
    lines.push('      };');
    lines.push('');
    lines.push('      for (const interceptor of this.responseInterceptors) {');
    lines.push('        result = await interceptor(result);');
    lines.push('      }');
    lines.push('');
    lines.push('      if (!response.ok) {');
    lines.push('        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;');
    lines.push('        const error = new Error(errorMsg) as Error & { response?: Response };');
    lines.push('        error.response = result;');
    lines.push('        throw error;');
    lines.push('      }');
    lines.push('');
    lines.push('      return result;');
    lines.push('    } catch (error) {');
    lines.push('      const err = error as Error & { response?: Response };');
    lines.push("      if (err.name === 'AbortError') {");
    lines.push("        err.message = '请求超时';");
    lines.push('      }');
    lines.push('      for (const interceptor of this.errorInterceptors) {');
    lines.push('        await interceptor(err);');
    lines.push('      }');
    lines.push('      throw err;');
    lines.push('    } finally {');
    lines.push('      clearTimeout(timeoutId);');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  private buildURL(url: string, params?: Record<string, any>): string {');
    lines.push("    let fullUrl = url.startsWith('http') ? url : this.baseURL + url;");
    lines.push('    if (params) {');
    lines.push('      const searchParams = new URLSearchParams();');
    lines.push('      for (const [key, value] of Object.entries(params)) {');
    lines.push('        if (value !== undefined && value !== null) {');
    lines.push('          searchParams.append(key, String(value));');
    lines.push('        }');
    lines.push('      }');
    lines.push('      const queryString = searchParams.toString();');
    lines.push('      if (queryString) {');
    lines.push("        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;");
    lines.push('      }');
    lines.push('    }');
    lines.push('    return fullUrl;');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  private async parseResponse<T>(response: Response, responseType?: string): Promise<T> {'
    );
    lines.push('    switch (responseType) {');
    lines.push("      case 'text':");
    lines.push('        return response.text() as Promise<T>;');
    lines.push("      case 'blob':");
    lines.push('        return response.blob() as Promise<T>;');
    lines.push("      case 'arraybuffer':");
    lines.push('        return response.arrayBuffer() as Promise<T>;');
    lines.push("      case 'json':");
    lines.push('      default:');
    lines.push('        return response.json() as Promise<T>;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  private parseHeaders(headers: Headers): Record<string, string> {');
    lines.push('    const result: Record<string, string> = {};');
    lines.push('    headers.forEach((value, key) => {');
    lines.push('      result[key] = value;');
    lines.push('    }');
    lines.push('    return result;');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('export const httpClient = new HttpClient();');
    return lines.join('\n');
  }

  private generateLocalStorage(): string {
    const lines: string[] = [];
    lines.push('export interface StorageOptions {');
    lines.push('  namespace?: string;');
    lines.push('  expire?: number;');
    lines.push('}');
    lines.push('');
    lines.push('export interface StoredItem<T = any> {');
    lines.push('  value: T;');
    lines.push('  storedAt: number;');
    lines.push('  expireAt?: number;');
    lines.push('}');
    lines.push('');
    lines.push('export class LocalStorage {');
    lines.push('  private namespace: string;');
    lines.push('  private storage: Storage;');
    lines.push('');
    lines.push("  constructor(namespace: string = 'app') {");
    lines.push('    this.namespace = namespace;');
    lines.push(
      "    this.storage = typeof localStorage !== 'undefined' ? localStorage : this.createMemoryStorage();"
    );
    lines.push('  }');
    lines.push('');
    lines.push('  private createMemoryStorage(): Storage {');
    lines.push('    const data = new Map<string, string>();');
    lines.push('    return {');
    lines.push('      get length() { return data.size; },');
    lines.push('      clear: () => data.clear(),');
    lines.push('      getItem: (key) => data.get(key) ?? null,');
    lines.push('      setItem: (key, value) => void data.set(key, value),');
    lines.push('      removeItem: (key) => data.delete(key),');
    lines.push('      key: (index) => [...data.keys()][index] ?? null,');
    lines.push('    };');
    lines.push('  }');
    lines.push('');
    lines.push('  private getKey(key: string): string {');
    lines.push('    return `${this.namespace}:${key}`;');
    lines.push('  }');
    lines.push('');
    lines.push('  set<T>(key: string, value: T, options?: StorageOptions): void {');
    lines.push('    const item: StoredItem<T> = { value, storedAt: Date.now() };');
    lines.push('    if (options?.expire) item.expireAt = Date.now() + options.expire;');
    lines.push(
      '    const storageKey = options?.namespace ? `${options.namespace}:${key}` : this.getKey(key);'
    );
    lines.push('    try {');
    lines.push('      this.storage.setItem(storageKey, JSON.stringify(item));');
    lines.push('    } catch (error) {');
    lines.push("      console.error('存储失败:', error);");
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  get<T = any>(key: string, defaultValue?: T, options?: StorageOptions): T | undefined {'
    );
    lines.push(
      '    const storageKey = options?.namespace ? `${options.namespace}:${key}` : this.getKey(key);'
    );
    lines.push('    try {');
    lines.push('      const raw = this.storage.getItem(storageKey);');
    lines.push('      if (!raw) return defaultValue;');
    lines.push('      const item: StoredItem<T> = JSON.parse(raw);');
    lines.push('      if (item.expireAt && Date.now() > item.expireAt) {');
    lines.push('        this.remove(key, options);');
    lines.push('        return defaultValue;');
    lines.push('      }');
    lines.push('      return item.value;');
    lines.push('    } catch (error) {');
    lines.push("      console.error('读取存储失败:', error);");
    lines.push('      return defaultValue;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  remove(key: string, options?: StorageOptions): void {');
    lines.push(
      '    const storageKey = options?.namespace ? `${options.namespace}:${key}` : this.getKey(key);'
    );
    lines.push('    this.storage.removeItem(storageKey);');
    lines.push('  }');
    lines.push('');
    lines.push('  clear(): void {');
    lines.push("    const prefix = this.namespace + ':';");
    lines.push('    const keysToRemove: string[] = [];');
    lines.push('    for (let i = 0; i < this.storage.length; i++) {');
    lines.push('      const key = this.storage.key(i);');
    lines.push('      if (key?.startsWith(prefix)) keysToRemove.push(key);');
    lines.push('    }');
    lines.push('    keysToRemove.forEach((k) => this.storage.removeItem(k));');
    lines.push('  }');
    lines.push('');
    lines.push('  has(key: string, options?: StorageOptions): boolean {');
    lines.push('    return this.get(key, undefined, options) !== undefined;');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('export const localStorage = new LocalStorage();');
    return lines.join('\n');
  }

  private generateEventEmitter(): string {
    const lines: string[] = [];
    lines.push('export type EventHandler<T = any> = (...args: T[]) => void;');
    lines.push('export type EventKey = string | symbol;');
    lines.push('');
    lines.push(
      'export class EventEmitter<EventMap extends Record<EventKey, any> = Record<string, any>> {'
    );
    lines.push('  private events: Map<keyof EventMap, Set<EventHandler>> = new Map();');
    lines.push('  private maxListeners = 100;');
    lines.push('');
    lines.push('  setMaxListeners(count: number): void {');
    lines.push('    this.maxListeners = count;');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): this {'
    );
    lines.push('    if (!this.events.has(event)) {');
    lines.push('      this.events.set(event, new Set());');
    lines.push('    }');
    lines.push('    const handlers = this.events.get(event)!;');
    lines.push('    handlers.add(handler as EventHandler);');
    lines.push('    if (handlers.size > this.maxListeners) {');
    lines.push(
      '      console.warn(`EventEmitter 警告: "${String(event)}" 事件监听器数量超过 ${this.maxListeners} 个，可能存在内存泄漏`);'
    );
    lines.push('    }');
    lines.push('    return this;');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): this {'
    );
    lines.push('    const handlers = this.events.get(event);');
    lines.push('    if (handlers) {');
    lines.push('      handlers.delete(handler as EventHandler);');
    lines.push('    }');
    lines.push('    return this;');
    lines.push('  }');
    lines.push('');
    lines.push(
      '  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): this {'
    );
    lines.push('    const onceHandler = (...args: any[]) => {');
    lines.push('      this.off(event, onceHandler as EventHandler<EventMap[K]>);');
    lines.push('      try {');
    lines.push('        handler(...args);');
    lines.push('      } catch (error) {');
    lines.push('        console.error(`事件 "${String(event)}" 一次性处理函数执行出错:`, error);');
    lines.push('      }');
    lines.push('    };');
    lines.push('    return this.on(event, onceHandler as EventHandler<EventMap[K]>);');
    lines.push('  }');
    lines.push('');
    lines.push('  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K][]): boolean {');
    lines.push('    const handlers = this.events.get(event);');
    lines.push('    if (!handlers || handlers.size === 0) return false;');
    lines.push('    for (const handler of handlers) {');
    lines.push('      try {');
    lines.push('        handler(...args);');
    lines.push('      } catch (error) {');
    lines.push('        console.error(`事件 "${String(event)}" 处理函数执行出错:`, error);');
    lines.push('      }');
    lines.push('    }');
    lines.push('    return true;');
    lines.push('  }');
    lines.push('');
    lines.push('  listenerCount<K extends keyof EventMap>(event: K): number {');
    lines.push('    return this.events.get(event)?.size ?? 0;');
    lines.push('  }');
    lines.push('');
    lines.push('  eventNames(): Array<keyof EventMap> {');
    lines.push('    return Array.from(this.events.keys());');
    lines.push('  }');
    lines.push('');
    lines.push('  removeAllListeners<K extends keyof EventMap>(event?: K): this {');
    lines.push('    if (event) {');
    lines.push('      this.events.delete(event);');
    lines.push('    } else {');
    lines.push('      this.events.clear();');
    lines.push('    }');
    lines.push('    return this;');
    lines.push('  }');
    lines.push('}');
    return lines.join('\n');
  }

  private generateDebounceThrottle(): string {
    const lines: string[] = [];
    lines.push(
      'export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number = 300): T & { cancel: () => void; flush: () => void } {'
    );
    lines.push('  let timer: ReturnType<typeof setTimeout> | null = null;');
    lines.push('  let lastArgs: Parameters<T> | null = null;');
    lines.push('  let lastThis: any = null;');
    lines.push('');
    lines.push('  function debounced(this: any, ...args: Parameters<T>): void {');
    lines.push('    lastArgs = args;');
    lines.push('    lastThis = this;');
    lines.push('    if (timer) clearTimeout(timer);');
    lines.push('    timer = setTimeout(() => {');
    lines.push('      timer = null;');
    lines.push('      if (lastArgs) fn.apply(lastThis, lastArgs);');
    lines.push('    }, delay);');
    lines.push('  }');
    lines.push('');
    lines.push('  debounced.cancel = function(): void {');
    lines.push('    if (timer) {');
    lines.push('      clearTimeout(timer);');
    lines.push('      timer = null;');
    lines.push('    }');
    lines.push('    lastArgs = null;');
    lines.push('    lastThis = null;');
    lines.push('  };');
    lines.push('');
    lines.push('  debounced.flush = function(): void {');
    lines.push('    if (timer) {');
    lines.push('      clearTimeout(timer);');
    lines.push('      timer = null;');
    lines.push('      if (lastArgs) fn.apply(lastThis, lastArgs);');
    lines.push('    }');
    lines.push('  };');
    lines.push('');
    lines.push('  return debounced as T & { cancel: () => void; flush: () => void };');
    lines.push('}');
    lines.push('');
    lines.push(
      'export function throttle<T extends (...args: any[]) => any>(fn: T, interval: number = 300): T & { cancel: () => void } {'
    );
    lines.push('  let lastTime = 0;');
    lines.push('  let timer: ReturnType<typeof setTimeout> | null = null;');
    lines.push('  let lastArgs: Parameters<T> | null = null;');
    lines.push('  let lastThis: any = null;');
    lines.push('');
    lines.push('  function throttled(this: any, ...args: Parameters<T>): void {');
    lines.push('    const now = Date.now();');
    lines.push('    lastArgs = args;');
    lines.push('    lastThis = this;');
    lines.push('    const remaining = interval - (now - lastTime);');
    lines.push('');
    lines.push('    if (remaining <= 0 || remaining > interval) {');
    lines.push('      if (timer) {');
    lines.push('        clearTimeout(timer);');
    lines.push('        timer = null;');
    lines.push('      }');
    lines.push('      lastTime = now;');
    lines.push('      fn.apply(this, args);');
    lines.push('    } else if (!timer) {');
    lines.push('      timer = setTimeout(() => {');
    lines.push('        lastTime = Date.now();');
    lines.push('        timer = null;');
    lines.push('        if (lastArgs) fn.apply(lastThis, lastArgs);');
    lines.push('      }, remaining);');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  throttled.cancel = function(): void {');
    lines.push('    if (timer) {');
    lines.push('      clearTimeout(timer);');
    lines.push('      timer = null;');
    lines.push('    }');
    lines.push('    lastArgs = null;');
    lines.push('    lastThis = null;');
    lines.push('  };');
    lines.push('');
    lines.push('  return throttled as T & { cancel: () => void };');
    lines.push('}');
    return lines.join('\n');
  }

  private generateDateUtils(): string {
    const lines: string[] = [];
    lines.push('export type DateInput = Date | string | number;');
    lines.push('');
    lines.push('const SECOND = 1000;');
    lines.push('const MINUTE = 60 * SECOND;');
    lines.push('const HOUR = 60 * MINUTE;');
    lines.push('const DAY = 24 * HOUR;');
    lines.push('');
    lines.push('function padZero(n: number, len: number = 2): string {');
    lines.push("  return String(n).padStart(len, '0');");
    lines.push('}');
    lines.push('');
    lines.push(
      "export function formatDate(date: DateInput, pattern: string = 'YYYY-MM-DD HH:mm:ss'): string {"
    );
    lines.push('  const d = new Date(date);');
    lines.push("  if (isNaN(d.getTime())) return '';");
    lines.push('');
    lines.push('  const year = d.getFullYear();');
    lines.push('  const month = d.getMonth() + 1;');
    lines.push('  const day = d.getDate();');
    lines.push('  const hours = d.getHours();');
    lines.push('  const minutes = d.getMinutes();');
    lines.push('  const seconds = d.getSeconds();');
    lines.push('  const dayOfWeek = d.getDay();');
    lines.push("  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];");
    lines.push('');
    lines.push('  return pattern');
    lines.push('    .replace(/YYYY/g, String(year))');
    lines.push('    .replace(/MM/g, padZero(month))');
    lines.push('    .replace(/DD/g, padZero(day))');
    lines.push('    .replace(/HH/g, padZero(hours))');
    lines.push('    .replace(/mm/g, padZero(minutes))');
    lines.push('    .replace(/ss/g, padZero(seconds))');
    lines.push('    .replace(/dd/g, `周${weekDays[dayOfWeek]}`)');
    lines.push('    .replace(/dddd/g, `星期${weekDays[dayOfWeek]}`);');
    lines.push('}');
    lines.push('');
    lines.push(
      "export function parseDate(dateString: string, pattern: string = 'YYYY-MM-DD'): Date {"
    );
    lines.push('  const yearMatch = pattern.match(/YYYY/);');
    lines.push('  const monthMatch = pattern.match(/MM/);');
    lines.push('  const dayMatch = pattern.match(/DD/);');
    lines.push('');
    lines.push('  let year = 0, month = 1, day = 1;');
    lines.push('');
    lines.push('  if (yearMatch) {');
    lines.push("    const idx = pattern.indexOf('YYYY');");
    lines.push('    year = parseInt(dateString.substr(idx, 4), 10);');
    lines.push('  }');
    lines.push('  if (monthMatch) {');
    lines.push("    const idx = pattern.indexOf('MM');");
    lines.push('    month = parseInt(dateString.substr(idx, 2), 10);');
    lines.push('  }');
    lines.push('  if (dayMatch) {');
    lines.push("    const idx = pattern.indexOf('DD');");
    lines.push('    day = parseInt(dateString.substr(idx, 2), 10);');
    lines.push('  }');
    lines.push('');
    lines.push('  return new Date(year, month - 1, day);');
    lines.push('}');
    lines.push('');
    lines.push('export function isToday(date: DateInput): boolean {');
    lines.push('  const d = new Date(date);');
    lines.push('  const today = new Date();');
    lines.push('  return (');
    lines.push('    d.getFullYear() === today.getFullYear() &&');
    lines.push('    d.getMonth() === today.getMonth() &&');
    lines.push('    d.getDate() === today.getDate()');
    lines.push('  );');
    lines.push('}');
    lines.push('');
    lines.push('export function startOfDay(date: DateInput): Date {');
    lines.push('  const d = new Date(date);');
    lines.push('  d.setHours(0, 0, 0, 0);');
    lines.push('  return d;');
    lines.push('}');
    lines.push('');
    lines.push('export function endOfDay(date: DateInput): Date {');
    lines.push('  const d = new Date(date);');
    lines.push('  d.setHours(23, 59, 59, 999);');
    lines.push('  return d;');
    lines.push('}');
    lines.push('');
    lines.push('export function startOfMonth(date: DateInput): Date {');
    lines.push('  const d = new Date(date);');
    lines.push('  d.setDate(1);');
    lines.push('  d.setHours(0, 0, 0, 0);');
    lines.push('  return d;');
    lines.push('}');
    lines.push('');
    lines.push('export function addDays(date: DateInput, days: number): Date {');
    lines.push('  const d = new Date(date);');
    lines.push('  d.setDate(d.getDate() + days);');
    lines.push('  return d;');
    lines.push('}');
    lines.push('');
    lines.push('export function diffDays(date1: DateInput, date2: DateInput): number {');
    lines.push('  const d1 = startOfDay(date1).getTime();');
    lines.push('  const d2 = startOfDay(date2).getTime();');
    lines.push('  return Math.floor((d2 - d1) / DAY);');
    lines.push('}');
    lines.push('');
    lines.push('export function isValidDate(date: any): boolean {');
    lines.push('  if (date instanceof Date) return !isNaN(date.getTime());');
    lines.push("  if (typeof date === 'string' || typeof date === 'number') {");
    lines.push('    return !isNaN(new Date(date).getTime());');
    lines.push('  }');
    lines.push('  return false;');
    lines.push('}');
    return lines.join('\n');
  }

  private generateValidation(): string {
    const lines: string[] = [];
    lines.push('export function isEmail(email: string): boolean {');
    lines.push('  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;');
    lines.push('  return reg.test(email);');
    lines.push('}');
    lines.push('');
    lines.push(
      "export function isPhoneNumber(phone: string, countryCode: string = 'CN'): boolean {"
    );
    lines.push("  if (countryCode === 'CN') {");
    lines.push('    return /^1[3-9]\\d{9}$/.test(phone);');
    lines.push('  }');
    lines.push('  return /^\\d{6,15}$/.test(phone);');
    lines.push('}');
    lines.push('');
    lines.push('export function isIdCard(idCard: string): boolean {');
    lines.push('  if (!/^\\d{17}[\\dXx]$/.test(idCard)) return false;');
    lines.push('  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];');
    lines.push("  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];");
    lines.push('  let sum = 0;');
    lines.push('  for (let i = 0; i < 17; i++) {');
    lines.push('    sum += parseInt(idCard.charAt(i), 10) * weights[i];');
    lines.push('  }');
    lines.push('  const checkCode = checkCodes[sum % 11];');
    lines.push('  return idCard.charAt(17).toUpperCase() === checkCode;');
    lines.push('}');
    lines.push('');
    lines.push('export function isUrl(url: string): boolean {');
    lines.push('  try {');
    lines.push('    new URL(url);');
    lines.push('    return true;');
    lines.push('  } catch {');
    lines.push('    return false;');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('export function isIPv4(ip: string): boolean {');
    lines.push(
      '  const reg = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;'
    );
    lines.push('  return reg.test(ip);');
    lines.push('}');
    lines.push('');
    lines.push('export interface PasswordStrength {');
    lines.push('  level: 0 | 1 | 2 | 3 | 4;');
    lines.push('  label: string;');
    lines.push('  suggestions: string[];');
    lines.push('}');
    lines.push('');
    lines.push('export function checkPasswordStrength(password: string): PasswordStrength {');
    lines.push('  let score = 0;');
    lines.push('  const suggestions: string[] = [];');
    lines.push('');
    lines.push('  if (password.length >= 8) score++;');
    lines.push("  else suggestions.push('密码长度至少 8 位');");
    lines.push('');
    lines.push('  if (/[a-z]/.test(password)) score++;');
    lines.push("  else suggestions.push('包含小写字母');");
    lines.push('');
    lines.push('  if (/[A-Z]/.test(password)) score++;');
    lines.push("  else suggestions.push('包含大写字母');");
    lines.push('');
    lines.push('  if (/\\d/.test(password)) score++;');
    lines.push("  else suggestions.push('包含数字');");
    lines.push('');
    lines.push('  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;');
    lines.push("  else suggestions.push('包含特殊字符');");
    lines.push('');
    lines.push("  const labels = ['极弱', '弱', '中等', '强', '极强'];");
    lines.push('  const level = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;');
    lines.push('');
    lines.push('  return { level, label: labels[level], suggestions };');
    lines.push('}');
    lines.push('');
    lines.push('export function isEmpty(value: any): boolean {');
    lines.push('  if (value == null) return true;');
    lines.push("  if (typeof value === 'string') return value.trim().length === 0;");
    lines.push('  if (Array.isArray(value)) return value.length === 0;');
    lines.push('  if (value instanceof Set || value instanceof Map) return value.size === 0;');
    lines.push("  if (typeof value === 'object') return Object.keys(value).length === 0;");
    lines.push('  return false;');
    lines.push('}');
    lines.push('');
    lines.push('export function isHexColor(color: string): boolean {');
    lines.push('  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);');
    lines.push('}');
    return lines.join('\n');
  }

  private generateReactComponent(req: CodeGenRequest): string {
    const componentName = this.sanitizeName(
      req.filePath
        ?.split('/')
        .pop()
        ?.replace(/\.(tsx|jsx|ts|js)$/, '') ?? 'MyComponent'
    );
    const lines: string[] = [];
    lines.push("import React, { useState, useCallback, useMemo, useEffect } from 'react';");
    lines.push('');
    lines.push('export interface ComponentProps {');
    lines.push('  className?: string;');
    lines.push('  style?: React.CSSProperties;');
    lines.push('  children?: React.ReactNode;');
    lines.push('}');
    lines.push('');
    lines.push(
      `export const ${componentName}: React.FC<ComponentProps> = ({ className, style, children }) => {`
    );
    lines.push('  const [isLoading, setIsLoading] = useState(false);');
    lines.push('');
    lines.push('  useEffect(() => {');
    lines.push('    // TODO: 组件初始化逻辑');
    lines.push('    return () => {');
    lines.push('      // TODO: 组件清理逻辑');
    lines.push('    };');
    lines.push('  }, []);');
    lines.push('');
    lines.push('  const handleClick = useCallback(() => {');
    lines.push('    // TODO: 点击处理逻辑');
    lines.push('  }, []);');
    lines.push('');
    lines.push('  const containerClass = useMemo(() => {');
    lines.push('    return `component ${className}`;');
    lines.push('  }, [className]);');
    lines.push('');
    lines.push('  return (');
    lines.push('    <div className={containerClass} style={style} onClick={handleClick}>');
    lines.push('      {isLoading ? <div>加载中...</div> : children}');
    lines.push('    </div>');
    lines.push('  );');
    lines.push('};');
    lines.push('');
    lines.push(`export default ${componentName};`);
    return lines.join('\n');
  }

  private generateVueComponent(req: CodeGenRequest): string {
    const componentName = this.sanitizeName(
      req.filePath
        ?.split('/')
        .pop()
        ?.replace(/\.(vue)$/, '') ?? 'MyComponent'
    );
    const lines: string[] = [];
    lines.push('<template>');
    lines.push('  <div :class="containerClass" :style="style" @click="handleClick">');
    lines.push('    <div v-if="isLoading">加载中...</div>');
    lines.push('    <slot v-else></slot>');
    lines.push('  </div>');
    lines.push('</template>');
    lines.push('');
    lines.push('<script setup lang="ts">');
    lines.push("import { ref, computed } from 'vue';");
    lines.push('');
    lines.push('interface Props {');
    lines.push('  className?: string;');
    lines.push('  style?: Record<string, string>;');
    lines.push('}');
    lines.push('');
    lines.push('const props = withDefaults(defineProps<Props>(), {');
    lines.push("  className: '',");
    lines.push('  style: () => ({}),');
    lines.push('});');
    lines.push('');
    lines.push('const isLoading = ref(false);');
    lines.push('');
    lines.push('const containerClass = computed(() => {');
    lines.push('  return `component ${props.className}`;');
    lines.push('});');
    lines.push('');
    lines.push('const handleClick = () => {');
    lines.push('  // TODO: 点击处理逻辑');
    lines.push('};');
    lines.push('');
    lines.push('defineExpose({ handleClick });');
    lines.push('</script>');
    lines.push('');
    lines.push('<style scoped>');
    lines.push('.component {');
    lines.push('  /* TODO: 组件样式 */');
    lines.push('}');
    lines.push('</style>');
    return lines.join('\n');
  }

  private generateGameScene(): string {
    const lines: string[] = [];
    lines.push("export type SceneState = 'idle' | 'loading' | 'running' | 'paused' | 'destroyed';");
    lines.push('');
    lines.push('export interface SceneEventMap {');
    lines.push("  'scene:enter': string;");
    lines.push("  'scene:exit': string;");
    lines.push("  'scene:pause': string;");
    lines.push("  'scene:resume': string;");
    lines.push("  'scene:destroy': string;");
    lines.push('}');
    lines.push('');
    lines.push('export interface SceneOptions {');
    lines.push('  name: string;');
    lines.push('  data?: any;');
    lines.push('}');
    lines.push('');
    lines.push('export abstract class Scene {');
    lines.push('  public name: string;');
    lines.push("  public state: SceneState = 'idle';");
    lines.push('  public data: any;');
    lines.push('');
    lines.push('  constructor(options: SceneOptions) {');
    lines.push('    this.name = options.name;');
    lines.push('    this.data = options.data;');
    lines.push('  }');
    lines.push('');
    lines.push('  async load(): Promise<void> {');
    lines.push("    this.state = 'loading';");
    lines.push('    await this.onLoad();');
    lines.push("    this.state = 'running';");
    lines.push('  }');
    lines.push('');
    lines.push('  abstract onLoad(): Promise<void> | void;');
    lines.push('  abstract onEnter(): void;');
    lines.push('  abstract onExit(): void;');
    lines.push('  abstract onUpdate(deltaTime: number): void;');
    lines.push('  abstract onDestroy(): void;');
    lines.push('');
    lines.push('  pause(): void {');
    lines.push("    if (this.state === 'running') {");
    lines.push("      this.state = 'paused';");
    lines.push('      this.onPause();');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  resume(): void {');
    lines.push("    if (this.state === 'paused') {");
    lines.push("      this.state = 'running';");
    lines.push('      this.onResume();');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  protected onPause(): void {}');
    lines.push('  protected onResume(): void {}');
    lines.push('}');
    lines.push('');
    lines.push('export class SceneManager {');
    lines.push('  private static instance: SceneManager;');
    lines.push('  private scenes: Map<string, Scene> = new Map();');
    lines.push('  private currentScene: Scene | null = null;');
    lines.push('  private sceneHistory: string[] = [];');
    lines.push('');
    lines.push('  static getInstance(): SceneManager {');
    lines.push('    if (!SceneManager.instance) {');
    lines.push('      SceneManager.instance = new SceneManager();');
    lines.push('    }');
    lines.push('    return SceneManager.instance;');
    lines.push('  }');
    lines.push('');
    lines.push('  register(scene: Scene): void {');
    lines.push('    this.scenes.set(scene.name, scene);');
    lines.push('  }');
    lines.push('');
    lines.push('  unregister(name: string): void {');
    lines.push('    this.scenes.delete(name);');
    lines.push('  }');
    lines.push('');
    lines.push('  async goTo(name: string, data?: any): Promise<void> {');
    lines.push('    const targetScene = this.scenes.get(name);');
    lines.push('    if (!targetScene) {');
    lines.push('      throw new Error(`场景 "${name}" 不存在`);');
    lines.push('    }');
    lines.push('');
    lines.push('    try {');
    lines.push('      if (this.currentScene) {');
    lines.push('        this.currentScene.onExit();');
    lines.push("        this.currentScene.state = 'idle';");
    lines.push('      }');
    lines.push('');
    lines.push('      if (data) targetScene.data = data;');
    lines.push('      await targetScene.load();');
    lines.push('      targetScene.onEnter();');
    lines.push('');
    lines.push('      if (this.currentScene) {');
    lines.push('        this.sceneHistory.push(this.currentScene.name);');
    lines.push('      }');
    lines.push('      this.currentScene = targetScene;');
    lines.push('    } catch (error) {');
    lines.push('      console.error(`场景 "${name}" 加载失败:`, error);');
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  getCurrent(): Scene | null {');
    lines.push('    return this.currentScene;');
    lines.push('  }');
    lines.push('');
    lines.push('  update(deltaTime: number): void {');
    lines.push("    if (this.currentScene && this.currentScene.state === 'running') {");
    lines.push('      this.currentScene.onUpdate(deltaTime);');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
    lines.push('  pause(): void {');
    lines.push('    this.currentScene?.pause();');
    lines.push('  }');
    lines.push('');
    lines.push('  resume(): void {');
    lines.push('    this.currentScene?.resume();');
    lines.push('  }');
    lines.push('');
    lines.push('  destroy(): void {');
    lines.push('    if (this.currentScene) {');
    lines.push('      this.currentScene.onDestroy();');
    lines.push('      this.currentScene = null;');
    lines.push('    }');
    lines.push('    this.scenes.clear();');
    lines.push('    this.sceneHistory = [];');
    lines.push('  }');
    lines.push('}');
    return lines.join('\n');
  }

  private generateUnityMonoBehaviour(): string {
    const lines: string[] = [];
    lines.push('using UnityEngine;');
    lines.push('');
    lines.push('public abstract class MonoBehaviourBase : MonoBehaviour');
    lines.push('{');
    lines.push('    private bool _isInitialized = false;');
    lines.push('    public bool IsInitialized => _isInitialized;');
    lines.push('');
    lines.push('    protected virtual void Awake()');
    lines.push('    {');
    lines.push('        OnAwake();');
    lines.push('    }');
    lines.push('');
    lines.push('    protected virtual void Start()');
    lines.push('    {');
    lines.push('        Initialize();');
    lines.push('        OnStart();');
    lines.push('    }');
    lines.push('');
    lines.push('    protected virtual void OnAwake() { }');
    lines.push('    protected virtual void OnStart() { }');
    lines.push('');
    lines.push('    protected virtual void Initialize()');
    lines.push('    {');
    lines.push('        _isInitialized = true;');
    lines.push('    }');
    lines.push('');
    lines.push('    protected void SafeDestroyImmediate(Object obj)');
    lines.push('    {');
    lines.push('        if (obj != null)');
    lines.push('        {');
    lines.push('            DestroyImmediate(obj);');
    lines.push('        }');
    lines.push('    }');
    lines.push('');
    lines.push('    protected void Log(object message)');
    lines.push('    {');
    lines.push('        Debug.Log($"[{gameObject.name}] {message}", gameObject);');
    lines.push('    }');
    lines.push('');
    lines.push('    protected void LogWarning(object message)');
    lines.push('    {');
    lines.push('        Debug.LogWarning($"[{gameObject.name}] {message}", gameObject);');
    lines.push('    }');
    lines.push('');
    lines.push('    protected void LogError(object message)');
    lines.push('    {');
    lines.push('        Debug.LogError($"[{gameObject.name}] {message}", gameObject);');
    lines.push('    }');
    lines.push('');
    lines.push('    protected virtual void OnDestroy()');
    lines.push('    {');
    lines.push('        StopAllCoroutines();');
    lines.push('    }');
    lines.push('}');
    return lines.join('\n');
  }

  private generateCocosLuaLayer(): string {
    const lines: string[] = [];
    lines.push('local BaseLayer = class("BaseLayer", function()');
    lines.push('    return cc.Layer:create()');
    lines.push('end)');
    lines.push('');
    lines.push('function BaseLayer:ctor()');
    lines.push('    self.isVisible = true');
    lines.push('    self.isTouchEnabled = false');
    lines.push('    self.touchListener = nil');
    lines.push('    self.schedulerId = nil');
    lines.push('    self.children = {}');
    lines.push('    self.eventHandlers = {}');
    lines.push('    ');
    lines.push('    self:registerScriptHandler(function(event)');
    lines.push('        if event == "enter" then');
    lines.push('            self:onEnter()');
    lines.push('        elseif event == "exit" then');
    lines.push('            self:onExit()');
    lines.push('        elseif event == "cleanup" then');
    lines.push('            self:onCleanup()');
    lines.push('        end');
    lines.push('    end)');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:onEnter()');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:onExit()');
    lines.push('    self:removeAllEventListeners()');
    lines.push('    self:stopScheduler()');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:onCleanup()');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:setTouchEnabled(enabled)');
    lines.push('    self.isTouchEnabled = enabled');
    lines.push('    if enabled then');
    lines.push('        self:registerTouchHandler()');
    lines.push('    else');
    lines.push('        self:unregisterTouchHandler()');
    lines.push('    end');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:registerTouchHandler()');
    lines.push('    local listener = cc.EventListenerTouchOneByOne:create()');
    lines.push('    listener:setSwallowTouches(true)');
    lines.push('    listener:registerScriptHandler(function(touch, event)');
    lines.push('        return self:onTouchBegan(touch, event)');
    lines.push('    end, cc.Handler.EVENT_TOUCH_BEGAN)');
    lines.push('    listener:registerScriptHandler(function(touch, event)');
    lines.push('        self:onTouchMoved(touch, event)');
    lines.push('    end, cc.Handler.EVENT_TOUCH_MOVED)');
    lines.push('    listener:registerScriptHandler(function(touch, event)');
    lines.push('        self:onTouchEnded(touch, event)');
    lines.push('    end, cc.Handler.EVENT_TOUCH_ENDED)');
    lines.push(
      '    self:getEventDispatcher():addEventListenerWithSceneGraphPriority(listener, self)'
    );
    lines.push('    self.touchListener = listener');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:unregisterTouchHandler()');
    lines.push('    if self.touchListener then');
    lines.push('        self:getEventDispatcher():removeEventListener(self.touchListener)');
    lines.push('        self.touchListener = nil');
    lines.push('    end');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:onTouchBegan(touch, event)');
    lines.push('    return true');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:onTouchMoved(touch, event)');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:onTouchEnded(touch, event)');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:addEventListener(eventName, handler)');
    lines.push('    local listener = cc.EventListenerCustom:create(eventName, function(event)');
    lines.push('        handler(event:getData())');
    lines.push('    end)');
    lines.push(
      '    cc.Director:getInstance():getEventDispatcher():addEventListenerWithFixedPriority(listener, 1)'
    );
    lines.push(
      '    table.insert(self.eventHandlers, { eventName = eventName, listener = listener })'
    );
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:removeAllEventListeners()');
    lines.push('    for _, handler in ipairs(self.eventHandlers) do');
    lines.push(
      '        cc.Director:getInstance():getEventDispatcher():removeEventListener(handler.listener)'
    );
    lines.push('    end');
    lines.push('    self.eventHandlers = {}');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:startScheduler(interval, isPaused)');
    lines.push('    if self.schedulerId then return end');
    lines.push('    local scheduler = cc.Director:getInstance():getScheduler()');
    lines.push('    self.schedulerId = scheduler:scheduleScriptFunc(function(dt)');
    lines.push('        self:onUpdate(dt)');
    lines.push('    end, interval, isPaused or false)');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:stopScheduler()');
    lines.push('    if self.schedulerId then');
    lines.push('        local scheduler = cc.Director:getInstance():getScheduler()');
    lines.push('        scheduler:unscheduleScriptEntry(self.schedulerId)');
    lines.push('        self.schedulerId = nil');
    lines.push('    end');
    lines.push('end');
    lines.push('');
    lines.push('function BaseLayer:onUpdate(dt)');
    lines.push('end');
    lines.push('');
    lines.push('return BaseLayer');
    return lines.join('\n');
  }

  private generateCodeFromPrompt(req: CodeGenRequest): string {
    const lang = req.language ?? 'typescript';
    const filename = req.filePath?.split('/').pop() ?? 'generated';

    if (
      req.prompt.toLowerCase().includes('单例') ||
      req.prompt.toLowerCase().includes('singleton')
    ) {
      return this.generateSingletonTemplate(req);
    }

    if (lang === 'python') {
      return `# ${req.prompt}\n# TODO: 实现\n\n`;
    }

    if (lang === 'csharp') {
      return `using UnityEngine;\n\npublic class ${this.sanitizeName(filename)} : MonoBehaviour\n{\n    void Start()\n    {\n        // ${req.prompt}\n    }\n\n    void Update()\n    {\n    }\n}\n`;
    }

    if (lang === 'lua') {
      return `-- ${req.prompt}\n-- TODO: 实现\n\nlocal module = {}\n\nreturn module\n`;
    }

    return `// ${req.prompt}\n// TODO: 实现\n`;
  }

  private generateSingletonTemplate(req: CodeGenRequest): string {
    const name = this.sanitizeName(
      req.filePath
        ?.split('/')
        .pop()
        ?.replace(/\.(ts|js)$/, '') ?? 'Manager'
    );
    return `export class ${name} {
  private static instance: ${name};

  static getInstance(): ${name} {
    if (!${name}.instance) {
      ${name}.instance = new ${name}();
    }
    return ${name}.instance;
  }

  private constructor() {
    // 初始化逻辑
  }
}

export const ${name.charAt(0).toLowerCase() + name.slice(1)} = ${name}.getInstance();
`;
  }

  private refactorCode(req: CodeGenRequest): string {
    if (!req.fileContent) throw new Error('refactor 需要提供 fileContent');
    let result = req.fileContent;
    if (req.options?.style === 'arrow') {
      result = result.replace(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, 'const $1 = ($2) => {');
    }
    return `// 重构后的代码\n// ${req.prompt}\n${result}`;
  }

  private addComments(req: CodeGenRequest): string {
    if (!req.fileContent) throw new Error('comment 需要提供 fileContent');
    const lines = req.fileContent.split('\n');
    const result: string[] = [];
    let indent = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('class ') ||
        trimmed.startsWith('export class ') ||
        trimmed.startsWith('function ') ||
        trimmed.startsWith('export function ')
      ) {
        indent = line.match(/^\s*/)?.[0] ?? '';
        result.push(`${indent}/**`);
        result.push(`${indent} * TODO: 添加描述`);
        result.push(`${indent} */`);
      }
      result.push(line);
    }

    return result.join('\n');
  }

  private generateTests(req: CodeGenRequest): string {
    const filename =
      req.filePath
        ?.split('/')
        .pop()
        ?.replace(/\.(ts|tsx|js)$/, '') ?? 'module';
    if (req.fileContent) {
      const functions = this.extractFunctionNames(req.fileContent);
      const tests = functions
        .map(
          (fn) =>
            `describe('${fn}', () => {\n  it('should work correctly', () => {\n    // TODO: 实现测试用例\n  });\n});`
        )
        .join('\n\n');
      return `import { describe, it, expect } from '@jest/globals';\n\n${tests}\n`;
    }
    return `# ${filename} 测试用例\n# TODO: 实现测试\n`;
  }

  private extractFunctionNames(content: string): string[] {
    const names: string[] = [];
    const regexes = [
      /function\s+(\w+)\s*\(/g,
      /const\s+(\w+)\s*=\s*\(/g,
      /(\w+)\s*:\s*\([^)]*\)\s*=>/g,
    ];
    for (const re of regexes) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        if (m[1] && !names.includes(m[1])) names.push(m[1]);
      }
    }
    return names;
  }

  private generateDocumentation(req: CodeGenRequest): string {
    if (!req.fileContent) throw new Error('document 需要提供 fileContent');
    const filename = req.filePath?.split('/').pop() ?? 'module';
    const lines = req.fileContent.split('\n');
    const functions: { name: string; kind: string }[] = [];

    for (const line of lines) {
      const classMatch = line.match(/export\s+class\s+(\w+)/);
      if (classMatch) functions.push({ name: classMatch[1], kind: 'class' });

      const funcMatch = line.match(/export\s+function\s+(\w+)/);
      if (funcMatch) functions.push({ name: funcMatch[1], kind: 'function' });

      const constMatch = line.match(/export\s+const\s+(\w+)\s*=/);
      if (constMatch) functions.push({ name: constMatch[1], kind: '常量' });
    }

    const docLines: string[] = [];
    docLines.push(`# ${filename} 文档`);
    docLines.push('');
    docLines.push('## 概述');
    docLines.push('TODO: 添加模块概述');
    docLines.push('');
    docLines.push('## API');
    docLines.push('');

    for (const fn of functions) {
      const kindLabel = fn.kind === 'class' ? '类' : fn.kind === 'function' ? '函数' : fn.kind;
      docLines.push(`### ${fn.name}`);
      docLines.push('');
      docLines.push(`**类型**: ${kindLabel}`);
      docLines.push('');
      docLines.push('**描述**: TODO: 添加描述');
      docLines.push('');
      docLines.push('**参数**:');
      docLines.push('- TODO - 参数说明');
      docLines.push('');
      docLines.push('**返回值**: TODO');
      docLines.push('');
      docLines.push('**示例**:');
      docLines.push('```typescript');
      docLines.push('// TODO: 添加示例');
      docLines.push('```');
      docLines.push('');
    }

    return docLines.join('\n');
  }

  private explainCode(req: CodeGenRequest): string {
    if (!req.fileContent) throw new Error('explain 需要提供 fileContent');
    const lineCount = req.fileContent.split('\n').length;
    return `代码说明：

- 总行数：${lineCount} 行
- 功能：根据代码结构分析，这是一个功能模块
- 设计模式：TODO
- 关键函数：TODO

注意：这是基础版本的分析，如需更详细的分析，请使用 AI 模型。`;
  }

  private optimizeCode(req: CodeGenRequest): string {
    if (!req.fileContent) throw new Error('optimize 需要提供 fileContent');
    return `// 优化后的代码\n// ${req.prompt}\n// TODO: 优化建议：\n// 1. 减少不必要的计算\n// 2. 使用缓存避免重复操作\n// 3. 优化循环结构\n\n${req.fileContent}`;
  }

  private translateCode(req: CodeGenRequest): string {
    if (!req.fileContent) throw new Error('translate 需要提供 fileContent');
    return `// 转换后的代码\n// TODO: 将 ${req.language ?? '原语言'} 代码转换为目标语言\n${req.fileContent}`;
  }

  private fixBug(req: CodeGenRequest): string {
    if (!req.fileContent) throw new Error('fix-bug 需要提供 fileContent');
    return `// 修复后的代码\n// TODO: 修复以下问题：${req.prompt}\n${req.fileContent}`;
  }

  private generateExplanation(req: CodeGenRequest, code: string): string {
    const lineCount = code.split('\n').length;
    const template = this.getTemplateById(req.templateId ?? '');
    const actionName = this.getActionDisplayName(req.action);

    if (template) {
      return `已使用模板「${template.name}」${actionName}（共 ${lineCount} 行）`;
    }

    return `已${actionName}（共 ${lineCount} 行）`;
  }

  private generateSuggestions(req: CodeGenRequest, code: string): CodeGenSuggestion[] {
    const suggestions: CodeGenSuggestion[] = [];

    if (req.language === 'typescript' && !code.includes('import type')) {
      suggestions.push({
        title: '建议使用类型导入',
        description:
          '对于仅作为类型使用的导入，建议使用 import type 语法，这样可以在编译时正确地擦除类型导入，减少打包体积。',
        severity: 'best-practice',
      });
    }

    const consoleLogCount = (code.match(/console\.log\(/g) || []).length;
    if (consoleLogCount > 3) {
      suggestions.push({
        title: '检查调试日志',
        description: '代码中包含较多 console.log 语句，建议在提交前清理调试日志。',
        severity: 'warning',
      });
    }

    if (req.action === 'generate' && !code.includes('try') && !code.includes('catch')) {
      suggestions.push({
        title: '添加错误处理',
        description: '建议为异步操作或可能失败的代码添加 try-catch 错误处理。',
        severity: 'info',
      });
    }

    return suggestions;
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '').replace(/^\d/, '_$&');
  }

  private getActionDisplayName(action: CodeGenAction): string {
    const map: Record<CodeGenAction, string> = {
      generate: '生成代码',
      refactor: '重构代码',
      comment: '添加注释',
      test: '生成测试',
      document: '生成文档',
      explain: '解释代码',
      optimize: '优化代码',
      translate: '转换代码',
      'fix-bug': '修复 Bug',
    };
    return map[action] ?? action;
  }

  private getLanguageDisplayName(lang?: CodeLanguage): string {
    if (!lang) return '自动检测';
    const map: Record<CodeLanguage, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      python: 'Python',
      csharp: 'C#',
      lua: 'Lua',
    };
    return map[lang] ?? lang;
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}

export const aiCodeGenService = new AICodeGenService();
