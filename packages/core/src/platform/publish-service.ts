/**
 * TapTap 小游戏一键上传发布服务
 * - 构建产物压缩
 * - 签名
 * - 上传到 TapTap 后台
 * - 提交审核
 * - 进度跟踪
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';
import { tapTapAuthService } from './taptap-auth-service';

export type PublishStage =
  | 'preparing'
  | 'packaging'
  | 'signing'
  | 'uploading'
  | 'verifying'
  | 'submitting'
  | 'completed'
  | 'failed';

export interface PublishTask {
  id: string;
  appId: string;
  version: string;
  changelog: string;
  outputPath: string;
  stage: PublishStage;
  progress: number;
  error?: string;
  startedAt: number;
  completedAt?: number;
  /** 远程版本号 */
  remoteBuildId?: string;
}

export interface PublishConfig {
  appId: string;
  /** 语义化版本号 (semver) */
  version: string;
  changelog: string;
  /** 构建产物路径 */
  buildPath: string;
  /** 是否灰度发布 */
  grayRelease: boolean;
  /** 灰度比例 0-100 */
  grayPercent: number;
}

const TAPTAP_UPLOAD_URL = 'https://api.taptap.cn/minigame/v1/builds/upload';

export class PublishService {
  private tasks = new Map<string, PublishTask>();

  /**
   * 一键发布
   */
  async publish(config: PublishConfig): Promise<PublishTask> {
    const taskId = randomUUID();
    const task: PublishTask = {
      id: taskId,
      appId: config.appId,
      version: config.version,
      changelog: config.changelog,
      outputPath: config.buildPath,
      stage: 'preparing',
      progress: 0,
      startedAt: Date.now(),
    };
    this.tasks.set(taskId, task);
    globalEventBus.emit({ type: 'publish:start', payload: task });

    try {
      const account = tapTapAuthService.getActiveAccount();
      if (!account) {
        throw new Error('请先登录 TapTap 开发者账号');
      }

      // 1. 准备
      this.updateStage(task, 'preparing', 10);
      if (!fs.existsSync(config.buildPath)) {
        throw new Error(`构建产物不存在: ${config.buildPath}`);
      }

      // 2. 打包
      this.updateStage(task, 'packaging', 25);
      const zipPath = await this.createZip(config.buildPath, taskId);

      // 3. 签名
      this.updateStage(task, 'signing', 40);
      const signature = await this.signFile(zipPath);

      // 4. 上传
      this.updateStage(task, 'uploading', 50);
      const remoteBuildId = await this.uploadBuild(zipPath, config, account.accessToken, (p) => {
        task.progress = 50 + p * 0.3;
        globalEventBus.emit({ type: 'publish:progress', payload: task });
      });
      task.remoteBuildId = remoteBuildId;

      // 5. 验证
      this.updateStage(task, 'verifying', 85);
      await this.verify(remoteBuildId, account.accessToken);

      // 6. 提交审核
      this.updateStage(task, 'submitting', 95);
      await this.submitForReview(remoteBuildId, config, account.accessToken);

      this.updateStage(task, 'completed', 100);
      task.completedAt = Date.now();
      globalEventBus.emit({ type: 'publish:complete', payload: task });
      return task;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      task.error = message;
      this.updateStage(task, 'failed', task.progress);
      task.completedAt = Date.now();
      globalEventBus.emit({ type: 'publish:failed', payload: task });
      return task;
    }
  }

  getTask(taskId: string): PublishTask | null {
    return this.tasks.get(taskId) ?? null;
  }

  listTasks(): PublishTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  private updateStage(task: PublishTask, stage: PublishStage, progress: number): void {
    task.stage = stage;
    task.progress = progress;
    globalEventBus.emit({ type: 'publish:stage', payload: task });
  }

  private async createZip(buildPath: string, taskId: string): Promise<string> {
    // 实际应使用 archiver 等库
    const outPath = path.join(buildPath, `..`, `${taskId}.zip`);
    fs.writeFileSync(outPath, '');
    return outPath;
  }

  private async signFile(filePath: string): Promise<string> {
    // 简化的签名（实际应使用 TapTap 提供的签名工具）
    const content = fs.readFileSync(filePath);
    const { createHash } = await import('crypto');
    return createHash('sha256').update(content).digest('hex');
  }

  private async uploadBuild(
    filePath: string,
    config: PublishConfig,
    accessToken: string,
    onProgress: (p: number) => void,
  ): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append('app_id', config.appId);
    formData.append('version', config.version);
    formData.append('changelog', config.changelog);
    formData.append('package', blob, 'game.zip');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as { data: { build_id: string } };
            resolve(data.data.build_id);
          } catch {
            reject(new Error('Invalid response'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.open('POST', TAPTAP_UPLOAD_URL);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(formData);
    });
  }

  private async verify(buildId: string, accessToken: string): Promise<void> {
    const url = `https://api.taptap.cn/minigame/v1/builds/${buildId}/verify`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Verify failed: ${res.status}`);
  }

  private async submitForReview(buildId: string, config: PublishConfig, accessToken: string): Promise<void> {
    const url = `https://api.taptap.cn/minigame/v1/builds/${buildId}/submit`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gray_release: config.grayRelease,
        gray_percent: config.grayPercent,
      }),
    });
    if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  }
}

export const publishService = new PublishService();
