/**
 * 错误信息本地化与解决方案
 * - 统一错误格式
 * - 多语言错误消息
 * - 解决方案链接
 */
import { i18n } from './i18n-service';
import type { Locale } from './i18n-service';

export interface LocalizedError {
  /** 错误码 */
  code: string;
  /** 严重级别 */
  severity: 'info' | 'warning' | 'error' | 'fatal';
  /** 标题 */
  title: string;
  /** 详细描述 */
  description: string;
  /** 解决步骤 */
  steps: string[];
  /** 相关文档 */
  docsUrl?: string;
  /** 是否可重试 */
  retryable: boolean;
}

const ERRORS: Record<string, Omit<LocalizedError, 'code' | 'title' | 'description' | 'steps'> & {
  messages: Record<Locale, { title: string; description: string; steps: string[] }>;
}> = {
  'E1001': {
    severity: 'error',
    retryable: false,
    docsUrl: 'https://developer.taptap.cn/minigameapidoc/',
    messages: {
      'zh-CN': {
        title: '项目路径不存在',
        description: '指定的项目路径不存在或无权限访问',
        steps: ['检查项目路径是否正确', '确认文件夹存在', '检查读写权限'],
      },
      'en-US': {
        title: 'Project path not found',
        description: 'The specified project path does not exist or is not accessible',
        steps: ['Check the project path', 'Verify the folder exists', 'Check read/write permissions'],
      },
    },
  },
  'E2001': {
    severity: 'error',
    retryable: true,
    messages: {
      'zh-CN': {
        title: 'Unity 构建失败',
        description: 'Unity BatchMode 构建过程中出现错误',
        steps: [
          '查看错误日志详情',
          '检查 Unity 项目是否能正常打开',
          '确认 SDK 已正确安装',
          '如问题持续，重启 Unity Hub',
        ],
      },
      'en-US': {
        title: 'Unity build failed',
        description: 'An error occurred during Unity BatchMode build',
        steps: [
          'Review the error log',
          'Verify the Unity project opens correctly',
          'Confirm SDK is installed',
          'Restart Unity Hub if issue persists',
        ],
      },
    },
  },
  'E3001': {
    severity: 'warning',
    retryable: true,
    messages: {
      'zh-CN': {
        title: '网络连接不稳定',
        description: '检测到网络延迟较高或丢包',
        steps: ['检查网络连接', '如使用代理请配置 HTTPS_PROXY', '稍后重试'],
      },
      'en-US': {
        title: 'Unstable network connection',
        description: 'High latency or packet loss detected',
        steps: ['Check your network', 'Configure HTTPS_PROXY if using a proxy', 'Retry later'],
      },
    },
  },
  'E4001': {
    severity: 'error',
    retryable: false,
    messages: {
      'zh-CN': {
        title: 'SDK 版本不兼容',
        description: '当前项目使用的 SDK 与 IDE 不兼容',
        steps: ['升级 SDK 到最新版本', '或降级 IDE 到匹配版本', '查看兼容性报告'],
      },
      'en-US': {
        title: 'Incompatible SDK version',
        description: 'The SDK in the project is incompatible with this IDE',
        steps: ['Upgrade SDK to latest', 'Or downgrade IDE', 'Check compatibility report'],
      },
    },
  },
};

export class ErrorLocalizer {
  get(code: string): LocalizedError | null {
    const tpl = ERRORS[code];
    if (!tpl) return null;
    const locale = i18n.getCurrent();
    const msg = tpl.messages[locale] ?? tpl.messages['en-US'];
    return {
      code,
      severity: tpl.severity,
      retryable: tpl.retryable,
      docsUrl: tpl.docsUrl,
      title: msg.title,
      description: msg.description,
      steps: msg.steps,
    };
  }

  /**
   * 把原始错误转换为本地化错误
   */
  localize(err: unknown): LocalizedError {
    if (err instanceof Error) {
      const code = this.detectCode(err);
      const known = code ? this.get(code) : null;
      if (known) return known;
      return {
        code: 'E0001',
        severity: 'error',
        title: err.message,
        description: err.stack ?? '',
        steps: ['查看完整堆栈', '搜索错误信息', '提交 Issue 并附上堆栈'],
        retryable: false,
      };
    }
    return {
      code: 'E0001',
      severity: 'error',
      title: String(err),
      description: '',
      steps: [],
      retryable: false,
    };
  }

  registerError(error: Omit<typeof ERRORS[string], 'messages'> & { messages: Record<Locale, { title: string; description: string; steps: string[] }> }): void {
    ERRORS[error.code as string] = error;
  }

  private detectCode(err: Error): string | null {
    const m = err.message.match(/^E\d{4}/);
    return m?.[0] ?? null;
  }
}

export const errorLocalizer = new ErrorLocalizer();
