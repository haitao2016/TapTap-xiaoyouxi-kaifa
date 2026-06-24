import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { homedir, platform } from 'node:os';
import type { UnityInstallation, UnityProjectValidation, UnityBuildOptions, UnityBuildProgress } from '@tapdev/types';

const TAPTAP_PACKAGE_NAMES = ['com.taptap.minigame', 'com.taptap.minigame.sdk'];
const BUILD_SCRIPT_REL = 'Assets/Editor/TapDevBuildRunner.cs';

export class UnityDetector {
  detectInstallations(): UnityInstallation[] {
    const found: UnityInstallation[] = [];
    const seen = new Set<string>();

    const add = (path: string, version: string, isHub: boolean) => {
      const normalized = path.toLowerCase();
      if (seen.has(normalized) || !existsSync(path)) return;
      seen.add(normalized);
      found.push({ path, version, isHub });
    };

    if (platform() === 'win32') {
      this.detectWindowsUnity(add);
    } else if (platform() === 'darwin') {
      this.detectMacUnity(add);
    } else {
      this.detectLinuxUnity(add);
    }

    return found.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  }

  private detectWindowsUnity(add: (p: string, v: string, hub: boolean) => void): void {
    const hubRoot = join(homedir(), 'AppData', 'Local', 'Unity', 'Hub', 'Editor');
    if (existsSync(hubRoot)) {
      for (const ver of readdirSync(hubRoot)) {
        add(join(hubRoot, ver, 'Editor', 'Unity.exe'), ver, true);
      }
    }

    try {
      const reg = execSync(
        'reg query "HKLM\\SOFTWARE\\Unity Technologies\\Installer\\Unity" /s',
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const matches = reg.matchAll(/Unity\s+\d+\.\d+\.\d+[a-z\d]*\s+REG_SZ\s+(.+)/gi);
      for (const m of matches) {
        const p = m[1]?.trim();
        if (p) add(join(p, 'Editor', 'Unity.exe'), basename(p), false);
      }
    } catch {
      /* registry not available */
    }
  }

  private detectMacUnity(add: (p: string, v: string, hub: boolean) => void): void {
    const hubRoot = '/Applications/Unity/Hub/Editor';
    if (existsSync(hubRoot)) {
      for (const ver of readdirSync(hubRoot)) {
        add(join(hubRoot, ver, 'Unity.app', 'Contents', 'MacOS', 'Unity'), ver, true);
      }
    }
  }

  private detectLinuxUnity(add: (p: string, v: string, hub: boolean) => void): void {
    const hubRoot = join(homedir(), 'Unity', 'Hub', 'Editor');
    if (existsSync(hubRoot)) {
      for (const ver of readdirSync(hubRoot)) {
        add(join(hubRoot, ver, 'Editor', 'Unity'), ver, true);
      }
    }
  }
}

export class UnityBuildRunner {
  private detector = new UnityDetector();
  private activeProcess: ChildProcess | null = null;
  private cancelled = false;

  detectUnity(): UnityInstallation[] {
    return this.detector.detectInstallations();
  }

  validateProject(projectPath: string): UnityProjectValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!existsSync(projectPath)) {
      return {
        valid: false,
        projectPath,
        tapTapSDK: { installed: false, hasBuildScript: false },
        errors: ['项目路径不存在'],
        warnings: [],
      };
    }

    if (!existsSync(join(projectPath, 'Assets'))) {
      errors.push('不是有效的 Unity 项目（缺少 Assets 目录）');
    }

    const projectVersionPath = join(projectPath, 'ProjectSettings', 'ProjectVersion.txt');
    let unityVersion: string | undefined;
    if (existsSync(projectVersionPath)) {
      const content = readFileSync(projectVersionPath, 'utf8');
      unityVersion = content.match(/m_EditorVersion:\s*(.+)/)?.[1]?.trim();
    } else {
      warnings.push('未找到 ProjectVersion.txt');
    }

    const tapTapSDK = this.detectTapTapSDK(projectPath);
    if (!tapTapSDK.installed) {
      errors.push(
        '未检测到 TapTap 小游戏 SDK。请安装: https://github.com/taptap/minigame-sdk-unity.git'
      );
    }

    const hasBuildScript = existsSync(join(projectPath, BUILD_SCRIPT_REL));
    if (!hasBuildScript) {
      warnings.push('未找到 TapDevBuildRunner.cs，构建时将自动安装 Editor 脚本');
    }

    return {
      valid: errors.length === 0,
      projectPath,
      unityVersion,
      tapTapSDK: { ...tapTapSDK, hasBuildScript },
      errors,
      warnings,
    };
  }

  detectTapTapSDK(projectPath: string) {
    const manifestPath = join(projectPath, 'Packages', 'manifest.json');
    if (!existsSync(manifestPath)) {
      return { installed: false, hasBuildScript: false };
    }

    const manifest = readFileSync(manifestPath, 'utf8');
    for (const pkg of TAPTAP_PACKAGE_NAMES) {
      if (manifest.includes(pkg)) {
        return {
          installed: true,
          packagePath: `Packages/${pkg}`,
          packageVersion: manifest.match(new RegExp(`"${pkg}"\\s*:\\s*"([^"]+)"`))?.[1],
          hasBuildScript: existsSync(join(projectPath, BUILD_SCRIPT_REL)),
        };
      }
    }

    return { installed: false, hasBuildScript: false };
  }

  installBuildScript(projectPath: string): void {
    const target = join(projectPath, BUILD_SCRIPT_REL);
    if (existsSync(target)) return;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, BUILD_SCRIPT_TEMPLATE, 'utf8');
  }

  cancel(): void {
    this.cancelled = true;
    if (this.activeProcess && !this.activeProcess.killed) {
      if (process.platform === 'win32') {
        // Windows: 使用 taskkill 强制终止进程树
        spawn('taskkill', ['/F', '/T', '/PID', this.activeProcess.pid.toString()]);
      } else {
        // Unix: 先尝试 SIGTERM，5秒后强制 SIGKILL
        this.activeProcess.kill('SIGTERM');
        setTimeout(() => this.activeProcess?.kill('SIGKILL'), 5000);
      }
    }
  }

  async build(
    options: UnityBuildOptions,
    onProgress?: (p: UnityBuildProgress) => void
  ): Promise<{ success: boolean; outputFiles: string[]; errors: string[]; warnings: string[]; logFile: string }> {
    this.cancelled = false;
    const errors: string[] = [];
    const warnings: string[] = [];
    const outputFiles: string[] = [];

    onProgress?.({ phase: 'validate', progress: 5, message: '验证 Unity 项目...' });
    const validation = this.validateProject(options.projectPath);
    warnings.push(...validation.warnings);
    if (!validation.valid) {
      return { success: false, outputFiles, errors: validation.errors, warnings, logFile: '' };
    }

    const unityPath = options.unityPath ?? this.pickUnityPath(validation.unityVersion);
    if (!unityPath || !existsSync(unityPath)) {
      return {
        success: false,
        outputFiles,
        errors: ['未找到 Unity 编辑器，请在设置中指定 Unity 路径'],
        warnings,
        logFile: '',
      };
    }

    onProgress?.({ phase: 'prepare', progress: 10, message: '安装 TapDev 构建脚本...' });
    this.installBuildScript(options.projectPath);

    mkdirSync(options.outputPath, { recursive: true });
    const logFile = join(options.outputPath, `tapdev-build-${Date.now()}.log`);

    onProgress?.({ phase: 'unity-build', progress: 15, message: '启动 Unity BatchMode 构建...' });

    const args = [
      '-batchmode',
      '-nographics',
      '-quit',
      '-projectPath',
      options.projectPath,
      '-executeMethod',
      'TapDevStudio.BuildRunner.ExecuteBuild',
      '-logFile',
      logFile,
      '-tapdevOutput',
      options.outputPath,
      '-tapdevWasmSplit',
      options.wasmSplit ? '1' : '0',
      '-tapdevDevelopment',
      options.development ? '1' : '0',
    ];

    if (options.cdnUrl) args.push('-tapdevCdnUrl', options.cdnUrl);
    if (options.appId) args.push('-tapdevAppId', options.appId);

    const exitCode = await this.runUnity(unityPath, args, logFile, onProgress);

    onProgress?.({ phase: 'verify', progress: 90, message: '验证构建产物...' });

    for (const file of ['game.zip', 'game_wasm_split.zip', 'game.json']) {
      const full = join(options.outputPath, file);
      if (existsSync(full)) outputFiles.push(full);
    }

    if (exitCode !== 0) {
      errors.push(`Unity 构建失败 (exit code ${exitCode})`);
      const logTail = this.readLogTail(logFile, 30);
      errors.push(...logTail.filter((l) => /error/i.test(l)).slice(-5));
    }

    if (outputFiles.length === 0) {
      warnings.push('未找到标准输出文件，请确认已在 Unity 中配置 TapTap 构建面板');
    }

    onProgress?.({ phase: 'done', progress: 100, message: outputFiles.length ? '构建完成' : '构建失败' });

    return { success: errors.length === 0 && outputFiles.length > 0, outputFiles, errors, warnings, logFile };
  }

  private pickUnityPath(projectVersion?: string): string | undefined {
    const installs = this.detector.detectInstallations();
    if (projectVersion) {
      const prefix = projectVersion.split('.').slice(0, 2).join('.');
      const match = installs.find((i) => i.version.startsWith(prefix));
      if (match) return match.path;
    }
    return installs[0]?.path;
  }

  private runUnity(
    unityPath: string,
    args: string[],
    logFile: string,
    onProgress?: (p: UnityBuildProgress) => void
  ): Promise<number> {
    return new Promise((resolve) => {
      this.activeProcess = spawn(unityPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let lastProgress = 15;

      const poll = setInterval(() => {
        if (this.cancelled) {
          clearInterval(poll);
          if (this.activeProcess) {
            this.activeProcess.kill();
            this.activeProcess = null;
          }
          resolve(1);
          return;
        }
        if (existsSync(logFile)) {
          const tail = this.readLogTail(logFile, 5).join(' ');
          if (/CompileScripts|Building|Compress|Packaging/i.test(tail)) {
            lastProgress = Math.min(lastProgress + 2, 85);
            onProgress?.({ phase: 'unity-build', progress: lastProgress, message: tail.slice(0, 120) });
          }
        }
      }, 2000);

      this.activeProcess.on('close', (code) => {
        clearInterval(poll);
        this.activeProcess = null;
        resolve(code ?? 1);
      });

      this.activeProcess.on('error', () => {
        clearInterval(poll);
        resolve(1);
      });
    });
  }

  private readLogTail(logFile: string, lines: number): string[] {
    if (!existsSync(logFile)) return [];
    return readFileSync(logFile, 'utf8').split('\n').slice(-lines).filter(Boolean);
  }
}

const BUILD_SCRIPT_TEMPLATE = `#if UNITY_EDITOR
using System;
using System.Diagnostics;
using System.IO;
using UnityEditor;

namespace TapDevStudio
{
    public static class BuildRunner
    {
        public static void ExecuteBuild()
        {
            var output = GetArg("-tapdevOutput") ?? Path.Combine(Directory.GetCurrentDirectory(), "Build");
            Directory.CreateDirectory(output);
            EditorApplication.ExecuteMenuItem("TapTap 小游戏/构建");
            UnityEngine.Debug.Log("[TapDev] Triggered TapTap build. Output: " + output);
            EditorApplication.Exit(0);
        }

        public static void ExecuteMenuBuild()
        {
            EditorApplication.ExecuteMenuItem("TapTap 小游戏/构建");
            EditorApplication.Exit(0);
        }

        static string GetArg(string name)
        {
            var args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
                if (args[i] == name) return args[i + 1];
            return null;
        }
    }
}
#endif
`;

export const unityBuildRunner = new UnityBuildRunner();
export const unityDetector = new UnityDetector();
