// 瓦片地图关卡编辑器
// 专业 2D 瓦片地图编辑器，支持图块集、自动拼接、多层

import { globalEventBus } from '../event-bus';

// 图块集
export interface Tileset {
  id: string;
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  tileWidth: number;
  tileHeight: number;
  spacing: number;
  margin: number;
  columns: number;
  rows: number;
  tileCount: number;
  tiles: { id: number; properties: Record<string, any> }[];
  // 自动拼接规则
  autotileRules?: { tileId: number; bitmaskNeighbors: number[]; resultTile: number }[];
}

// 地图层
export interface TileLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  tiles: (number | null)[][]; // [row][col] = tileId
  offset: { x: number; y: number };
}

// 对象层
export interface ObjectLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objects: TileMapObject[];
}

// 地图对象
export interface TileMapObject {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties: Record<string, any>;
  gid?: number; // 图块 ID
  polygon?: { x: number; y: number }[];
  polyline?: { x: number; y: number }[];
  ellipse?: boolean;
  text?: { text: string; fontFamily: string; fontSize: number };
}

// 瓦片地图
export interface TileMap {
  id: string;
  name: string;
  width: number; // 瓦片列数
  height: number; // 瓦片行数
  tileWidth: number;
  tileHeight: number;
  backgroundColor: string;
  tilesets: Tileset[];
  layers: TileLayer[];
  objectLayers: ObjectLayer[];
  properties: Record<string, any>;
  // 导航网格
  navMesh?: NavMesh;
}

// 导航网格
export interface NavMesh {
  vertices: { x: number; y: number }[];
  polygons: number[][]; // 每个多边形的顶点索引
}

class TileMapEditorService {
  private maps = new Map<string, TileMap>();
  private activeMapId: string | null = null;
  private selectedTileset: string | null = null;
  private selectedTile: number = 0;
  private listeners = new Set<(event: string, data: any) => void>();
  private undoStack: { map: TileMap; action: string }[] = [];
  private redoStack: { map: TileMap; action: string }[] = [];

  // 创建地图
  createMap(config: {
    name: string;
    width: number;
    height: number;
    tileWidth: number;
    tileHeight: number;
  }): TileMap {
    const map: TileMap = {
      id: `map-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: config.name,
      width: config.width,
      height: config.height,
      tileWidth: config.tileWidth,
      tileHeight: config.tileHeight,
      backgroundColor: '#000000',
      tilesets: [],
      layers: [],
      objectLayers: [],
      properties: {},
    };

    this.maps.set(map.id, map);
    this.activeMapId = map.id;

    // 默认创建两个层：背景层和地形层
    this.addLayer(map.id, 'Background');
    this.addLayer(map.id, 'Ground');
    this.addLayer(map.id, 'Objects');
    this.addObjectLayer(map.id, 'Entities');

    this.notify('map:created', map);
    return map;
  }

  // 添加层
  addLayer(mapId: string, name: string): TileLayer {
    const map = this.maps.get(mapId);
    if (!map) throw new Error('地图不存在');
    const layer: TileLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      visible: true,
      locked: false,
      opacity: 1.0,
      tiles: this.createEmptyTileGrid(map.width, map.height),
      offset: { x: 0, y: 0 },
    };
    map.layers.push(layer);
    this.notify('layer:added', { mapId, layer });
    return layer;
  }

  // 添加对象层
  addObjectLayer(mapId: string, name: string): ObjectLayer {
    const map = this.maps.get(mapId);
    if (!map) throw new Error('地图不存在');
    const layer: ObjectLayer = {
      id: `objlayer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      visible: true,
      locked: false,
      objects: [],
    };
    map.objectLayers.push(layer);
    this.notify('object-layer:added', { mapId, layer });
    return layer;
  }

  // 创建空瓦片网格
  private createEmptyTileGrid(width: number, height: number): (number | null)[][] {
    const grid: (number | null)[][] = [];
    for (let y = 0; y < height; y++) {
      const row: (number | null)[] = [];
      for (let x = 0; x < width; x++) {
        row.push(null);
      }
      grid.push(row);
    }
    return grid;
  }

  // 添加图块集
  addTileset(
    mapId: string,
    tileset: Omit<Tileset, 'id' | 'columns' | 'rows' | 'tileCount'>
  ): Tileset {
    const map = this.maps.get(mapId);
    if (!map) throw new Error('地图不存在');

    const columns = Math.floor(
      (tileset.imageWidth - tileset.margin * 2 + tileset.spacing) /
        (tileset.tileWidth + tileset.spacing)
    );
    const rows = Math.floor(
      (tileset.imageHeight - tileset.margin * 2 + tileset.spacing) /
        (tileset.tileHeight + tileset.spacing)
    );

    const newTileset: Tileset = {
      ...tileset,
      id: `tileset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      columns,
      rows,
      tileCount: columns * rows,
    };
    map.tilesets.push(newTileset);
    this.selectedTileset = newTileset.id;
    this.notify('tileset:added', { mapId, tileset: newTileset });
    return newTileset;
  }

  // 放置瓦片
  placeTile(mapId: string, layerId: string, x: number, y: number, tileId: number | null): void {
    const map = this.maps.get(mapId);
    if (!map) return;
    const layer = map.layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return;

    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;

    // 保存快照用于撤销
    this.saveSnapshot(map, `Place tile at (${x},${y})`);

    layer.tiles[y][x] = tileId;

    // 应用自动拼接规则
    if (tileId !== null) {
      this.applyAutoTile(map, layer, x, y);
    }

    this.notify('tile:placed', { mapId, layerId, x, y, tileId });
  }

  // 批量绘制
  drawArea(
    mapId: string,
    layerId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    tileId: number
  ): void {
    const map = this.maps.get(mapId);
    if (!map) return;
    const layer = map.layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return;

    this.saveSnapshot(map, `Draw area (${startX},${startY})-(${endX},${endY})`);

    for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
      for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
        if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
          layer.tiles[y][x] = tileId;
        }
      }
    }

    this.notify('area:drawn', { mapId, layerId, startX, startY, endX, endY, tileId });
  }

  // 填充区域
  fillArea(mapId: string, layerId: string, startX: number, startY: number, tileId: number): void {
    const map = this.maps.get(mapId);
    if (!map) return;
    const layer = map.layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return;

    this.saveSnapshot(map, `Fill area`);

    const target = layer.tiles[startY]?.[startX];
    if (target === tileId) return;

    const visited = new Set<string>();
    const stack: [number, number][] = [[startX, startY]];

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) continue;
      if (layer.tiles[y][x] !== target) continue;
      visited.add(key);
      layer.tiles[y][x] = tileId;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    this.notify('area:filled', { mapId, layerId, startX, startY, tileId });
  }

  // 应用自动拼接
  private applyAutoTile(map: TileMap, layer: TileLayer, x: number, y: number): void {
    const tileset = map.tilesets[0];
    if (!tileset || !tileset.autotileRules) return;

    // 计算邻居位掩码
    let bitmask = 0;
    if (this.hasNeighborTile(map, layer, x, y - 1)) bitmask |= 1; // 上
    if (this.hasNeighborTile(map, layer, x + 1, y)) bitmask |= 2; // 右
    if (this.hasNeighborTile(map, layer, x, y + 1)) bitmask |= 4; // 下
    if (this.hasNeighborTile(map, layer, x - 1, y)) bitmask |= 8; // 左

    // 查找匹配的规则
    for (const rule of tileset.autotileRules) {
      if (rule.bitmaskNeighbors.includes(bitmask)) {
        layer.tiles[y][x] = rule.resultTile;
        break;
      }
    }
  }

  private hasNeighborTile(map: TileMap, layer: TileLayer, x: number, y: number): boolean {
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
    return layer.tiles[y][x] !== null;
  }

  // 撤销
  undo(mapId: string): boolean {
    if (this.undoStack.length === 0) return false;
    const snapshot = this.undoStack.pop()!;
    const map = this.maps.get(mapId);
    if (!map) return false;
    this.redoStack.push({ map: this.cloneMap(map), action: 'current' });
    // 恢复
    Object.assign(map, snapshot.map);
    this.notify('undo:performed', { mapId });
    return true;
  }

  // 重做
  redo(mapId: string): boolean {
    if (this.redoStack.length === 0) return false;
    const snapshot = this.redoStack.pop()!;
    const map = this.maps.get(mapId);
    if (!map) return false;
    this.undoStack.push({ map: this.cloneMap(map), action: 'current' });
    Object.assign(map, snapshot.map);
    this.notify('redo:performed', { mapId });
    return true;
  }

  private saveSnapshot(map: TileMap, action: string): void {
    this.undoStack.push({ map: this.cloneMap(map), action });
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
  }

  private cloneMap(map: TileMap): TileMap {
    return JSON.parse(JSON.stringify(map));
  }

  // 添加对象
  addObject(mapId: string, objectLayerId: string, obj: Omit<TileMapObject, 'id'>): TileMapObject {
    const map = this.maps.get(mapId);
    if (!map) throw new Error('地图不存在');
    const layer = map.objectLayers.find((l) => l.id === objectLayerId);
    if (!layer) throw new Error('对象层不存在');

    const newObj: TileMapObject = {
      ...obj,
      id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    layer.objects.push(newObj);
    this.notify('object:added', { mapId, objectLayerId, object: newObj });
    return newObj;
  }

  // 生成导航网格
  generateNavMesh(mapId: string, walkableLayerId: string): NavMesh {
    const map = this.maps.get(mapId);
    if (!map) throw new Error('地图不存在');
    const layer = map.layers.find((l) => l.id === walkableLayerId);
    if (!layer) throw new Error('层不存在');

    const vertices: { x: number; y: number }[] = [];
    const polygons: number[][] = [];

    // 简化的导航网格生成：每个可走瓦片作为一个节点
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (layer.tiles[y][x] !== null) {
          const baseIndex = vertices.length;
          // 4 个顶点（瓦片的 4 个角）
          vertices.push(
            { x: x * map.tileWidth, y: y * map.tileHeight },
            { x: (x + 1) * map.tileWidth, y: y * map.tileHeight },
            { x: (x + 1) * map.tileWidth, y: (y + 1) * map.tileHeight },
            { x: x * map.tileWidth, y: (y + 1) * map.tileHeight }
          );
          polygons.push([baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 3]);
        }
      }
    }

    map.navMesh = { vertices, polygons };
    this.notify('nav-mesh:generated', { mapId, navMesh: map.navMesh });
    return map.navMesh;
  }

  // 导出为 TMX
  exportToTMX(mapId: string): string {
    const map = this.maps.get(mapId);
    if (!map) return '';

    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<map version="1.4" tiledversion="1.4.3"`);
    lines.push(`  orientation="orthogonal" renderorder="right-down"`);
    lines.push(`  width="${map.width}" height="${map.height}"`);
    lines.push(`  tilewidth="${map.tileWidth}" tileheight="${map.tileHeight}"`);
    lines.push(`  infinite="0" backgroundcolor="${map.backgroundColor}">`);

    // Tilesets
    for (const ts of map.tilesets) {
      lines.push(
        `  <tileset firstgid="1" name="${ts.name}" tilewidth="${ts.tileWidth}" tileheight="${ts.tileHeight}"`
      );
      lines.push(`             spacing="${ts.spacing}" margin="${ts.margin}">`);
      lines.push(
        `    <image source="${ts.imageUrl}" width="${ts.imageWidth}" height="${ts.imageHeight}"/>`
      );
      lines.push('  </tileset>');
    }

    // Layers
    for (const layer of map.layers) {
      lines.push(
        `  <layer name="${layer.name}" width="${map.width}" height="${map.height}" opacity="${layer.opacity}" ${layer.visible ? '' : 'visible="0"'}>`
      );
      lines.push('    <data>');
      for (const row of layer.tiles) {
        const encoded = row.map((t) => (t === null ? 0 : t + 1)).join(',');
        lines.push(`      ${encoded}`);
      }
      lines.push('    </data>');
      lines.push('  </layer>');
    }

    // Object Layers
    for (const objLayer of map.objectLayers) {
      lines.push(
        `  <objectgroup name="${objLayer.name}" ${objLayer.visible ? '' : 'visible="0"'}>`
      );
      for (const obj of objLayer.objects) {
        lines.push(
          `    <object id="${obj.id}" type="${obj.type}" x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}"/>`
        );
      }
      lines.push('  </objectgroup>');
    }

    lines.push('</map>');
    return lines.join('\n');
  }

  // 导出为 JSON
  exportToJSON(mapId: string): string {
    const map = this.maps.get(mapId);
    if (!map) return '{}';
    return JSON.stringify(map, null, 2);
  }

  // 获取地图
  getMap(mapId: string): TileMap | undefined {
    return this.maps.get(mapId);
  }

  // 列出地图
  listMaps(): TileMap[] {
    return Array.from(this.maps.values());
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const tileMapEditorService = new TileMapEditorService();
