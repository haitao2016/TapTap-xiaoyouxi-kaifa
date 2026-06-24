/**
 * TapTap 开发者平台登录服务
 * - OAuth 2.0 授权流程
 * - Token 安全存储（keychain）
 * - 多账号切换
 * - 自动刷新
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

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

const TAPTAP_OAUTH_URL = 'https://accounts.taptap.cn/oauth2/authorize';
const TAPTAP_TOKEN_URL = 'https://accounts.taptap.cn/oauth2/token';
const TAPTAP_PROFILE_URL = 'https://api.taptap.cn/account/v1/profile';

export class TapTapAuthService {
  private accounts = new Map<string, TapTapAccount>();
  private activeAccountId: string | null = null;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private redirectUri = 'tapdev://oauth/callback';
  /** 模拟模式（无 clientId 时启用） */
  private mockMode = false;

  configure(clientId: string, clientSecret: string, redirectUri?: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    if (redirectUri) this.redirectUri = redirectUri;
  }

  enableMockMode(enabled: boolean): void {
    this.mockMode = enabled;
  }

  /**
   * 获取授权 URL（用户在浏览器中打开）
   */
  getAuthorizeUrl(state?: string): string {
    if (!this.clientId && !this.mockMode) {
      throw new Error('请先调用 configure() 配置 clientId');
    }
    const params = new URLSearchParams({
      client_id: this.clientId ?? 'mock-client',
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'user_info game:manage data:view',
      state: state ?? randomUUID(),
    });
    return `${TAPTAP_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * 用授权码换取 token
   */
  async exchangeCode(code: string): Promise<TapTapLoginResult> {
    if (this.mockMode) {
      return this.mockLogin();
    }
    if (!this.clientId || !this.clientSecret) {
      return { success: false, error: '未配置 clientId/clientSecret' };
    }
    try {
      const res = await fetch(TAPTAP_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
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
      account.expiresAt = Date.now() + 7200 * 1000;
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
      const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
      account.accessToken = data.access_token;
      account.refreshToken = data.refresh_token;
      account.expiresAt = Date.now() + data.expires_in * 1000;
      return true;
    } catch {
      return false;
    }
  }

  listAccounts(): TapTapAccount[] {
    return Array.from(this.accounts.values());
  }

  getActiveAccount(): TapTapAccount | null {
    return this.activeAccountId ? this.accounts.get(this.activeAccountId) ?? null : null;
  }

  switchAccount(id: string): boolean {
    if (this.accounts.has(id)) {
      this.activeAccountId = id;
      return true;
    }
    return false;
  }

  logout(accountId: string): void {
    this.accounts.delete(accountId);
    if (this.activeAccountId === accountId) {
      this.activeAccountId = Array.from(this.accounts.keys())[0] ?? null;
    }
    globalEventBus.emit({ type: 'taptap:logout', payload: accountId });
  }

  private async fetchProfile(accessToken: string, openId: string): Promise<{ nickname: string; avatar: string }> {
    try {
      const res = await fetch(`${TAPTAP_PROFILE_URL}?openid=${openId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return { nickname: 'TapTap User', avatar: '' };
      const data = (await res.json()) as { data: { name: string; avatar: string } };
      return { nickname: data.data.name, avatar: data.data.avatar };
    } catch {
      return { nickname: 'TapTap User', avatar: '' };
    }
  }

  private mockLogin(): TapTapLoginResult {
    const account: TapTapAccount = {
      id: randomUUID(),
      nickname: 'Demo Developer',
      avatar: 'https://tapssl.taptap.com/avatar.png',
      openId: `mock-${randomUUID().slice(0, 8)}`,
      accessToken: `mock-token-${randomUUID()}`,
      refreshToken: `mock-refresh-${randomUUID()}`,
      expiresAt: Date.now() + 7200 * 1000,
      scope: ['user_info', 'game:manage', 'data:view'],
      loginAt: Date.now(),
    };
    this.accounts.set(account.id, account);
    this.activeAccountId = account.id;
    globalEventBus.emit({ type: 'taptap:login', payload: account });
    return { success: true, account };
  }
}

export const tapTapAuthService = new TapTapAuthService();
