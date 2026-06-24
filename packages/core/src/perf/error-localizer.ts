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
      'zh-TW': {
        title: '專案路徑不存在',
        description: '指定的專案路徑不存在或無權限存取',
        steps: ['檢查專案路徑是否正確', '確認資料夾存在', '檢查讀寫權限'],
      },
      'en-US': {
        title: 'Project path not found',
        description: 'The specified project path does not exist or is not accessible',
        steps: ['Check the project path', 'Verify the folder exists', 'Check read/write permissions'],
      },
      'ja-JP': {
        title: 'プロジェクトパスが見つかりません',
        description: '指定されたプロジェクトパスが存在しない、またはアクセス権限がない',
        steps: ['プロジェクトパスを確認', 'フォルダが存在するか確認', '読み書き権限を確認'],
      },
      'ko-KR': {
        title: '프로젝트 경로를 찾을 수 없음',
        description: '지정된 프로젝트 경로가 없거나 접근 권한이 없음',
        steps: ['프로젝트 경로 확인', '폴더가 있는지 확인', '읽기/쓰기 권한 확인'],
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
      'zh-TW': {
        title: 'Unity 建構失敗',
        description: 'Unity BatchMode 建構過程中出現錯誤',
        steps: [
          '查看錯誤日誌詳情',
          '檢查 Unity 專案是否能正常開啟',
          '確認 SDK 已正確安裝',
          '如問題持續，重新啟動 Unity Hub',
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
      'ja-JP': {
        title: 'Unityビルド失敗',
        description: 'Unity BatchModeビルド中にエラーが発生',
        steps: [
          'エラーログを確認',
          'Unityプロジェクトが正常に開くか確認',
          'SDKが正しくインストールされているか確認',
          '問題が続く場合はUnity Hubを再起動',
        ],
      },
      'ko-KR': {
        title: 'Unity 빌드 실패',
        description: 'Unity BatchMode 빌드 중 오류 발생',
        steps: [
          '오류 로그 확인',
          'Unity 프로젝트가 정상적으로 열리는지 확인',
          'SDK가 올바르게 설치되었는지 확인',
          '문제가 지속되면 Unity Hub 재시작',
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
      'zh-TW': {
        title: '網路連線不穩定',
        description: '檢測到網路延遲較高或丟包',
        steps: ['檢查網路連線', '如使用代理請設定 HTTPS_PROXY', '稍後重試'],
      },
      'en-US': {
        title: 'Unstable network connection',
        description: 'High latency or packet loss detected',
        steps: ['Check your network', 'Configure HTTPS_PROXY if using a proxy', 'Retry later'],
      },
      'ja-JP': {
        title: 'ネットワーク接続が不安定',
        description: 'ネットワークの遅延やパケット損失が検出されました',
        steps: ['ネットワーク接続を確認', 'プロキシを使用する場合はHTTPS_PROXYを設定', '後で再試行'],
      },
      'ko-KR': {
        title: '네트워크 연결 불안정',
        description: '네트워크 지연 또는 패킷 손실 감지',
        steps: ['네트워크 연결 확인', '프록시 사용 시 HTTPS_PROXY 설정', '나중에 재시도'],
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
      'zh-TW': {
        title: 'SDK 版本不相容',
        description: '當前專案使用的 SDK 與 IDE 不相容',
        steps: ['升級 SDK 到最新版本', '或降級 IDE 到匹配版本', '查看相容性報告'],
      },
      'en-US': {
        title: 'Incompatible SDK version',
        description: 'The SDK in the project is incompatible with this IDE',
        steps: ['Upgrade SDK to latest', 'Or downgrade IDE', 'Check compatibility report'],
      },
      'ja-JP': {
        title: 'SDKバージョンの互換性なし',
        description: 'プロジェクトのSDKがIDEと互換性がない',
        steps: ['SDKを最新版にアップグレード', 'またはIDEをダウングレード', '互換性レポートを確認'],
      },
      'ko-KR': {
        title: 'SDK 버전 호환성 없음',
        description: '프로젝트의 SDK가 IDE와 호환되지 않음',
        steps: ['SDK를 최신 버전으로 업그레드', '또는 IDE를 다운그레드', '호환성 보고서 확인'],
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

  registerError(error: { code: string; severity: LocalizedError['severity']; retryable: boolean; docsUrl?: string; messages: Record<Locale, { title: string; description: string; steps: string[] }> }): void {
    ERRORS[error.code] = error;
  }

  private detectCode(err: Error): string | null {
    const m = err.message.match(/^E\d{4}/);
    return m?.[0] ?? null;
  }
}

export const errorLocalizer = new ErrorLocalizer();
