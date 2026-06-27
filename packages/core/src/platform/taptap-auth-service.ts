/**
 * TapTap 开发者平台登录服务
 * - OAuth 2.0 授权完整流程
 * - Token 安全存储与自动刷新
 * - 用户信息缓存与过期管理
 * - 多账号切换
 * - 模拟模式完整流程
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from '../utils/crypto-utils';

export interface TapTapAccount {
  id: string;
  nickname: string;
  avatar: string;
  email?: string;
  openId: string;
  unionId?: string;
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 过期时间（unix ms） */
  expiresAt: number;
  /** 权限范围 */
  scope: string[];
  /** 登录时间 */
  loginAt: number;
}

export interface TapTapLoginResult {
  success: boolean;
  account?: TapTapAccount;
  error?: string;
}

export interface OAuthSession {
  state: string;
  codeVerifier?: string;
  createdAt: number;
  expiresAt: number;
}

export interface CachedProfile {
  openId: string;
  nickname: string;
  avatar: string;
  email?: string;
  cachedAt: number;
  expiresAt: number;
}

const TAPTAP_OAUTH_URL = 'https://accounts.taptap.cn/oauth2/authorize';
const TAPTAP_TOKEN_URL = 'https://accounts.taptap.cn/oauth2/token';
const TAPTAP_PROFILE_URL = 'https://api.taptap.cn/account/v1/profile';
const TOKEN_REFRESH_THRESHOLD = 300_000;
const PROFILE_CACHE_TTL = 3_600_000;
const OAUTH_SESSION_TTL = 600_000;
const STORAGE_KEY = 'taptap_auth_accounts';

export class TapTapAuthService {
  private accounts = new Map<string, TapTapAccount>();
  private activeAccountId: string | null = null;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private redirectUri = 'tapdev://oauth/callback';
  private mockMode = false;
  private oauthSessions = new Map<string, OAuthSession>();
  private profileCache = new Map<string, CachedProfile>();
  private autoRefreshTimer?: ReturnType<typeof setInterval>;
  private mockPendingAuth: { state: string; code: string } | null = null;

  constructor() {
    this.loadAccounts();
    this.startAutoRefresh();
  }

  configure(clientId: string, clientSecret: string, redirectUri?: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    if (redirectUri) this.redirectUri = redirectUri;
  }

  enableMockMode(enabled: boolean): void {
    this.mockMode = enabled;
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * 创建 OAuth 会话并获取授权 URL
   */
  createOAuthSession(scopes?: string[]): { url: string; state: string } {
    const state = randomUUID();
    const codeVerifier = this.mockMode ? undefined : randomUUID();
    const session: OAuthSession = {
      state,
      codeVerifier,
      createdAt: Date.now(),
      expiresAt: Date.now() + OAUTH_SESSION_TTL,
    };
    this.oauthSessions.set(state, session);

    const params = new URLSearchParams({
      client_id: this.clientId ?? 'mock-client',
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes?.join(' ') ?? 'user_info game:manage data:view',
      state,
    });
    if (codeVerifier) {
      params.set('code_challenge', codeVerifier);
      params.set('code_challenge_method', 'plain');
    }

    const url = `${TAPTAP_OAUTH_URL}?${params.toString()}`;
    return { url, state };
  }

  /**
   * 获取授权 URL（兼容旧接口）
   */
  getAuthorizeUrl(state?: string): string {
    if (!this.clientId && !this.mockMode) {
      throw new Error('请先调用 configure() 配置 clientId');
    }
    const { url } = this.createOAuthSession();
    return url;
  }

  /**
   * 模拟模式下生成授权码（用于测试）
   */
  mockGenerateCode(state: string): string | null {
    if (!this.mockMode) return null;
    const session = this.oauthSessions.get(state);
    if (!session || Date.now() > session.expiresAt) return null;
    const code = `mock-code-${randomUUID().slice(0, 16)}`;
    this.mockPendingAuth = { state, code };
    return code;
  }

  /**
   * 验证 state 参数
   */
  validateState(state: string): boolean {
    const session = this.oauthSessions.get(state);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.oauthSessions.delete(state);
      return false;
    }
    return true;
  }

  /**
   * 用授权码换取 token
   */
  async exchangeCode(code: string, state?: string): Promise<TapTapLoginResult> {
    if (state && !this.validateState(state)) {
      return { success: false, error: '无效或已过期的 state 参数' };
    }

    if (this.mockMode) {
      return this.mockLogin(code);
    }

    if (!this.clientId || !this.clientSecret) {
      return { success: false, error: '未配置 clientId/clientSecret' };
    }

    try {
      const oauthSession = state ? this.oauthSessions.get(state) : undefined;

      const res = await fetch(TAPTAP_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
          ...(oauthSession?.codeVerifier ? { code_verifier: oauthSession.codeVerifier } : {}),
        }),
      });

      if (!res.ok) {
        return { success: false, error: `Token 交换失败: ${res.status}` };
      }

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        scope: string;
        openid: string;
        unionid?: string;
      };

      const profile = await this.fetchProfile(data.access_token, data.openid);
      const account: TapTapAccount = {
        id: randomUUID(),
        nickname: profile.nickname,
        avatar: profile.avatar,
        email: profile.email,
        openId: data.openid,
        unionId: data.unionid,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope.split(' '),
        loginAt: Date.now(),
      };

      this.accounts.set(account.id, account);
      this.activeAccountId = account.id;
      this.cacheProfile(account.openId, profile);
      this.saveAccounts();
      this.cleanupSession(state);

      globalEventBus.emit({ type: 'taptap:login', payload: account });
      return { success: true, account };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * 刷新 token
   */
  async refreshAccessToken(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId);
    if (!account) return false;

    if (this.mockMode) {
      account.accessToken = `mock-token-${randomUUID()}`;
      account.refreshToken = `mock-refresh-${randomUUID()}`;
      account.expiresAt = Date.now() + 7200 * 1000;
      this.saveAccounts();
      globalEventBus.emit({ type: 'taptap:tokenRefreshed', payload: account });
      return true;
    }

    try {
      const res = await fetch(TAPTAP_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId ?? '',
          client_secret: this.clientSecret ?? '',
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
        }),
      });

      if (!res.ok) return false;

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      account.accessToken = data.access_token;
      account.refreshToken = data.refresh_token;
      account.expiresAt = Date.now() + data.expires_in * 1000;
      this.saveAccounts();
      globalEventBus.emit({ type: 'taptap:tokenRefreshed', payload: account });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查 token 是否即将过期
   */
  isTokenExpiring(accountId: string, threshold: number = TOKEN_REFRESH_THRESHOLD): boolean {
    const account = this.accounts.get(accountId);
    if (!account) return true;
    return Date.now() + threshold >= account.expiresAt;
  }

  /**
   * 获取有效 token（自动刷新）
   */
  async getValidAccessToken(accountId?: string): Promise<string | null> {
    const id = accountId ?? this.activeAccountId;
    if (!id) return null;
    const account = this.accounts.get(id);
    if (!account) return null;

    if (this.isTokenExpiring(id)) {
      const refreshed = await this.refreshAccessToken(id);
      if (!refreshed) return null;
    }

    return account.accessToken;
  }

  /**
   * 获取用户信息（带缓存）
   */
  async getUserProfile(openId: string, accessToken?: string): Promise<CachedProfile | null> {
    const cached = this.profileCache.get(openId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached;
    }

    const token = accessToken ?? (await this.getValidAccessToken());
    if (!token) return null;

    try {
      const profile = await this.fetchProfile(token, openId);
      const cachedProfile: CachedProfile = {
        openId,
        ...profile,
        cachedAt: Date.now(),
        expiresAt: Date.now() + PROFILE_CACHE_TTL,
      };
      this.profileCache.set(openId, cachedProfile);
      return cachedProfile;
    } catch {
      return cached ?? null;
    }
  }

  /**
   * 清除用户信息缓存
   */
  clearProfileCache(openId?: string): void {
    if (openId) {
      this.profileCache.delete(openId);
    } else {
      this.profileCache.clear();
    }
  }

  listAccounts(): TapTapAccount[] {
    return Array.from(this.accounts.values());
  }

  getActiveAccount(): TapTapAccount | null {
    return this.activeAccountId ? (this.accounts.get(this.activeAccountId) ?? null) : null;
  }

  switchAccount(id: string): boolean {
    if (this.accounts.has(id)) {
      this.activeAccountId = id;
      this.saveAccounts();
      globalEventBus.emit({ type: 'taptap:switchAccount', payload: id });
      return true;
    }
    return false;
  }

  logout(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (account) {
      this.profileCache.delete(account.openId);
    }
    this.accounts.delete(accountId);
    if (this.activeAccountId === accountId) {
      this.activeAccountId = Array.from(this.accounts.keys())[0] ?? null;
    }
    this.saveAccounts();
    globalEventBus.emit({ type: 'taptap:logout', payload: accountId });
  }

  logoutAll(): void {
    this.accounts.clear();
    this.activeAccountId = null;
    this.profileCache.clear();
    this.oauthSessions.clear();
    this.saveAccounts();
    globalEventBus.emit({ type: 'taptap:logoutAll' });
  }

  private async fetchProfile(
    accessToken: string,
    openId: string
  ): Promise<{ nickname: string; avatar: string; email?: string }> {
    try {
      const res = await fetch(`${TAPTAP_PROFILE_URL}?openid=${openId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return { nickname: 'TapTap User', avatar: '' };
      const data = (await res.json()) as {
        data: { name: string; avatar: string; email?: string };
      };
      return {
        nickname: data.data.name,
        avatar: data.data.avatar,
        email: data.data.email,
      };
    } catch {
      return { nickname: 'TapTap User', avatar: '' };
    }
  }

  private cacheProfile(
    openId: string,
    profile: { nickname: string; avatar: string; email?: string }
  ): void {
    this.profileCache.set(openId, {
      openId,
      ...profile,
      cachedAt: Date.now(),
      expiresAt: Date.now() + PROFILE_CACHE_TTL,
    });
  }

  private cleanupSession(state?: string): void {
    if (state) {
      this.oauthSessions.delete(state);
    }
    const now = Date.now();
    for (const [s, session] of this.oauthSessions) {
      if (now > session.expiresAt) {
        this.oauthSessions.delete(s);
      }
    }
  }

  private startAutoRefresh(): void {
    this.autoRefreshTimer = setInterval(() => {
      this.autoRefreshExpiringTokens();
    }, 60_000);
  }

  private async autoRefreshExpiringTokens(): Promise<void> {
    for (const [id, account] of this.accounts) {
      if (this.isTokenExpiring(id, TOKEN_REFRESH_THRESHOLD * 2)) {
        await this.refreshAccessToken(id);
      }
    }
  }

  private saveAccounts(): void {
    try {
      const data = {
        accounts: Array.from(this.accounts.values()),
        activeAccountId: this.activeAccountId,
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // ignore
    }
  }

  private loadAccounts(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        accounts: TapTapAccount[];
        activeAccountId: string | null;
      };
      for (const acc of data.accounts) {
        this.accounts.set(acc.id, acc);
      }
      this.activeAccountId = data.activeAccountId;
    } catch {
      // ignore
    }
  }

  private mockLogin(code?: string): TapTapLoginResult {
    const mockCode = code ?? `mock-code-${randomUUID().slice(0, 16)}`;
    const account: TapTapAccount = {
      id: randomUUID(),
      nickname: 'Demo Developer',
      avatar: 'https://tapssl.taptap.com/avatar.png',
      email: 'demo@taptap.com',
      openId: `mock-${randomUUID().slice(0, 8)}`,
      unionId: `mock-union-${randomUUID().slice(0, 8)}`,
      accessToken: `mock-token-${randomUUID()}`,
      refreshToken: `mock-refresh-${randomUUID()}`,
      expiresAt: Date.now() + 7200 * 1000,
      scope: ['user_info', 'game:manage', 'data:view'],
      loginAt: Date.now(),
    };
    this.accounts.set(account.id, account);
    this.activeAccountId = account.id;
    this.cacheProfile(account.openId, {
      nickname: account.nickname,
      avatar: account.avatar,
      email: account.email,
    });
    this.saveAccounts();
    globalEventBus.emit({ type: 'taptap:login', payload: account });
    return { success: true, account };
  }
}

export const tapTapAuthService = new TapTapAuthService();
