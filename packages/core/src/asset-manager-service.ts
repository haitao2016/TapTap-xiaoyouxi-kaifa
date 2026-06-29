import { globalEventBus } from './event-bus';
import { randomUUID } from './utils/crypto-utils';

export type AssetType = 'image' | 'audio' | 'font' | 'video' | 'spritesheet' | 'other';

export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif' | 'svg';
export type AudioFormat = 'mp3' | 'wav' | 'ogg';
export type FontFormat = 'ttf' | 'otf' | 'woff' | 'woff2';
export type VideoFormat = 'mp4' | 'webm' | 'avi';

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: string;
  frameCount?: number;
  frameWidth?: number;
  frameHeight?: number;
}

export interface AssetItem {
  id: string;
  name: string;
  path: string;
  type: AssetType;
  format: string;
  size: number;
  lastModified: number;
  metadata: AssetMetadata;
  thumbnailUrl?: string;
  previewUrl?: string;
  tags: string[];
  compressed?: boolean;
  originalSize?: number;
}

export interface AssetFilter {
  types?: AssetType[];
  formats?: string[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: number;
  dateTo?: number;
  tags?: string[];
  searchQuery?: string;
}

export interface CompressionOptions {
  quality: number;
  format?: ImageFormat | AudioFormat;
  maxWidth?: number;
  maxHeight?: number;
}

export interface CompressionResult {
  assetId: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  outputPath: string;
}

export interface ConversionResult {
  assetId: string;
  fromFormat: string;
  toFormat: string;
  outputPath: string;
  size: number;
}

export interface SpritesheetFrame {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpritesheetData {
  image: string;
  frames: SpritesheetFrame[];
  meta?: {
    size: { w: number; h: number };
    scale: number;
  };
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg'];
const FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'avi'];
const SPRITESHEET_EXTENSIONS = ['json'];

export class AssetManagerService {
  private assets = new Map<string, AssetItem>();
  private isLoading = false;
  private searchIndex: Map<string, string[]> = new Map();

  getAssets(filter?: AssetFilter): AssetItem[] {
    let result = Array.from(this.assets.values());

    if (filter) {
      if (filter.types && filter.types.length > 0) {
        result = result.filter((a) => filter.types!.includes(a.type));
      }
      if (filter.formats && filter.formats.length > 0) {
        result = result.filter((a) => filter.formats!.includes(a.format));
      }
      if (filter.minSize !== undefined) {
        result = result.filter((a) => a.size >= filter.minSize!);
      }
      if (filter.maxSize !== undefined) {
        result = result.filter((a) => a.size <= filter.maxSize!);
      }
      if (filter.dateFrom !== undefined) {
        result = result.filter((a) => a.lastModified >= filter.dateFrom!);
      }
      if (filter.dateTo !== undefined) {
        result = result.filter((a) => a.lastModified <= filter.dateTo!);
      }
      if (filter.tags && filter.tags.length > 0) {
        result = result.filter((a) => filter.tags!.some((t) => a.tags.includes(t)));
      }
      if (filter.searchQuery && filter.searchQuery.trim() !== '') {
        const query = filter.searchQuery.toLowerCase();
        result = result.filter(
          (a) =>
            a.name.toLowerCase().includes(query) ||
            a.path.toLowerCase().includes(query) ||
            a.tags.some((t) => t.toLowerCase().includes(query))
        );
      }
    }

    return result.sort((a, b) => b.lastModified - a.lastModified);
  }

  getAsset(id: string): AssetItem | undefined {
    return this.assets.get(id);
  }

  getAssetByPath(path: string): AssetItem | undefined {
    return Array.from(this.assets.values()).find((a) => a.path === path);
  }

  async loadAssets(directoryPath: string): Promise<AssetItem[]> {
    this.isLoading = true;
    globalEventBus.emit({ type: 'asset:loadingStart', payload: { directoryPath } });

    try {
      const mockAssets = this.generateMockAssets();
      mockAssets.forEach((asset) => {
        this.assets.set(asset.id, asset);
        this.updateSearchIndex(asset);
      });

      globalEventBus.emit({
        type: 'asset:loaded',
        payload: { count: mockAssets.length, assets: mockAssets },
      });
      return mockAssets;
    } catch (error) {
      globalEventBus.emit({
        type: 'asset:error',
        payload: { error: error instanceof Error ? error.message : '加载失败' },
      });
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async addAsset(filePath: string, fileData?: ArrayBuffer): Promise<AssetItem> {
    const extension = this.getExtension(filePath).toLowerCase();
    const type = this.getAssetType(extension);
    const name = this.getFileName(filePath);
    const size = fileData ? fileData.byteLength : Math.floor(Math.random() * 5000000) + 10000;

    const asset: AssetItem = {
      id: randomUUID(),
      name,
      path: filePath,
      type,
      format: extension,
      size,
      lastModified: Date.now(),
      metadata: this.generateMockMetadata(type, extension),
      tags: this.generateDefaultTags(type, extension),
    };

    if (type === 'image') {
      asset.thumbnailUrl = this.generateMockThumbnail(name);
      asset.previewUrl = asset.thumbnailUrl;
    }

    this.assets.set(asset.id, asset);
    this.updateSearchIndex(asset);

    globalEventBus.emit({ type: 'asset:added', payload: asset });
    return asset;
  }

  async removeAsset(id: string): Promise<void> {
    const asset = this.assets.get(id);
    if (!asset) return;

    this.assets.delete(id);
    this.removeFromSearchIndex(asset);

    globalEventBus.emit({ type: 'asset:removed', payload: { id, path: asset.path } });
  }

  async updateAsset(
    id: string,
    updates: Partial<Pick<AssetItem, 'name' | 'tags'>>
  ): Promise<AssetItem | undefined> {
    const asset = this.assets.get(id);
    if (!asset) return undefined;

    if (updates.name !== undefined) {
      asset.name = updates.name;
    }
    if (updates.tags !== undefined) {
      asset.tags = updates.tags;
    }
    asset.lastModified = Date.now();

    this.updateSearchIndex(asset);
    globalEventBus.emit({ type: 'asset:updated', payload: asset });
    return asset;
  }

  async compressAsset(id: string, options: CompressionOptions): Promise<CompressionResult> {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new Error('资源不存在');
    }

    if (asset.type !== 'image' && asset.type !== 'audio') {
      throw new Error('仅支持图片和音频压缩');
    }

    globalEventBus.emit({ type: 'asset:compressionStart', payload: { assetId: id, options } });

    const compressionRatio = options.quality / 100;
    const compressedSize = Math.floor(asset.size * (0.3 + compressionRatio * 0.6));

    const result: CompressionResult = {
      assetId: id,
      originalSize: asset.size,
      compressedSize,
      compressionRatio: Math.round((1 - compressedSize / asset.size) * 100) / 100,
      outputPath: asset.path.replace(/\.[^/.]+$/, `_compressed.${options.format || asset.format}`),
    };

    asset.compressed = true;
    asset.originalSize = asset.size;
    asset.size = compressedSize;
    asset.lastModified = Date.now();

    globalEventBus.emit({ type: 'asset:compressed', payload: result });
    return result;
  }

  async convertFormat(id: string, targetFormat: string): Promise<ConversionResult> {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new Error('资源不存在');
    }

    const targetExt = targetFormat.toLowerCase();
    const isValidConversion = this.isValidFormatConversion(asset.type, asset.format, targetExt);

    if (!isValidConversion) {
      throw new Error(`不支持从 ${asset.format} 转换为 ${targetExt}`);
    }

    globalEventBus.emit({ type: 'asset:conversionStart', payload: { assetId: id, targetFormat } });

    const outputPath = asset.path.replace(/\.[^/.]+$/, `.${targetExt}`);
    const size = Math.floor(asset.size * (0.8 + Math.random() * 0.4));

    const result: ConversionResult = {
      assetId: id,
      fromFormat: asset.format,
      toFormat: targetExt,
      outputPath,
      size,
    };

    asset.format = targetExt;
    asset.path = outputPath;
    asset.size = size;
    asset.lastModified = Date.now();
    asset.type = this.getAssetType(targetExt);

    globalEventBus.emit({ type: 'asset:converted', payload: result });
    return result;
  }

  async previewAsset(id: string): Promise<{ url: string; type: AssetType }> {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new Error('资源不存在');
    }

    const previewUrl =
      asset.previewUrl || asset.thumbnailUrl || this.generateMockThumbnail(asset.name);

    globalEventBus.emit({ type: 'asset:preview', payload: { assetId: id, previewUrl } });
    return { url: previewUrl, type: asset.type };
  }

  getSpritesheetData(id: string): SpritesheetData | null {
    const asset = this.assets.get(id);
    if (!asset || asset.type !== 'spritesheet') {
      return null;
    }

    return this.generateMockSpritesheetData(asset);
  }

  getStats(): {
    total: number;
    byType: Record<AssetType, number>;
    totalSize: number;
    compressedCount: number;
  } {
    const byType: Record<AssetType, number> = {
      image: 0,
      audio: 0,
      font: 0,
      video: 0,
      spritesheet: 0,
      other: 0,
    };

    let totalSize = 0;
    let compressedCount = 0;

    this.assets.forEach((asset) => {
      byType[asset.type]++;
      totalSize += asset.size;
      if (asset.compressed) compressedCount++;
    });

    return {
      total: this.assets.size,
      byType,
      totalSize,
      compressedCount,
    };
  }

  search(query: string): AssetItem[] {
    if (!query.trim()) return this.getAssets();
    return this.getAssets({ searchQuery: query });
  }

  clear(): void {
    this.assets.clear();
    this.searchIndex.clear();
    globalEventBus.emit({ type: 'asset:cleared', payload: {} });
  }

  isLoadingAssets(): boolean {
    return this.isLoading;
  }

  private getExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  private getFileName(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1];
  }

  private getAssetType(extension: string): AssetType {
    const ext = extension.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    if (FONT_EXTENSIONS.includes(ext)) return 'font';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (SPRITESHEET_EXTENSIONS.includes(ext)) return 'spritesheet';
    return 'other';
  }

  private isValidFormatConversion(type: AssetType, fromFormat: string, toFormat: string): boolean {
    const from = fromFormat.toLowerCase();
    const to = toFormat.toLowerCase();

    if (type === 'image') {
      const imageFormats = ['png', 'jpg', 'jpeg', 'webp'];
      return imageFormats.includes(from) && imageFormats.includes(to) && from !== to;
    }
    if (type === 'audio') {
      const audioFormats = ['mp3', 'wav', 'ogg'];
      return audioFormats.includes(from) && audioFormats.includes(to) && from !== to;
    }
    return false;
  }

  private generateDefaultTags(type: AssetType, format: string): string[] {
    const tags: string[] = [type, format];
    return tags;
  }

  private updateSearchIndex(asset: AssetItem): void {
    const keywords = [
      asset.name.toLowerCase(),
      asset.path.toLowerCase(),
      ...asset.tags.map((t) => t.toLowerCase()),
    ];
    this.searchIndex.set(asset.id, keywords);
  }

  private removeFromSearchIndex(asset: AssetItem): void {
    this.searchIndex.delete(asset.id);
  }

  private generateMockAssets(): AssetItem[] {
    const mockAssets: AssetItem[] = [];

    const images = [
      { name: 'player_sprite.png', size: 45678, width: 256, height: 256 },
      { name: 'background.jpg', size: 234567, width: 1920, height: 1080 },
      { name: 'logo.svg', size: 12345, width: 512, height: 512 },
      { name: 'button_hover.webp', size: 8901, width: 128, height: 64 },
      { name: 'enemy_spritesheet.png', size: 567890, width: 1024, height: 1024 },
    ];

    images.forEach((img, index) => {
      mockAssets.push({
        id: `img_${index}`,
        name: img.name,
        path: `/assets/images/${img.name}`,
        type: 'image',
        format: this.getExtension(img.name),
        size: img.size,
        lastModified: Date.now() - index * 86400000,
        metadata: {
          width: img.width,
          height: img.height,
        },
        thumbnailUrl: this.generateMockThumbnail(img.name),
        previewUrl: this.generateMockThumbnail(img.name),
        tags: ['image', this.getExtension(img.name), 'ui'],
      });
    });

    const audios = [
      { name: 'bgm_game.mp3', size: 3456789, duration: 180 },
      { name: 'sfx_jump.wav', size: 23456, duration: 0.5 },
      { name: 'sfx_collect.ogg', size: 18901, duration: 0.3 },
    ];

    audios.forEach((audio, index) => {
      mockAssets.push({
        id: `audio_${index}`,
        name: audio.name,
        path: `/assets/audio/${audio.name}`,
        type: 'audio',
        format: this.getExtension(audio.name),
        size: audio.size,
        lastModified: Date.now() - (index + 5) * 86400000,
        metadata: {
          duration: audio.duration,
          sampleRate: 44100,
          channels: 2,
          bitrate: 128000,
        },
        tags: ['audio', this.getExtension(audio.name), index === 0 ? 'bgm' : 'sfx'],
      });
    });

    const fonts = [
      { name: 'PixelFont.ttf', size: 156789, family: 'PixelFont' },
      { name: 'BoldTitle.otf', size: 234567, family: 'BoldTitle' },
    ];

    fonts.forEach((font, index) => {
      mockAssets.push({
        id: `font_${index}`,
        name: font.name,
        path: `/assets/fonts/${font.name}`,
        type: 'font',
        format: this.getExtension(font.name),
        size: font.size,
        lastModified: Date.now() - (index + 8) * 86400000,
        metadata: {
          fontFamily: font.family,
          fontWeight: 400,
          fontStyle: 'normal',
        },
        tags: ['font', this.getExtension(font.name)],
      });
    });

    const videos = [{ name: 'intro.mp4', size: 15678901, duration: 12 }];

    videos.forEach((video, index) => {
      mockAssets.push({
        id: `video_${index}`,
        name: video.name,
        path: `/assets/videos/${video.name}`,
        type: 'video',
        format: this.getExtension(video.name),
        size: video.size,
        lastModified: Date.now() - (index + 10) * 86400000,
        metadata: {
          duration: video.duration,
          width: 1920,
          height: 1080,
        },
        tags: ['video', this.getExtension(video.name)],
      });
    });

    const spritesheets = [{ name: 'hero_anim.json', size: 12345, frameCount: 16 }];

    spritesheets.forEach((ss, index) => {
      mockAssets.push({
        id: `sprite_${index}`,
        name: ss.name,
        path: `/assets/spritesheets/${ss.name}`,
        type: 'spritesheet',
        format: 'json',
        size: ss.size,
        lastModified: Date.now() - (index + 11) * 86400000,
        metadata: {
          frameCount: ss.frameCount,
          frameWidth: 64,
          frameHeight: 64,
        },
        tags: ['spritesheet', 'animation'],
      });
    });

    return mockAssets;
  }

  private generateMockMetadata(type: AssetType, format: string): AssetMetadata {
    switch (type) {
      case 'image':
        return {
          width: Math.floor(Math.random() * 1000) + 100,
          height: Math.floor(Math.random() * 1000) + 100,
        };
      case 'audio':
        return {
          duration: Math.floor(Math.random() * 300) + 1,
          sampleRate: 44100,
          channels: 2,
          bitrate: 128000,
        };
      case 'font':
        return {
          fontFamily: format,
          fontWeight: 400,
          fontStyle: 'normal',
        };
      case 'video':
        return {
          duration: Math.floor(Math.random() * 120) + 5,
          width: 1920,
          height: 1080,
        };
      case 'spritesheet':
        return {
          frameCount: Math.floor(Math.random() * 20) + 4,
          frameWidth: 64,
          frameHeight: 64,
        };
      default:
        return {};
    }
  }

  private generateMockThumbnail(name: string): string {
    const encodedName = encodeURIComponent(name)
      .replace(/%/g, '_')
      .replace(/_/g, '__');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" font-size="14" fill="#666">${encodedName}</text></svg>`;
    const base64 = typeof window !== 'undefined' ? window.btoa(svg) : Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  private generateMockSpritesheetData(asset: AssetItem): SpritesheetData {
    const frameCount = asset.metadata.frameCount || 16;
    const frameWidth = asset.metadata.frameWidth || 64;
    const frameHeight = asset.metadata.frameHeight || 64;
    const cols = Math.ceil(Math.sqrt(frameCount));
    const rows = Math.ceil(frameCount / cols);

    const frames: SpritesheetFrame[] = [];
    for (let i = 0; i < frameCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      frames.push({
        name: `frame_${i.toString().padStart(3, '0')}`,
        x: col * frameWidth,
        y: row * frameHeight,
        width: frameWidth,
        height: frameHeight,
      });
    }

    return {
      image: asset.path.replace('.json', '.png'),
      frames,
      meta: {
        size: { w: cols * frameWidth, h: rows * frameHeight },
        scale: 1,
      },
    };
  }
}

export const assetManagerService = new AssetManagerService();
