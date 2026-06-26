// 美术资源协作审查
// 图片/动画在线预览批注、版本对比、评审流程

import { globalEventBus } from '../core/event-bus';

// 资源类型
export type AssetType = 'image' | 'animation' | '3d-model' | 'audio' | 'video';

// 资源
export interface ArtAsset {
  id: string;
  name: string;
  type: AssetType;
  format: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // 动画/音视频
  version: number;
  projectId: string;
  uploader: string;
  uploadedAt: number;
  tags: string[];
  status: 'uploading' | 'pending' | 'in-review' | 'approved' | 'rejected' | 'archived';
  // 规范
  spec: {
    maxSize?: number;
    requiredFormat?: string[];
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
  // 批注
  annotations: Annotation[];
  // 评审
  reviews: AssetReview[];
  // 规范检查结果
  specViolations: { rule: string; message: string; severity: 'error' | 'warning' }[];
}

// 批注
export interface Annotation {
  id: string;
  author: string;
  type: 'point' | 'rect' | 'arrow' | 'freehand' | 'text';
  position: { x: number; y: number };
  size?: { width: number; height: number };
  path?: { x: number; y: number }[]; // freehand
  text: string;
  color: string;
  resolved: boolean;
  timestamp: number;
  replies: { author: string; content: string; timestamp: number }[];
}

// 评审
export interface AssetReview {
  id: string;
  reviewer: string;
  decision: 'approve' | 'reject' | 'request-changes';
  comment: string;
  timestamp: number;
  // 评分
  rating: {
    quality: number; // 1-5
    consistency: number;
    performance: number;
  };
}

// 资源版本
export interface AssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  url: string;
  uploader: string;
  uploadedAt: number;
  changeNote: string;
  size: number;
  // 与前一版本的差异
  diff?: {
    addedPixels: number;
    removedPixels: number;
    modifiedPixels: number;
    similarity: number; // 0-1
  };
}

class ArtAssetReviewService {
  private assets = new Map<string, ArtAsset>();
  private versions = new Map<string, AssetVersion[]>(); // assetId -> versions
  private listeners = new Set<(event: string, data: any) => void>();
  private currentUser = 'user-1';

  // 上传资源
  uploadAsset(config: Omit<ArtAsset, 'id' | 'version' | 'uploadedAt' | 'annotations' | 'reviews' | 'specViolations' | 'status'>): ArtAsset {
    const violations = this.checkSpec(config);

    const asset: ArtAsset = {
      ...config,
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      version: 1,
      uploadedAt: Date.now(),
      annotations: [],
      reviews: [],
      specViolations: violations,
      status: violations.some(v => v.severity === 'error') ? 'rejected' : 'pending'
    };

    this.assets.set(asset.id, asset);
    this.versions.set(asset.id, [{
      id: `ver-${Date.now()}`,
      assetId: asset.id,
      versionNumber: 1,
      url: asset.url,
      uploader: this.currentUser,
      uploadedAt: Date.now(),
      changeNote: '初始版本',
      size: asset.size
    }]);

    this.notify('asset:uploaded', asset);
    return asset;
  }

  // 检查资源规范
  private checkSpec(asset: Omit<ArtAsset, 'id' | 'version' | 'uploadedAt' | 'annotations' | 'reviews' | 'specViolations' | 'status'>): ArtAsset['specViolations'] {
    const violations: ArtAsset['specViolations'] = [];

    if (asset.spec.maxSize && asset.size > asset.spec.maxSize) {
      violations.push({
        rule: 'max-size',
        message: `资源大小 ${(asset.size / 1024).toFixed(1)}KB 超过最大限制 ${(asset.spec.maxSize / 1024).toFixed(1)}KB`,
        severity: 'error'
      });
    }

    if (asset.spec.requiredFormat && !asset.spec.requiredFormat.includes(asset.format)) {
      violations.push({
        rule: 'format',
        message: `格式 ${asset.format} 不符合要求，应为 ${asset.spec.requiredFormat.join(', ')}`,
        severity: 'error'
      });
    }

    if (asset.spec.minWidth && asset.width && asset.width < asset.spec.minWidth) {
      violations.push({
        rule: 'min-width',
        message: `宽度 ${asset.width}px 小于最小要求 ${asset.spec.minWidth}px`,
        severity: 'error'
      });
    }

    if (asset.spec.maxWidth && asset.width && asset.width > asset.spec.maxWidth) {
      violations.push({
        rule: 'max-width',
        message: `宽度 ${asset.width}px 超过最大限制 ${asset.spec.maxWidth}px`,
        severity: 'warning'
      });
    }

    if (asset.spec.minHeight && asset.height && asset.height < asset.spec.minHeight) {
      violations.push({
        rule: 'min-height',
        message: `高度 ${asset.height}px 小于最小要求 ${asset.spec.minHeight}px`,
        severity: 'error'
      });
    }

    return violations;
  }

  // 上传新版本
  uploadNewVersion(assetId: string, file: { url: string; size: number; width?: number; height?: number }, changeNote: string): AssetVersion {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('资源不存在');

    const oldVersions = this.versions.get(assetId) || [];
    const newVersion: AssetVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assetId,
      versionNumber: oldVersions.length + 1,
      url: file.url,
      uploader: this.currentUser,
      uploadedAt: Date.now(),
      changeNote,
      size: file.size,
      diff: this.calculateDiff(oldVersions[oldVersions.length - 1], file)
    };

    oldVersions.push(newVersion);
    this.versions.set(assetId, oldVersions);
    asset.version = newVersion.versionNumber;
    asset.url = file.url;
    asset.size = file.size;
    if (file.width) asset.width = file.width;
    if (file.height) asset.height = file.height;
    asset.status = 'pending';
    asset.specViolations = [];

    this.notify('version:uploaded', { assetId, version: newVersion });
    return newVersion;
  }

  // 计算差异
  private calculateDiff(oldVersion: AssetVersion | undefined, newFile: { size: number }): AssetVersion['diff'] {
    if (!oldVersion) {
      return { addedPixels: 0, removedPixels: 0, modifiedPixels: 0, similarity: 0 };
    }
    // 模拟差异计算
    const sizeDelta = Math.abs(newFile.size - oldVersion.size);
    return {
      addedPixels: Math.floor(sizeDelta * 0.5),
      removedPixels: Math.floor(sizeDelta * 0.3),
      modifiedPixels: Math.floor(sizeDelta * 0.2),
      similarity: 0.8 + Math.random() * 0.2
    };
  }

  // 添加批注
  addAnnotation(assetId: string, annotation: Omit<Annotation, 'id' | 'author' | 'timestamp' | 'resolved' | 'replies'>): Annotation {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('资源不存在');
    const newAnnotation: Annotation = {
      ...annotation,
      id: `anno-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: this.currentUser,
      timestamp: Date.now(),
      resolved: false,
      replies: []
    };
    asset.annotations.push(newAnnotation);
    this.notify('annotation:added', { assetId, annotation: newAnnotation });
    return newAnnotation;
  }

  // 回复批注
  replyAnnotation(assetId: string, annotationId: string, content: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) return;
    const anno = asset.annotations.find(a => a.id === annotationId);
    if (!anno) return;
    anno.replies.push({ author: this.currentUser, content, timestamp: Date.now() });
    this.notify('annotation:replied', { assetId, annotationId });
  }

  // 解决批注
  resolveAnnotation(assetId: string, annotationId: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) return;
    const anno = asset.annotations.find(a => a.id === annotationId);
    if (!anno) return;
    anno.resolved = true;
    this.notify('annotation:resolved', { assetId, annotationId });
  }

  // 提交评审
  submitReview(assetId: string, review: Omit<AssetReview, 'id' | 'reviewer' | 'timestamp'>): AssetReview {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('资源不存在');
    const newReview: AssetReview = {
      ...review,
      id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reviewer: this.currentUser,
      timestamp: Date.now()
    };
    asset.reviews.push(newReview);

    // 自动更新状态
    if (review.decision === 'approve') asset.status = 'approved';
    else if (review.decision === 'reject') asset.status = 'rejected';
    else asset.status = 'in-review';

    this.notify('review:submitted', { assetId, review: newReview });
    return newReview;
  }

  // 对比两个版本
  compareVersions(assetId: string, versionA: number, versionB: number): {
    similarity: number;
    differences: { region: string; type: string; severity: 'low' | 'medium' | 'high' }[];
  } {
    const versions = this.versions.get(assetId) || [];
    const vA = versions.find(v => v.versionNumber === versionA);
    const vB = versions.find(v => v.versionNumber === versionB);
    if (!vA || !vB) throw new Error('版本不存在');

    return {
      similarity: vB.diff?.similarity || 0.8,
      differences: [
        { region: '左上区域', type: '颜色变化', severity: 'low' },
        { region: '中心区域', type: '细节调整', severity: 'medium' },
        { region: '边缘', type: '尺寸变化', severity: 'low' }
      ]
    };
  }

  // 生成对比图（diff image）
  generateDiffImage(assetId: string, versionA: number, versionB: number): string {
    // 实际实现应使用 canvas 进行图像差异可视化
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#333"/><text x="200" y="150" text-anchor="middle" fill="white">Diff: v${versionA} vs v${versionB}</text></svg>`;
  }

  // 添加标签
  addTag(assetId: string, tag: string): void {
    const asset = this.assets.get(assetId);
    if (!asset) return;
    if (!asset.tags.includes(tag)) asset.tags.push(tag);
    this.notify('tag:added', { assetId, tag });
  }

  // 搜索资源
  searchAssets(query: string, filter?: { type?: AssetType; status?: ArtAsset['status']; projectId?: string }): ArtAsset[] {
    const q = query.toLowerCase();
    let assets = Array.from(this.assets.values());
    if (filter?.type) assets = assets.filter(a => a.type === filter.type);
    if (filter?.status) assets = assets.filter(a => a.status === filter.status);
    if (filter?.projectId) assets = assets.filter(a => a.projectId === filter.projectId);
    return assets.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // 获取资源
  getAsset(assetId: string): ArtAsset | undefined {
    return this.assets.get(assetId);
  }

  // 列出资源
  listAssets(filter?: { type?: AssetType; status?: ArtAsset['status']; projectId?: string }): ArtAsset[] {
    let assets = Array.from(this.assets.values());
    if (filter?.type) assets = assets.filter(a => a.type === filter.type);
    if (filter?.status) assets = assets.filter(a => a.status === filter.status);
    if (filter?.projectId) assets = assets.filter(a => a.projectId === filter.projectId);
    return assets.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  // 获取版本历史
  getVersionHistory(assetId: string): AssetVersion[] {
    return this.versions.get(assetId) || [];
  }

  // 获取指定版本
  getVersion(assetId: string, versionNumber: number): AssetVersion | undefined {
    const versions = this.versions.get(assetId) || [];
    return versions.find(v => v.versionNumber === versionNumber);
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const artAssetReviewService = new ArtAssetReviewService();
