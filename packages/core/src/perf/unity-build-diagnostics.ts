/**
 * Unity 构建稳定性增强
 * - 详细错误诊断
 * - 常见错误知识库
 * - 自动修复建议
 */
import { globalEventBus } from '../event-bus';

export interface UnityBuildError {
  code: string;
  message: string;
  /** 严重级别 */
  severity: 'error' | 'warning' | 'fatal';
  /** 错误类别 */
  category: 'compile' | 'asset' | 'sdk' | 'network' | 'permission' | 'unknown';
  /** 修复建议 */
  fixes: string[];
  /** 相关文档链接 */
  docsUrl?: string;
  /** 解析后的位置 */
  location?: { file: string; line?: number; column?: number };
}

const ERROR_KB: Array<{
  pattern: RegExp;
  error: Omit<UnityBuildError, 'code' | 'message'>;
}> = [
  {
    pattern: /CS\d{4}:.*does not contain a definition/i,
    error: {
      severity: 'error',
      category: 'compile',
      fixes: ['检查方法名拼写', '确认 using 指令是否引入正确的命名空间', '检查命名空间冲突'],
    },
  },
  {
    pattern: /Library\/PackageCache.*not found/i,
    error: {
      severity: 'error',
      category: 'asset',
      fixes: [
        '删除 Library/PackageCache 目录后重新构建',
        '在 Unity 编辑器中通过 Package Manager 重新安装依赖',
      ],
      docsUrl: 'https://docs.unity3d.com/Manual/upm-troubleshooting.html',
    },
  },
  {
    pattern: /TapTap.*SDK.*not found/i,
    error: {
      severity: 'error',
      category: 'sdk',
      fixes: [
        '确认已安装 TapTap 小游戏 SDK（GitHub: taptap/minigame-sdk-unity）',
        '检查 Packages/manifest.json 是否正确添加依赖',
        '在 TapDev Studio 中点击「安装 SDK」一键安装',
      ],
      docsUrl: 'https://developer.taptap.cn/minigameapidoc/dev/engine/unity-adaptation/',
    },
  },
  {
    pattern: /Gradle.*build.*failed/i,
    error: {
      severity: 'error',
      category: 'asset',
      fixes: [
        '检查 Android SDK / NDK 路径配置',
        '升级 Gradle 版本到 7.x+',
        '检查 JDK 版本（推荐 JDK 17）',
      ],
    },
  },
  {
    pattern: /EACCES|Permission denied/i,
    error: {
      severity: 'error',
      category: 'permission',
      fixes: [
        'macOS: 系统设置 > 隐私与安全 允许 Unity 访问',
        'Windows: 以管理员身份运行',
        '检查输出目录的写入权限',
      ],
    },
  },
  {
    pattern: /connection (refused|timeout)/i,
    error: {
      severity: 'error',
      category: 'network',
      fixes: ['检查网络连接', '如果使用代理，配置 HTTPS_PROXY 环境变量', '尝试切换到国内 npm 镜像'],
    },
  },
];

export class UnityBuildDiagnostics {
  private readonly history: UnityBuildError[] = [];

  /**
   * 解析 Unity 构建错误日志
   */
  parseErrors(log: string): UnityBuildError[] {
    const errors: UnityBuildError[] = [];
    const lines = log.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i] ?? '';
      // 匹配 CS#### 错误
      const csMatch = line.match(/(.+\.cs)\((\d+),(\d+)\):\s+(error|warning)\s+(CS\d+):\s+(.+)/);
      if (csMatch) {
        const [, file, lineNum, col, severity, code, msg] = csMatch;
        const kbMatch = this.matchKnowledgeBase(msg ?? '');
        errors.push({
          code: code ?? 'CS0000',
          message: msg ?? '',
          severity: (severity as 'error' | 'warning') ?? 'error',
          category: kbMatch?.category ?? 'compile',
          fixes: kbMatch?.fixes ?? ['请查看 Unity 官方文档'],
          docsUrl: kbMatch?.docsUrl,
          location: {
            file: file ?? '',
            line: parseInt(lineNum ?? '0', 10),
            column: parseInt(col ?? '0', 10),
          },
        });
        i++;
        continue;
      }
      // 其他错误信息
      const kbMatch = this.matchKnowledgeBase(line);
      if (kbMatch) {
        errors.push({
          code: 'UNITY_GENERAL',
          message: line,
          severity: kbMatch.severity,
          category: kbMatch.category,
          fixes: kbMatch.fixes,
          docsUrl: kbMatch.docsUrl,
        });
      }
      i++;
    }
    this.history.push(...errors);
    if (this.history.length > 200) this.history.splice(0, this.history.length - 200);
    globalEventBus.emit({ type: 'unity:build-errors', payload: errors });
    return errors;
  }

  getHistory(): UnityBuildError[] {
    return [...this.history];
  }

  /**
   * 错误统计
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const e of this.history) {
      stats[e.category] = (stats[e.category] ?? 0) + 1;
    }
    return stats;
  }

  private matchKnowledgeBase(message: string): Omit<UnityBuildError, 'code' | 'message'> | null {
    for (const entry of ERROR_KB) {
      if (entry.pattern.test(message)) return entry.error;
    }
    return null;
  }
}

export const unityBuildDiagnostics = new UnityBuildDiagnostics();
