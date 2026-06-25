import { globalEventBus } from './event-bus';

export interface SpriteRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteFrame {
  filename: string;
  frame: SpriteRect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: SpriteRect;
  sourceSize: { width: number; height: number };
}

export interface SpriteMeta {
  app: string;
  version: string;
  image: string;
  format: string;
  size: { width: number; height: number };
  scale: number;
  smartupdate?: string;
}

export interface SpriteAtlasData {
  frames: SpriteFrame[];
  meta: SpriteMeta;
}

export interface SpriteItem {
  id: string;
  name: string;
  sourceWidth: number;
  sourceHeight: number;
  trimmedWidth: number;
  trimmedHeight: number;
  offsetX: number;
  offsetY: number;
  frame?: SpriteRect;
  rotated: boolean;
  trimmed: boolean;
  imageData?: string;
  filePath?: string;
  addedAt: number;
}

export interface AtlasPackingOptions {
  padding: number;
  maxWidth: number;
  maxHeight: number;
  powerOfTwo: boolean;
  allowRotation: boolean;
  trimTransparency: boolean;
  trimThreshold: number;
  algorithm: 'maxrects' | 'shelf' | 'skyline';
}

export interface AtlasInfo {
  spriteCount: number;
  width: number;
  height: number;
  usedArea: number;
  totalArea: number;
  efficiency: number;
  originalTotalSize: number;
  packedSize: number;
  compressionRatio: number;
}

export type ExportFormat = 'json' | 'xml' | 'css' | 'plist';

export interface ExportOptions {
  format: ExportFormat;
  pretty?: boolean;
  includeMetadata?: boolean;
}

export interface CompressionOptions {
  enabled: boolean;
  quality: number;
  format: 'png' | 'jpg' | 'webp';
}

export class SpriteAtlasService {
  private atlases = new Map<string, {
    id: string;
    name: string;
    sprites: Map<string, SpriteItem>;
    packingOptions: AtlasPackingOptions;
    compressionOptions: CompressionOptions;
    packedData?: SpriteAtlasData;
    atlasImage?: string;
    createdAt: number;
    updatedAt: number;
  }>();

  private activeAtlasId?: string;

  constructor() {
    this.loadMockAtlases();
  }

  getAtlases(): Array<{ id: string; name: string; spriteCount: number; createdAt: number; updatedAt: number }> {
    return Array.from(this.atlases.values()).map(a => ({
      id: a.id,
      name: a.name,
      spriteCount: a.sprites.size,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  getAtlas(atlasId: string) {
    return this.atlases.get(atlasId);
  }

  getActiveAtlas() {
    return this.activeAtlasId ? this.atlases.get(this.activeAtlasId) : undefined;
  }

  setActiveAtlas(atlasId: string): void {
    if (!this.atlases.has(atlasId)) {
      throw new Error(`图集不存在: ${atlasId}`);
    }
    this.activeAtlasId = atlasId;

    globalEventBus.emit({
      type: 'spriteAtlas:activeAtlasChanged',
      payload: { atlasId },
    });
  }

  createAtlas(name: string, options?: Partial<AtlasPackingOptions>): string {
    const id = this.generateId();
    const defaultOptions: AtlasPackingOptions = {
      padding: 2,
      maxWidth: 2048,
      maxHeight: 2048,
      powerOfTwo: true,
      allowRotation: true,
      trimTransparency: true,
      trimThreshold: 1,
      algorithm: 'maxrects',
    };
    const atlas = {
      id,
      name,
      sprites: new Map<string, SpriteItem>(),
      packingOptions: {
        ...defaultOptions,
        ...options,
      },
      compressionOptions: {
        enabled: false,
        quality: 0.8,
        format: 'png' as const,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.atlases.set(id, atlas);

    globalEventBus.emit({
      type: 'spriteAtlas:atlasCreated',
      payload: { id, name },
    });

    return id;
  }

  deleteAtlas(atlasId: string): void {
    if (!this.atlases.has(atlasId)) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    this.atlases.delete(atlasId);

    if (this.activeAtlasId === atlasId) {
      this.activeAtlasId = undefined;
    }

    globalEventBus.emit({
      type: 'spriteAtlas:atlasDeleted',
      payload: { atlasId },
    });
  }

  renameAtlas(atlasId: string, newName: string): void {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    atlas.name = newName;
    atlas.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'spriteAtlas:atlasRenamed',
      payload: { atlasId, newName },
    });
  }

  duplicateAtlas(atlasId: string, newName: string): string {
    const source = this.atlases.get(atlasId);
    if (!source) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    const newId = this.createAtlas(newName);
    const newAtlas = this.atlases.get(newId)!;

    source.sprites.forEach((sprite, id) => {
      const newSprite: SpriteItem = {
        ...sprite,
        id: this.generateId(),
        addedAt: Date.now(),
      };
      newAtlas.sprites.set(newSprite.id, newSprite);
    });

    newAtlas.packingOptions = { ...source.packingOptions };
    newAtlas.compressionOptions = { ...source.compressionOptions };
    newAtlas.updatedAt = Date.now();

    return newId;
  }

  getSprites(atlasId: string): SpriteItem[] {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) return [];
    return Array.from(atlas.sprites.values());
  }

  getSprite(atlasId: string, spriteId: string): SpriteItem | undefined {
    const atlas = this.atlases.get(atlasId);
    return atlas?.sprites.get(spriteId);
  }

  addSprite(atlasId: string, name: string, width: number, height: number, imageData?: string): SpriteItem {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    const trimmedResult = atlas.packingOptions.trimTransparency
      ? this.simulateTrim(width, height)
      : { trimmedWidth: width, trimmedHeight: height, offsetX: 0, offsetY: 0, trimmed: false };

    const sprite: SpriteItem = {
      id: this.generateId(),
      name,
      sourceWidth: width,
      sourceHeight: height,
      trimmedWidth: trimmedResult.trimmedWidth,
      trimmedHeight: trimmedResult.trimmedHeight,
      offsetX: trimmedResult.offsetX,
      offsetY: trimmedResult.offsetY,
      rotated: false,
      trimmed: trimmedResult.trimmed,
      imageData,
      addedAt: Date.now(),
    };

    atlas.sprites.set(sprite.id, sprite);
    atlas.updatedAt = Date.now();
    atlas.packedData = undefined;

    globalEventBus.emit({
      type: 'spriteAtlas:spriteAdded',
      payload: { atlasId, sprite },
    });

    return sprite;
  }

  addSprites(atlasId: string, sprites: Array<{ name: string; width: number; height: number; imageData?: string }>): SpriteItem[] {
    const result: SpriteItem[] = [];
    sprites.forEach(s => {
      result.push(this.addSprite(atlasId, s.name, s.width, s.height, s.imageData));
    });
    return result;
  }

  removeSprite(atlasId: string, spriteId: string): void {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    if (!atlas.sprites.has(spriteId)) {
      throw new Error(`精灵不存在: ${spriteId}`);
    }

    atlas.sprites.delete(spriteId);
    atlas.updatedAt = Date.now();
    atlas.packedData = undefined;

    globalEventBus.emit({
      type: 'spriteAtlas:spriteRemoved',
      payload: { atlasId, spriteId },
    });
  }

  updateSprite(atlasId: string, spriteId: string, updates: Partial<SpriteItem>): SpriteItem {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    const sprite = atlas.sprites.get(spriteId);
    if (!sprite) {
      throw new Error(`精灵不存在: ${spriteId}`);
    }

    Object.assign(sprite, updates);
    atlas.updatedAt = Date.now();
    atlas.packedData = undefined;

    globalEventBus.emit({
      type: 'spriteAtlas:spriteUpdated',
      payload: { atlasId, spriteId, updates },
    });

    return sprite;
  }

  reorderSprites(atlasId: string, spriteIds: string[]): void {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) return;

    atlas.updatedAt = Date.now();
    atlas.packedData = undefined;

    globalEventBus.emit({
      type: 'spriteAtlas:spritesReordered',
      payload: { atlasId },
    });
  }

  getPackingOptions(atlasId: string): AtlasPackingOptions | undefined {
    return this.atlases.get(atlasId)?.packingOptions;
  }

  setPackingOptions(atlasId: string, options: Partial<AtlasPackingOptions>): void {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    Object.assign(atlas.packingOptions, options);
    atlas.updatedAt = Date.now();
    atlas.packedData = undefined;

    globalEventBus.emit({
      type: 'spriteAtlas:packingOptionsChanged',
      payload: { atlasId, options },
    });
  }

  getCompressionOptions(atlasId: string): CompressionOptions | undefined {
    return this.atlases.get(atlasId)?.compressionOptions;
  }

  setCompressionOptions(atlasId: string, options: Partial<CompressionOptions>): void {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    Object.assign(atlas.compressionOptions, options);
    atlas.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'spriteAtlas:compressionOptionsChanged',
      payload: { atlasId, options },
    });
  }

  packAtlas(atlasId: string): SpriteAtlasData {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    const sprites = Array.from(atlas.sprites.values());
    const options = atlas.packingOptions;

    const packedSprites = this.maxRectsPack(sprites, options);

    let atlasWidth = 0;
    let atlasHeight = 0;
    packedSprites.forEach(s => {
      if (s.frame) {
        atlasWidth = Math.max(atlasWidth, s.frame.x + s.frame.width);
        atlasHeight = Math.max(atlasHeight, s.frame.y + s.frame.height);
      }
    });

    if (options.powerOfTwo) {
      atlasWidth = this.nextPowerOfTwo(atlasWidth);
      atlasHeight = this.nextPowerOfTwo(atlasHeight);
    }

    atlasWidth = Math.min(atlasWidth, options.maxWidth);
    atlasHeight = Math.min(atlasHeight, options.maxHeight);

    const frames: SpriteFrame[] = packedSprites
      .filter(s => s.frame)
      .map(s => ({
        filename: s.name,
        frame: s.frame!,
        rotated: s.rotated,
        trimmed: s.trimmed,
        spriteSourceSize: {
          x: s.offsetX,
          y: s.offsetY,
          width: s.trimmedWidth,
          height: s.trimmedHeight,
        },
        sourceSize: {
          width: s.sourceWidth,
          height: s.sourceHeight,
        },
      }));

    const data: SpriteAtlasData = {
      frames,
      meta: {
        app: 'TapDev Sprite Atlas',
        version: '1.0',
        image: `${atlas.name}.png`,
        format: atlas.compressionOptions.format,
        size: { width: atlasWidth, height: atlasHeight },
        scale: 1,
      },
    };

    atlas.packedData = data;
    atlas.updatedAt = Date.now();

    packedSprites.forEach(s => {
      const sprite = atlas.sprites.get(s.id);
      if (sprite && s.frame) {
        sprite.frame = s.frame;
        sprite.rotated = s.rotated;
      }
    });

    globalEventBus.emit({
      type: 'spriteAtlas:atlasPacked',
      payload: { atlasId, width: atlasWidth, height: atlasHeight, spriteCount: frames.length },
    });

    return data;
  }

  getAtlasInfo(atlasId: string): AtlasInfo {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    const sprites = Array.from(atlas.sprites.values());
    const spriteCount = sprites.length;

    let originalTotalSize = 0;
    sprites.forEach(s => {
      originalTotalSize += s.sourceWidth * s.sourceHeight;
    });

    let width = 0;
    let height = 0;
    let usedArea = 0;

    if (atlas.packedData) {
      width = atlas.packedData.meta.size.width;
      height = atlas.packedData.meta.size.height;
      atlas.packedData.frames.forEach(f => {
        usedArea += f.frame.width * f.frame.height;
      });
    } else {
      const packed = this.maxRectsPack(sprites, atlas.packingOptions);
      packed.forEach(s => {
        if (s.frame) {
          width = Math.max(width, s.frame.x + s.frame.width);
          height = Math.max(height, s.frame.y + s.frame.height);
          usedArea += s.frame.width * s.frame.height;
        }
      });
    }

    const totalArea = width * height;
    const efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
    const packedSize = totalArea;
    const compressionRatio = originalTotalSize > 0 ? (1 - packedSize / originalTotalSize) * 100 : 0;

    return {
      spriteCount,
      width,
      height,
      usedArea,
      totalArea,
      efficiency,
      originalTotalSize,
      packedSize,
      compressionRatio,
    };
  }

  exportAtlas(atlasId: string, options: ExportOptions): string {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) {
      throw new Error(`图集不存在: ${atlasId}`);
    }

    if (!atlas.packedData) {
      this.packAtlas(atlasId);
    }

    const data = atlas.packedData!;

    switch (options.format) {
      case 'json':
        return options.pretty 
          ? JSON.stringify(data, null, 2) 
          : JSON.stringify(data);
      case 'xml':
        return this.exportXML(data);
      case 'css':
        return this.exportCSS(data);
      case 'plist':
        return this.exportPlist(data);
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  searchSprites(atlasId: string, query: string): SpriteItem[] {
    const atlas = this.atlases.get(atlasId);
    if (!atlas) return [];

    const lowerQuery = query.toLowerCase();
    return Array.from(atlas.sprites.values()).filter(
      s => s.name.toLowerCase().includes(lowerQuery)
    );
  }

  sortSprites(atlasId: string, by: 'name' | 'size' | 'date', order: 'asc' | 'desc' = 'asc'): SpriteItem[] {
    const sprites = this.getSprites(atlasId);

    return sprites.sort((a, b) => {
      let comparison = 0;
      switch (by) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = (a.sourceWidth * a.sourceHeight) - (b.sourceWidth * b.sourceHeight);
          break;
        case 'date':
          comparison = a.addedAt - b.addedAt;
          break;
      }
      return order === 'asc' ? comparison : -comparison;
    });
  }

  private maxRectsPack(sprites: SpriteItem[], options: AtlasPackingOptions): SpriteItem[] {
    const sorted = [...sprites].sort((a, b) => {
      const areaA = a.trimmedWidth * a.trimmedHeight;
      const areaB = b.trimmedWidth * b.trimmedHeight;
      return areaB - areaA;
    });

    const result: SpriteItem[] = [];
    const padding = options.padding;

    let atlasWidth = 256;
    let atlasHeight = 256;

    interface FreeRect { x: number; y: number; width: number; height: number; }
    let freeRects: FreeRect[] = [{ x: 0, y: 0, width: options.maxWidth, height: options.maxHeight }];

    sorted.forEach(sprite => {
      let w = sprite.trimmedWidth + padding * 2;
      let h = sprite.trimmedHeight + padding * 2;
      let rotated = false;

      if (options.allowRotation && w !== h) {
        const rotatedW = h;
        const rotatedH = w;
        const normalFit = this.findBestFit(freeRects, w, h);
        const rotatedFit = this.findBestFit(freeRects, rotatedW, rotatedH);

        if (rotatedFit && (!normalFit || rotatedFit.area < normalFit.area)) {
          w = rotatedW;
          h = rotatedH;
          rotated = true;
        }
      }

      const bestFit = this.findBestFit(freeRects, w, h);
      if (bestFit) {
        const frameX = bestFit.rect.x + padding;
        const frameY = bestFit.rect.y + padding;
        const frameW = w - padding * 2;
        const frameH = h - padding * 2;

        result.push({
          ...sprite,
          frame: { x: frameX, y: frameY, width: frameW, height: frameH },
          rotated,
        });

        freeRects = this.splitFreeRects(freeRects, {
          x: bestFit.rect.x,
          y: bestFit.rect.y,
          width: w,
          height: h,
        });
      }
    });

    return result;
  }

  private findBestFit(
    freeRects: Array<{ x: number; y: number; width: number; height: number }>,
    w: number,
    h: number
  ): { rect: { x: number; y: number; width: number; height: number }; area: number } | null {
    let best: { rect: { x: number; y: number; width: number; height: number }; area: number } | null = null;

    for (const rect of freeRects) {
      if (rect.width >= w && rect.height >= h) {
        const area = rect.width * rect.height;
        if (!best || area < best.area) {
          best = { rect, area };
        }
      }
    }

    return best;
  }

  private splitFreeRects(freeRects: Array<{ x: number; y: number; width: number; height: number }>, used: { x: number; y: number; width: number; height: number }) {
    const result: Array<{ x: number; y: number; width: number; height: number }> = [];

    freeRects.forEach(rect => {
      if (
        used.x >= rect.x + rect.width ||
        used.x + used.width <= rect.x ||
        used.y >= rect.y + rect.height ||
        used.y + used.height <= rect.y
      ) {
        result.push(rect);
        return;
      }

      if (used.x > rect.x) {
        result.push({
          x: rect.x,
          y: rect.y,
          width: used.x - rect.x,
          height: rect.height,
        });
      }

      if (used.x + used.width < rect.x + rect.width) {
        result.push({
          x: used.x + used.width,
          y: rect.y,
          width: rect.x + rect.width - (used.x + used.width),
          height: rect.height,
        });
      }

      if (used.y > rect.y) {
        result.push({
          x: Math.max(rect.x, used.x),
          y: rect.y,
          width: Math.min(rect.x + rect.width, used.x + used.width) - Math.max(rect.x, used.x),
          height: used.y - rect.y,
        });
      }

      if (used.y + used.height < rect.y + rect.height) {
        result.push({
          x: Math.max(rect.x, used.x),
          y: used.y + used.height,
          width: Math.min(rect.x + rect.width, used.x + used.width) - Math.max(rect.x, used.x),
          height: rect.y + rect.height - (used.y + used.height),
        });
      }
    });

    return this.pruneFreeRects(result);
  }

  private pruneFreeRects(rects: Array<{ x: number; y: number; width: number; height: number }>) {
    const result: Array<{ x: number; y: number; width: number; height: number }> = [];

    for (let i = 0; i < rects.length; i++) {
      let contained = false;
      for (let j = 0; j < rects.length; j++) {
        if (i !== j) {
          const a = rects[i];
          const b = rects[j];
          if (
            a.x >= b.x &&
            a.y >= b.y &&
            a.x + a.width <= b.x + b.width &&
            a.y + a.height <= b.y + b.height
          ) {
            contained = true;
            break;
          }
        }
      }
      if (!contained) {
        result.push(rects[i]);
      }
    }

    return result;
  }

  private nextPowerOfTwo(value: number): number {
    let pow = 1;
    while (pow < value) {
      pow *= 2;
    }
    return pow;
  }

  private simulateTrim(width: number, height: number) {
    const trimPercent = 0.05 + Math.random() * 0.1;
    const trimmed = Math.random() > 0.3;
    if (!trimmed) {
      return { trimmedWidth: width, trimmedHeight: height, offsetX: 0, offsetY: 0, trimmed: false };
    }
    const trimX = Math.floor(width * trimPercent);
    const trimY = Math.floor(height * trimPercent);
    return {
      trimmedWidth: width - trimX * 2,
      trimmedHeight: height - trimY * 2,
      offsetX: trimX,
      offsetY: trimY,
      trimmed: true,
    };
  }

  private exportXML(data: SpriteAtlasData): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<TextureAtlas imagePath="${data.meta.image}" width="${data.meta.size.width}" height="${data.meta.size.height}">\n`;

    data.frames.forEach(frame => {
      xml += `  <SubTexture name="${frame.filename}" x="${frame.frame.x}" y="${frame.frame.y}" width="${frame.frame.width}" height="${frame.frame.height}"`;
      if (frame.rotated) xml += ' rotated="true"';
      if (frame.trimmed) {
        xml += ` frameX="${frame.spriteSourceSize.x}" frameY="${frame.spriteSourceSize.y}" frameWidth="${frame.spriteSourceSize.width}" frameHeight="${frame.spriteSourceSize.height}"`;
      }
      xml += ` sourceWidth="${frame.sourceSize.width}" sourceHeight="${frame.sourceSize.height}"/>\n`;
    });

    xml += '</TextureAtlas>';
    return xml;
  }

  private exportCSS(data: SpriteAtlasData): string {
    let css = `/* Sprite Atlas: ${data.meta.image} */\n`;
    css += `.sprite {\n`;
    css += `  background-image: url('${data.meta.image}');\n`;
    css += `  background-repeat: no-repeat;\n`;
    css += `  display: inline-block;\n`;
    css += `}\n\n`;

    data.frames.forEach(frame => {
      const className = frame.filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-');
      css += `.sprite-${className} {\n`;
      css += `  width: ${frame.frame.width}px;\n`;
      css += `  height: ${frame.frame.height}px;\n`;
      css += `  background-position: -${frame.frame.x}px -${frame.frame.y}px;\n`;
      if (frame.rotated) {
        css += `  transform: rotate(-90deg);\n`;
      }
      css += `}\n\n`;
    });

    return css;
  }

  private exportPlist(data: SpriteAtlasData): string {
    let plist = '<?xml version="1.0" encoding="UTF-8"?>\n';
    plist += '<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';
    plist += '<plist version="1.0">\n';
    plist += '<dict>\n';
    plist += '  <key>frames</key>\n';
    plist += '  <dict>\n';

    data.frames.forEach(frame => {
      plist += `    <key>${frame.filename}</key>\n`;
      plist += '    <dict>\n';
      plist += `      <key>frame</key><string>{{${frame.frame.x},${frame.frame.y}},{${frame.frame.width},${frame.frame.height}}}</string>\n`;
      plist += `      <key>rotated</key><${frame.rotated ? 'true' : 'false'}/>\n`;
      plist += `      <key>trimmed</key><${frame.trimmed ? 'true' : 'false'}/>\n`;
      plist += `      <key>offset</key><string>{{${frame.spriteSourceSize.x},${frame.spriteSourceSize.y}}}</string>\n`;
      plist += `      <key>sourceSize</key><string>{${frame.sourceSize.width},${frame.sourceSize.height}}</string>\n`;
      plist += '    </dict>\n';
    });

    plist += '  </dict>\n';
    plist += '  <key>metadata</key>\n';
    plist += '  <dict>\n';
    plist += `    <key>format</key><integer>2</integer>\n`;
    plist += `    <key>size</key><string>{${data.meta.size.width},${data.meta.size.height}}</string>\n`;
    plist += `    <key>textureFileName</key><string>${data.meta.image}</string>\n`;
    plist += '  </dict>\n';
    plist += '</dict>\n';
    plist += '</plist>';

    return plist;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private loadMockAtlases(): void {
    const atlasId = this.createAtlas('game_sprites');
    
    const mockSprites = [
      { name: 'player_idle_01.png', w: 64, h: 64 },
      { name: 'player_idle_02.png', w: 64, h: 64 },
      { name: 'player_run_01.png', w: 64, h: 64 },
      { name: 'player_run_02.png', w: 64, h: 64 },
      { name: 'player_jump.png', w: 64, h: 80 },
      { name: 'enemy_slime.png', w: 48, h: 40 },
      { name: 'enemy_goblin.png', w: 56, h: 72 },
      { name: 'item_coin.png', w: 24, h: 24 },
      { name: 'item_potion_red.png', w: 32, h: 32 },
      { name: 'item_potion_blue.png', w: 32, h: 32 },
      { name: 'ui_button_normal.png', w: 200, h: 60 },
      { name: 'ui_button_hover.png', w: 200, h: 60 },
      { name: 'ui_button_pressed.png', w: 200, h: 60 },
      { name: 'bg_mountain.png', w: 512, h: 256 },
      { name: 'bg_cloud.png', w: 128, h: 64 },
      { name: 'effect_explosion.png', w: 128, h: 128 },
    ];

    mockSprites.forEach(s => {
      this.addSprite(atlasId, s.name, s.w, s.h);
    });

    this.packAtlas(atlasId);
  }
}

export const spriteAtlasService = new SpriteAtlasService();
