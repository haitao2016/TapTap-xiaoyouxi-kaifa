import { globalEventBus } from './event-bus';

export type SceneObjectType = 'sprite' | 'ui' | 'particle' | 'collider' | 'text';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface SceneComponent {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  properties: Record<string, unknown>;
}

export interface SceneObject {
  id: string;
  name: string;
  type: SceneObjectType;
  position: Vector3;
  rotation: Vector3;
  scale: Vector2;
  color: Color;
  opacity: number;
  layer: number;
  visible: boolean;
  locked: boolean;
  components: SceneComponent[];
  parentId?: string;
  childrenIds: string[];
  properties: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SceneLayer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface Scene {
  id: string;
  name: string;
  description?: string;
  objects: Map<string, SceneObject>;
  layers: SceneLayer[];
  grid: GridSettings;
  backgroundColor: Color;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
}

export interface GridSettings {
  enabled: boolean;
  size: number;
  color: Color;
  snapEnabled: boolean;
}

export interface SelectionSet {
  objectIds: string[];
  activeId?: string;
}

export interface AlignOptions {
  mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
  reference?: 'first' | 'last' | 'selection' | 'scene';
}

export interface SceneExportOptions {
  format: 'json' | 'xml';
  pretty?: boolean;
  includeComponents?: boolean;
}

export class SceneEditorService {
  private scenes = new Map<string, Scene>();
  private activeSceneId?: string;
  private selection: SelectionSet = { objectIds: [] };
  private clipboard: SceneObject[] = [];
  private history = new Map<string, Scene[]>();
  private maxHistorySize = 50;

  constructor() {
    this.loadMockScenes();
  }

  getScenes(): Scene[] {
    return Array.from(this.scenes.values());
  }

  getScene(sceneId: string): Scene | undefined {
    return this.scenes.get(sceneId);
  }

  getActiveScene(): Scene | undefined {
    return this.activeSceneId ? this.scenes.get(this.activeSceneId) : undefined;
  }

  setActiveScene(sceneId: string): void {
    if (!this.scenes.has(sceneId)) {
      throw new Error(`场景不存在: ${sceneId}`);
    }
    this.activeSceneId = sceneId;
    this.selection = { objectIds: [] };

    globalEventBus.emit({
      type: 'sceneEditor:activeSceneChanged',
      payload: { sceneId },
    });
  }

  createScene(name: string, width: number = 1920, height: number = 1080): Scene {
    const scene: Scene = {
      id: this.generateId(),
      name,
      objects: new Map(),
      layers: [
        { id: 'layer-default', name: '默认', order: 0, visible: true, locked: false, opacity: 1 },
        { id: 'layer-ui', name: 'UI', order: 1, visible: true, locked: false, opacity: 1 },
        { id: 'layer-foreground', name: '前景', order: 2, visible: true, locked: false, opacity: 1 },
        { id: 'layer-background', name: '背景', order: -1, visible: true, locked: false, opacity: 1 },
      ],
      grid: {
        enabled: true,
        size: 32,
        color: { r: 128, g: 128, b: 128, a: 0.3 },
        snapEnabled: true,
      },
      backgroundColor: { r: 20, g: 20, b: 30, a: 1 },
      width,
      height,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.scenes.set(scene.id, scene);
    this.history.set(scene.id, []);

    globalEventBus.emit({
      type: 'sceneEditor:sceneCreated',
      payload: scene,
    });

    return scene;
  }

  deleteScene(sceneId: string): void {
    if (!this.scenes.has(sceneId)) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    this.scenes.delete(sceneId);
    this.history.delete(sceneId);

    if (this.activeSceneId === sceneId) {
      this.activeSceneId = undefined;
    }

    globalEventBus.emit({
      type: 'sceneEditor:sceneDeleted',
      payload: { sceneId },
    });
  }

  renameScene(sceneId: string, newName: string): Scene {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    this.saveHistory(sceneId);
    scene.name = newName;
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:sceneRenamed',
      payload: { sceneId, newName },
    });

    return scene;
  }

  duplicateScene(sceneId: string, newName: string): Scene {
    const source = this.scenes.get(sceneId);
    if (!source) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const newScene = this.createScene(newName, source.width, source.height);
    newScene.layers = JSON.parse(JSON.stringify(source.layers));
    newScene.grid = JSON.parse(JSON.stringify(source.grid));
    newScene.backgroundColor = { ...source.backgroundColor };

    source.objects.forEach((obj, id) => {
      const newObj = JSON.parse(JSON.stringify(obj));
      newObj.id = this.generateId();
      newScene.objects.set(newObj.id, newObj);
    });

    return newScene;
  }

  addObject(sceneId: string, type: SceneObjectType, name: string, position?: Partial<Vector3>): SceneObject {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const object: SceneObject = {
      id: this.generateId(),
      name,
      type,
      position: { x: position?.x ?? 0, y: position?.y ?? 0, z: position?.z ?? 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1 },
      color: { r: 255, g: 255, b: 255, a: 1 },
      opacity: 1,
      layer: 0,
      visible: true,
      locked: false,
      components: [],
      childrenIds: [],
      properties: this.getDefaultProperties(type),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveHistory(sceneId);
    scene.objects.set(object.id, object);
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:objectAdded',
      payload: { sceneId, object },
    });

    return object;
  }

  removeObject(sceneId: string, objectId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    if (!scene.objects.has(objectId)) {
      throw new Error(`对象不存在: ${objectId}`);
    }

    this.saveHistory(sceneId);

    const object = scene.objects.get(objectId)!;
    if (object.parentId) {
      const parent = scene.objects.get(object.parentId);
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(id => id !== objectId);
      }
    }

    const removeChildren = (objId: string) => {
      const obj = scene.objects.get(objId);
      if (obj) {
        obj.childrenIds.forEach(childId => removeChildren(childId));
        scene.objects.delete(objId);
      }
    };
    removeChildren(objectId);

    scene.updatedAt = Date.now();

    this.selection.objectIds = this.selection.objectIds.filter(id => id !== objectId);
    if (this.selection.activeId === objectId) {
      this.selection.activeId = undefined;
    }

    globalEventBus.emit({
      type: 'sceneEditor:objectRemoved',
      payload: { sceneId, objectId },
    });
  }

  updateObject(sceneId: string, objectId: string, updates: Partial<SceneObject>): SceneObject {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const object = scene.objects.get(objectId);
    if (!object) {
      throw new Error(`对象不存在: ${objectId}`);
    }

    if (object.locked) {
      throw new Error('对象已锁定，无法修改');
    }

    this.saveHistory(sceneId);
    Object.assign(object, updates, { updatedAt: Date.now() });
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:objectUpdated',
      payload: { sceneId, objectId, updates },
    });

    return object;
  }

  getObject(sceneId: string, objectId: string): SceneObject | undefined {
    const scene = this.scenes.get(sceneId);
    return scene?.objects.get(objectId);
  }

  getObjects(sceneId: string): SceneObject[] {
    const scene = this.scenes.get(sceneId);
    if (!scene) return [];
    return Array.from(scene.objects.values());
  }

  getObjectsByType(sceneId: string, type: SceneObjectType): SceneObject[] {
    return this.getObjects(sceneId).filter(obj => obj.type === type);
  }

  getObjectsByLayer(sceneId: string, layer: number): SceneObject[] {
    return this.getObjects(sceneId).filter(obj => obj.layer === layer);
  }

  addComponent(sceneId: string, objectId: string, type: string, name: string, properties?: Record<string, unknown>): SceneComponent {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const object = scene.objects.get(objectId);
    if (!object) {
      throw new Error(`对象不存在: ${objectId}`);
    }

    const component: SceneComponent = {
      id: this.generateId(),
      type,
      name,
      enabled: true,
      properties: properties || {},
    };

    this.saveHistory(sceneId);
    object.components.push(component);
    object.updatedAt = Date.now();
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:componentAdded',
      payload: { sceneId, objectId, component },
    });

    return component;
  }

  removeComponent(sceneId: string, objectId: string, componentId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const object = scene.objects.get(objectId);
    if (!object) {
      throw new Error(`对象不存在: ${objectId}`);
    }

    this.saveHistory(sceneId);
    object.components = object.components.filter(c => c.id !== componentId);
    object.updatedAt = Date.now();
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:componentRemoved',
      payload: { sceneId, objectId, componentId },
    });
  }

  updateComponent(sceneId: string, objectId: string, componentId: string, updates: Partial<SceneComponent>): SceneComponent {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const object = scene.objects.get(objectId);
    if (!object) {
      throw new Error(`对象不存在: ${objectId}`);
    }

    const component = object.components.find(c => c.id === componentId);
    if (!component) {
      throw new Error(`组件不存在: ${componentId}`);
    }

    this.saveHistory(sceneId);
    Object.assign(component, updates);
    object.updatedAt = Date.now();
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:componentUpdated',
      payload: { sceneId, objectId, componentId, updates },
    });

    return component;
  }

  getSelection(): SelectionSet {
    return { ...this.selection };
  }

  selectObject(objectId: string, additive: boolean = false): void {
    const scene = this.getActiveScene();
    if (!scene) return;

    if (!scene.objects.has(objectId)) return;

    if (additive) {
      if (!this.selection.objectIds.includes(objectId)) {
        this.selection.objectIds.push(objectId);
      }
    } else {
      this.selection.objectIds = [objectId];
    }
    this.selection.activeId = objectId;

    globalEventBus.emit({
      type: 'sceneEditor:selectionChanged',
      payload: this.selection,
    });
  }

  selectObjects(objectIds: string[]): void {
    const scene = this.getActiveScene();
    if (!scene) return;

    this.selection.objectIds = objectIds.filter(id => scene.objects.has(id));
    this.selection.activeId = this.selection.objectIds[0];

    globalEventBus.emit({
      type: 'sceneEditor:selectionChanged',
      payload: this.selection,
    });
  }

  selectAll(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    this.selection.objectIds = Array.from(scene.objects.keys());
    this.selection.activeId = this.selection.objectIds[0];

    globalEventBus.emit({
      type: 'sceneEditor:selectionChanged',
      payload: this.selection,
    });
  }

  clearSelection(): void {
    this.selection = { objectIds: [] };

    globalEventBus.emit({
      type: 'sceneEditor:selectionChanged',
      payload: this.selection,
    });
  }

  duplicateSelection(sceneId: string): SceneObject[] {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const newObjects: SceneObject[] = [];
    const idMap = new Map<string, string>();

    this.saveHistory(sceneId);

    this.selection.objectIds.forEach(oldId => {
      const source = scene.objects.get(oldId);
      if (source) {
        const newObj: SceneObject = JSON.parse(JSON.stringify(source));
        newObj.id = this.generateId();
        newObj.name = source.name + '_copy';
        newObj.position.x += 20;
        newObj.position.y += 20;
        newObj.createdAt = Date.now();
        newObj.updatedAt = Date.now();
        idMap.set(oldId, newObj.id);
        newObjects.push(newObj);
      }
    });

    newObjects.forEach(obj => {
      if (obj.parentId && idMap.has(obj.parentId)) {
        obj.parentId = idMap.get(obj.parentId);
      }
      scene.objects.set(obj.id, obj);
    });

    newObjects.forEach(obj => {
      obj.childrenIds = obj.childrenIds
        .map(childId => idMap.get(childId))
        .filter((id): id is string => id !== undefined);
    });

    scene.updatedAt = Date.now();
    this.selection.objectIds = newObjects.map(o => o.id);
    this.selection.activeId = newObjects[0]?.id;

    globalEventBus.emit({
      type: 'sceneEditor:objectsDuplicated',
      payload: { sceneId, count: newObjects.length },
    });

    return newObjects;
  }

  deleteSelection(sceneId: string): void {
    this.selection.objectIds.forEach(objectId => {
      this.removeObject(sceneId, objectId);
    });
  }

  alignSelection(sceneId: string, options: AlignOptions): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const selectedObjects = this.selection.objectIds
      .map(id => scene.objects.get(id))
      .filter((o): o is SceneObject => o !== undefined && !o.locked);

    if (selectedObjects.length < 2) return;

    this.saveHistory(sceneId);

    let refX = 0, refY = 0, refW = 0, refH = 0;

    if (options.reference === 'scene') {
      refX = 0;
      refY = 0;
      refW = scene.width;
      refH = scene.height;
    } else {
      const refObj = options.reference === 'last' 
        ? selectedObjects[selectedObjects.length - 1] 
        : selectedObjects[0];
      refX = refObj.position.x;
      refY = refObj.position.y;
      refW = (refObj.properties.width as number) || 100;
      refH = (refObj.properties.height as number) || 100;
    }

    selectedObjects.forEach(obj => {
      const w = (obj.properties.width as number) || 100;
      const h = (obj.properties.height as number) || 100;

      switch (options.mode) {
        case 'left':
          obj.position.x = refX;
          break;
        case 'center':
          obj.position.x = refX + refW / 2 - w / 2;
          break;
        case 'right':
          obj.position.x = refX + refW - w;
          break;
        case 'top':
          obj.position.y = refY;
          break;
        case 'middle':
          obj.position.y = refY + refH / 2 - h / 2;
          break;
        case 'bottom':
          obj.position.y = refY + refH - h;
          break;
      }
      obj.updatedAt = Date.now();
    });

    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:objectsAligned',
      payload: { sceneId, mode: options.mode },
    });
  }

  getLayers(sceneId: string): SceneLayer[] {
    const scene = this.scenes.get(sceneId);
    return scene ? [...scene.layers].sort((a, b) => a.order - b.order) : [];
  }

  addLayer(sceneId: string, name: string): SceneLayer {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const maxOrder = Math.max(...scene.layers.map(l => l.order), 0);
    const layer: SceneLayer = {
      id: this.generateId(),
      name,
      order: maxOrder + 1,
      visible: true,
      locked: false,
      opacity: 1,
    };

    this.saveHistory(sceneId);
    scene.layers.push(layer);
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:layerAdded',
      payload: { sceneId, layer },
    });

    return layer;
  }

  removeLayer(sceneId: string, layerId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const layerIndex = scene.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) {
      throw new Error(`图层不存在: ${layerId}`);
    }

    const layer = scene.layers[layerIndex];
    scene.objects.forEach(obj => {
      if (obj.layer === layer.order) {
        obj.layer = 0;
      }
    });

    this.saveHistory(sceneId);
    scene.layers.splice(layerIndex, 1);
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:layerRemoved',
      payload: { sceneId, layerId },
    });
  }

  toggleLayerVisibility(sceneId: string, layerId: string): SceneLayer {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const layer = scene.layers.find(l => l.id === layerId);
    if (!layer) {
      throw new Error(`图层不存在: ${layerId}`);
    }

    this.saveHistory(sceneId);
    layer.visible = !layer.visible;
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:layerVisibilityChanged',
      payload: { sceneId, layerId, visible: layer.visible },
    });

    return layer;
  }

  toggleLayerLock(sceneId: string, layerId: string): SceneLayer {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const layer = scene.layers.find(l => l.id === layerId);
    if (!layer) {
      throw new Error(`图层不存在: ${layerId}`);
    }

    this.saveHistory(sceneId);
    layer.locked = !layer.locked;
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:layerLockChanged',
      payload: { sceneId, layerId, locked: layer.locked },
    });

    return layer;
  }

  moveLayerOrder(sceneId: string, layerId: string, direction: 'up' | 'down'): SceneLayer {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const layers = [...scene.layers].sort((a, b) => a.order - b.order);
    const index = layers.findIndex(l => l.id === layerId);
    if (index === -1) {
      throw new Error(`图层不存在: ${layerId}`);
    }

    const swapIndex = direction === 'up' ? index + 1 : index - 1;
    if (swapIndex < 0 || swapIndex >= layers.length) {
      return layers[index];
    }

    this.saveHistory(sceneId);
    const tempOrder = layers[index].order;
    layers[index].order = layers[swapIndex].order;
    layers[swapIndex].order = tempOrder;
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:layerOrderChanged',
      payload: { sceneId, layerId, direction },
    });

    return layers[index];
  }

  setGridSettings(sceneId: string, settings: Partial<GridSettings>): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    this.saveHistory(sceneId);
    Object.assign(scene.grid, settings);
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:gridSettingsChanged',
      payload: { sceneId, settings },
    });
  }

  snapToGrid(sceneId: string, objectId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene || !scene.grid.snapEnabled) return;

    const object = scene.objects.get(objectId);
    if (!object || object.locked) return;

    const gridSize = scene.grid.size;
    this.saveHistory(sceneId);
    object.position.x = Math.round(object.position.x / gridSize) * gridSize;
    object.position.y = Math.round(object.position.y / gridSize) * gridSize;
    object.updatedAt = Date.now();
    scene.updatedAt = Date.now();
  }

  serializeScene(sceneId: string, options?: SceneExportOptions): string {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const sceneData = {
      id: scene.id,
      name: scene.name,
      description: scene.description,
      width: scene.width,
      height: scene.height,
      backgroundColor: scene.backgroundColor,
      grid: scene.grid,
      layers: scene.layers,
      objects: Array.from(scene.objects.values()).map(obj => ({
        ...obj,
        components: options?.includeComponents !== false ? obj.components : undefined,
      })),
    };

    const format = options?.format || 'json';
    if (format === 'json') {
      return options?.pretty 
        ? JSON.stringify(sceneData, null, 2) 
        : JSON.stringify(sceneData);
    }

    throw new Error(`不支持的格式: ${format}`);
  }

  deserializeScene(data: string): Scene {
    const sceneData = JSON.parse(data);
    const scene = this.createScene(sceneData.name, sceneData.width, sceneData.height);

    scene.id = sceneData.id || scene.id;
    scene.description = sceneData.description;
    scene.backgroundColor = sceneData.backgroundColor || scene.backgroundColor;
    scene.grid = sceneData.grid || scene.grid;
    scene.layers = sceneData.layers || scene.layers;

    if (sceneData.objects) {
      sceneData.objects.forEach((objData: SceneObject) => {
        scene.objects.set(objData.id, objData);
      });
    }

    return scene;
  }

  undo(sceneId: string): Scene | null {
    const history = this.history.get(sceneId);
    if (!history || history.length === 0) {
      return null;
    }

    const previousVersion = history.pop()!;
    this.scenes.set(sceneId, previousVersion);

    globalEventBus.emit({
      type: 'sceneEditor:undo',
      payload: { sceneId },
    });

    return previousVersion;
  }

  getHistory(sceneId: string): Scene[] {
    return this.history.get(sceneId) || [];
  }

  setObjectParent(sceneId: string, objectId: string, parentId: string | null): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`场景不存在: ${sceneId}`);
    }

    const object = scene.objects.get(objectId);
    if (!object) {
      throw new Error(`对象不存在: ${objectId}`);
    }

    if (object.parentId) {
      const oldParent = scene.objects.get(object.parentId);
      if (oldParent) {
        oldParent.childrenIds = oldParent.childrenIds.filter(id => id !== objectId);
      }
    }

    this.saveHistory(sceneId);

    if (parentId) {
      const parent = scene.objects.get(parentId);
      if (!parent) {
        throw new Error(`父对象不存在: ${parentId}`);
      }
      object.parentId = parentId;
      if (!parent.childrenIds.includes(objectId)) {
        parent.childrenIds.push(objectId);
      }
    } else {
      object.parentId = undefined;
    }

    object.updatedAt = Date.now();
    scene.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'sceneEditor:objectParentChanged',
      payload: { sceneId, objectId, parentId },
    });
  }

  private getDefaultProperties(type: SceneObjectType): Record<string, unknown> {
    switch (type) {
      case 'sprite':
        return { texture: '', width: 100, height: 100, flipX: false, flipY: false };
      case 'ui':
        return { width: 200, height: 50, text: '', fontSize: 16, fontColor: '#ffffff' };
      case 'particle':
        return { texture: '', maxParticles: 100, emissionRate: 10 };
      case 'collider':
        return { colliderType: 'rect', width: 50, height: 50, isTrigger: false };
      case 'text':
        return { text: 'Text', fontSize: 24, font: 'Arial', align: 'left' };
      default:
        return {};
    }
  }

  private saveHistory(sceneId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    const history = this.history.get(sceneId) || [];
    const snapshot: Scene = {
      ...scene,
      objects: new Map(scene.objects),
      layers: JSON.parse(JSON.stringify(scene.layers)),
    };
    history.push(snapshot);

    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.history.set(sceneId, history);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private loadMockScenes(): void {
    const scene = this.createScene('MainScene', 1920, 1080);
    
    const bg = this.addObject(scene.id, 'sprite', 'Background', { x: 0, y: 0, z: -10 });
    bg.layer = -1;
    bg.properties.width = 1920;
    bg.properties.height = 1080;

    const player = this.addObject(scene.id, 'sprite', 'Player', { x: 400, y: 300 });
    player.properties.width = 64;
    player.properties.height = 64;

    const uiText = this.addObject(scene.id, 'ui', 'ScoreText', { x: 50, y: 50 });
    uiText.layer = 1;
    uiText.properties.text = 'Score: 0';
    uiText.properties.fontSize = 32;

    const collider = this.addObject(scene.id, 'collider', 'Ground', { x: 0, y: 500 });
    collider.properties.width = 1920;
    collider.properties.height = 100;

    const title = this.addObject(scene.id, 'text', 'Title', { x: 860, y: 100 });
    title.layer = 2;
    title.properties.text = 'My Game';
    title.properties.fontSize = 48;
  }
}

export const sceneEditorService = new SceneEditorService();
