import { globalEventBus } from './event-bus';

export type EmitterMode = 'point' | 'line' | 'circle' | 'rectangle';

export type ParticleBlendMode = 'additive' | 'alpha' | 'multiply' | 'screen';

export interface ColorKey {
  time: number;
  color: { r: number; g: number; b: number; a: number };
}

export interface ValueKey {
  time: number;
  value: number;
}

export interface ColorGradient {
  keys: ColorKey[];
}

export interface ValueCurve {
  keys: ValueKey[];
}

export interface EmitterConfig {
  mode: EmitterMode;
  position: { x: number; y: number };
  emissionRate: number;
  angle: number;
  angleVariance: number;
  speed: number;
  speedVariance: number;
  gravity: { x: number; y: number };
  acceleration: number;
  accelerationVariance: number;
  drag: number;
  radialAcceleration: number;
  tangentialAcceleration: number;
  maxParticles: number;
  duration: number;
  startDelay: number;
}

export interface ParticleLifeConfig {
  minLife: number;
  maxLife: number;
  lifeCurve?: ValueCurve;
}

export interface ParticleSizeConfig {
  startSize: number;
  startSizeVariance: number;
  endSize: number;
  endSizeVariance: number;
  sizeCurve?: ValueCurve;
}

export interface ParticleColorConfig {
  startColor: { r: number; g: number; b: number; a: number };
  startColorVariance: { r: number; g: number; b: number; a: number };
  endColor: { r: number; g: number; b: number; a: number };
  endColorVariance: { r: number; g: number; b: number; a: number };
  colorGradient?: ColorGradient;
}

export interface ParticleRotationConfig {
  startRotation: number;
  startRotationVariance: number;
  endRotation: number;
  endRotationVariance: number;
  rotatePerSecond: number;
  rotatePerSecondVariance: number;
}

export interface ParticleShapeConfig {
  mode: EmitterMode;
  lineLength?: number;
  circleRadius?: number;
  rectWidth?: number;
  rectHeight?: number;
  emitOnEdge?: boolean;
}

export interface ParticleSystemData {
  id: string;
  name: string;
  description?: string;
  texture?: string;
  blendMode: ParticleBlendMode;
  emitter: EmitterConfig;
  life: ParticleLifeConfig;
  size: ParticleSizeConfig;
  color: ParticleColorConfig;
  rotation: ParticleRotationConfig;
  shape: ParticleShapeConfig;
  createdAt: number;
  updatedAt: number;
}

export interface ParticlePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  data: Omit<ParticleSystemData, 'id' | 'name' | 'createdAt' | 'updatedAt'>;
}

export interface ParticleInstance {
  id: string;
  systemId: string;
  position: { x: number; y: number };
  playing: boolean;
  loop: boolean;
  startTime: number;
  currentTime: number;
  particleCount: number;
}

export class ParticleEditorService {
  private systems = new Map<string, ParticleSystemData>();
  private presets: ParticlePreset[] = [];
  private instances = new Map<string, ParticleInstance>();
  private activeSystemId?: string;
  private history = new Map<string, ParticleSystemData[]>();
  private maxHistorySize = 50;

  constructor() {
    this.loadPresets();
    this.loadMockSystems();
  }

  getSystems(): ParticleSystemData[] {
    return Array.from(this.systems.values());
  }

  getSystem(systemId: string): ParticleSystemData | undefined {
    return this.systems.get(systemId);
  }

  getActiveSystem(): ParticleSystemData | undefined {
    return this.activeSystemId ? this.systems.get(this.activeSystemId) : undefined;
  }

  setActiveSystem(systemId: string): void {
    if (!this.systems.has(systemId)) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }
    this.activeSystemId = systemId;

    globalEventBus.emit({
      type: 'particleEditor:activeSystemChanged',
      payload: { systemId },
    });
  }

  createSystem(name: string, config?: Partial<ParticleSystemData>): ParticleSystemData {
    const system: ParticleSystemData = {
      id: this.generateId(),
      name,
      description: config?.description,
      texture: config?.texture,
      blendMode: config?.blendMode || 'additive',
      emitter: {
        mode: 'point',
        position: { x: 0, y: 0 },
        emissionRate: 50,
        angle: 270,
        angleVariance: 30,
        speed: 100,
        speedVariance: 30,
        gravity: { x: 0, y: 0 },
        acceleration: 0,
        accelerationVariance: 0,
        drag: 0,
        radialAcceleration: 0,
        tangentialAcceleration: 0,
        maxParticles: 500,
        duration: -1,
        startDelay: 0,
        ...config?.emitter,
      },
      life: {
        minLife: 1,
        maxLife: 2,
        ...config?.life,
      },
      size: {
        startSize: 10,
        startSizeVariance: 2,
        endSize: 0,
        endSizeVariance: 0,
        ...config?.size,
      },
      color: {
        startColor: { r: 255, g: 255, b: 255, a: 1 },
        startColorVariance: { r: 0, g: 0, b: 0, a: 0 },
        endColor: { r: 255, g: 255, b: 255, a: 0 },
        endColorVariance: { r: 0, g: 0, b: 0, a: 0 },
        ...config?.color,
      },
      rotation: {
        startRotation: 0,
        startRotationVariance: 0,
        endRotation: 0,
        endRotationVariance: 0,
        rotatePerSecond: 0,
        rotatePerSecondVariance: 0,
        ...config?.rotation,
      },
      shape: {
        mode: 'point',
        emitOnEdge: false,
        ...config?.shape,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.systems.set(system.id, system);
    this.history.set(system.id, []);

    globalEventBus.emit({
      type: 'particleEditor:systemCreated',
      payload: system,
    });

    return system;
  }

  deleteSystem(systemId: string): void {
    if (!this.systems.has(systemId)) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.systems.delete(systemId);
    this.history.delete(systemId);

    if (this.activeSystemId === systemId) {
      this.activeSystemId = undefined;
    }

    globalEventBus.emit({
      type: 'particleEditor:systemDeleted',
      payload: { systemId },
    });
  }

  duplicateSystem(systemId: string, newName: string): ParticleSystemData {
    const source = this.systems.get(systemId);
    if (!source) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    const newSystem = this.createSystem(newName, JSON.parse(JSON.stringify(source)));
    return newSystem;
  }

  renameSystem(systemId: string, newName: string): ParticleSystemData {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    system.name = newName;
    system.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'particleEditor:systemRenamed',
      payload: { systemId, newName },
    });

    return system;
  }

  updateSystem(systemId: string, updates: Partial<ParticleSystemData>): ParticleSystemData {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    Object.assign(system, updates, { updatedAt: Date.now() });

    globalEventBus.emit({
      type: 'particleEditor:systemUpdated',
      payload: { systemId, updates },
    });

    return system;
  }

  updateEmitter(systemId: string, updates: Partial<EmitterConfig>): void {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    Object.assign(system.emitter, updates);
    system.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'particleEditor:emitterUpdated',
      payload: { systemId, updates },
    });
  }

  updateLife(systemId: string, updates: Partial<ParticleLifeConfig>): void {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    Object.assign(system.life, updates);
    system.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'particleEditor:lifeUpdated',
      payload: { systemId, updates },
    });
  }

  updateSize(systemId: string, updates: Partial<ParticleSizeConfig>): void {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    Object.assign(system.size, updates);
    system.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'particleEditor:sizeUpdated',
      payload: { systemId, updates },
    });
  }

  updateColor(systemId: string, updates: Partial<ParticleColorConfig>): void {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    Object.assign(system.color, updates);
    system.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'particleEditor:colorUpdated',
      payload: { systemId, updates },
    });
  }

  updateRotation(systemId: string, updates: Partial<ParticleRotationConfig>): void {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    Object.assign(system.rotation, updates);
    system.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'particleEditor:rotationUpdated',
      payload: { systemId, updates },
    });
  }

  updateShape(systemId: string, updates: Partial<ParticleShapeConfig>): void {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    Object.assign(system.shape, updates);
    system.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'particleEditor:shapeUpdated',
      payload: { systemId, updates },
    });
  }

  setBlendMode(systemId: string, mode: ParticleBlendMode): void {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    system.blendMode = mode;
    system.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'particleEditor:blendModeChanged',
      payload: { systemId, mode },
    });
  }

  getPresets(): ParticlePreset[] {
    return this.presets;
  }

  getPresetById(presetId: string): ParticlePreset | undefined {
    return this.presets.find(p => p.id === presetId);
  }

  getPresetsByCategory(category: string): ParticlePreset[] {
    return this.presets.filter(p => p.category === category);
  }

  getPresetCategories(): string[] {
    return Array.from(new Set(this.presets.map(p => p.category))).sort();
  }

  createSystemFromPreset(presetId: string, name: string): ParticleSystemData {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      throw new Error(`预设不存在: ${presetId}`);
    }

    const system = this.createSystem(name, preset.data);
    return system;
  }

  applyPreset(systemId: string, presetId: string): void {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      throw new Error(`预设不存在: ${presetId}`);
    }

    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    this.saveHistory(systemId);
    Object.assign(system, preset.data, { id: system.id, name: system.name, createdAt: system.createdAt, updatedAt: Date.now() });

    globalEventBus.emit({
      type: 'particleEditor:presetApplied',
      payload: { systemId, presetId },
    });
  }

  saveAsPreset(systemId: string, presetName: string, category: string, description: string): ParticlePreset {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    const { id, name, createdAt, updatedAt, ...data } = system;
    const preset: ParticlePreset = {
      id: this.generateId(),
      name: presetName,
      description,
      category,
      data: data as Omit<ParticleSystemData, 'id' | 'name' | 'createdAt' | 'updatedAt'>,
    };

    this.presets.push(preset);

    globalEventBus.emit({
      type: 'particleEditor:presetSaved',
      payload: preset,
    });

    return preset;
  }

  serializeSystem(systemId: string, pretty: boolean = false): string {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    return pretty 
      ? JSON.stringify(system, null, 2) 
      : JSON.stringify(system);
  }

  deserializeSystem(data: string): ParticleSystemData {
    const parsed = JSON.parse(data);
    const system = this.createSystem(parsed.name, parsed);
    if (parsed.id) {
      system.id = parsed.id;
      this.systems.set(parsed.id, system);
    }
    return system;
  }

  play(systemId: string): ParticleInstance {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`粒子系统不存在: ${systemId}`);
    }

    const instance: ParticleInstance = {
      id: this.generateId(),
      systemId,
      position: { ...system.emitter.position },
      playing: true,
      loop: system.emitter.duration < 0,
      startTime: Date.now(),
      currentTime: 0,
      particleCount: 0,
    };

    this.instances.set(instance.id, instance);

    globalEventBus.emit({
      type: 'particleEditor:playbackStarted',
      payload: { systemId, instanceId: instance.id },
    });

    return instance;
  }

  stop(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.playing = false;
    this.instances.delete(instanceId);

    globalEventBus.emit({
      type: 'particleEditor:playbackStopped',
      payload: { instanceId },
    });
  }

  pause(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.playing = false;

    globalEventBus.emit({
      type: 'particleEditor:playbackPaused',
      payload: { instanceId },
    });
  }

  resume(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.playing = true;

    globalEventBus.emit({
      type: 'particleEditor:playbackResumed',
      payload: { instanceId },
    });
  }

  getEstimatedParticleCount(systemId: string): number {
    const system = this.systems.get(systemId);
    if (!system) return 0;

    const avgLife = (system.life.minLife + system.life.maxLife) / 2;
    const estimated = system.emitter.emissionRate * avgLife;
    return Math.min(estimated, system.emitter.maxParticles);
  }

  undo(systemId: string): ParticleSystemData | null {
    const history = this.history.get(systemId);
    if (!history || history.length === 0) {
      return null;
    }

    const previousVersion = history.pop()!;
    this.systems.set(systemId, previousVersion);

    globalEventBus.emit({
      type: 'particleEditor:undo',
      payload: { systemId },
    });

    return previousVersion;
  }

  getHistory(systemId: string): ParticleSystemData[] {
    return this.history.get(systemId) || [];
  }

  searchSystems(query: string): ParticleSystemData[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.systems.values()).filter(
      s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        (s.description && s.description.toLowerCase().includes(lowerQuery))
    );
  }

  searchPresets(query: string): ParticlePreset[] {
    const lowerQuery = query.toLowerCase();
    return this.presets.filter(
      p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
    );
  }

  private saveHistory(systemId: string): void {
    const system = this.systems.get(systemId);
    if (!system) return;

    const history = this.history.get(systemId) || [];
    const snapshot = JSON.parse(JSON.stringify(system));
    history.push(snapshot);

    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.history.set(systemId, history);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private loadPresets(): void {
    this.presets = [
      {
        id: 'preset-fire',
        name: '火焰',
        description: '经典的火焰效果，带有上升的粒子和渐变颜色',
        category: 'natural',
        data: {
          blendMode: 'additive',
          emitter: {
            mode: 'point',
            position: { x: 0, y: 0 },
            emissionRate: 100,
            angle: 270,
            angleVariance: 20,
            speed: 80,
            speedVariance: 30,
            gravity: { x: 0, y: -50 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 0,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 300,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 0.5, maxLife: 1.5 },
          size: { startSize: 20, startSizeVariance: 5, endSize: 5, endSizeVariance: 2 },
          color: {
            startColor: { r: 255, g: 200, b: 50, a: 1 },
            startColorVariance: { r: 30, g: 30, b: 20, a: 0 },
            endColor: { r: 255, g: 50, b: 0, a: 0 },
            endColorVariance: { r: 20, g: 20, b: 0, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 180,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 0,
            rotatePerSecondVariance: 0,
          },
          shape: { mode: 'point', emitOnEdge: false },
        },
      },
      {
        id: 'preset-smoke',
        name: '烟雾',
        description: '缓慢上升的烟雾效果，带有膨胀和消散',
        category: 'natural',
        data: {
          blendMode: 'alpha',
          emitter: {
            mode: 'point',
            position: { x: 0, y: 0 },
            emissionRate: 30,
            angle: 270,
            angleVariance: 15,
            speed: 40,
            speedVariance: 15,
            gravity: { x: 0, y: -20 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 0,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 200,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 2, maxLife: 4 },
          size: { startSize: 15, startSizeVariance: 5, endSize: 60, endSizeVariance: 20 },
          color: {
            startColor: { r: 100, g: 100, b: 100, a: 0.6 },
            startColorVariance: { r: 20, g: 20, b: 20, a: 0.1 },
            endColor: { r: 150, g: 150, b: 150, a: 0 },
            endColorVariance: { r: 20, g: 20, b: 20, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 180,
            endRotation: 0,
            endRotationVariance: 180,
            rotatePerSecond: 20,
            rotatePerSecondVariance: 10,
          },
          shape: { mode: 'point', emitOnEdge: false },
        },
      },
      {
        id: 'preset-explosion',
        name: '爆炸',
        description: '一次性的爆炸效果，向四周发射粒子',
        category: 'effect',
        data: {
          blendMode: 'additive',
          emitter: {
            mode: 'point',
            position: { x: 0, y: 0 },
            emissionRate: 1000,
            angle: 0,
            angleVariance: 360,
            speed: 200,
            speedVariance: 100,
            gravity: { x: 0, y: 100 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 2,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 500,
            duration: 0.1,
            startDelay: 0,
          },
          life: { minLife: 0.5, maxLife: 1.5 },
          size: { startSize: 15, startSizeVariance: 5, endSize: 2, endSizeVariance: 1 },
          color: {
            startColor: { r: 255, g: 255, b: 200, a: 1 },
            startColorVariance: { r: 0, g: 30, b: 30, a: 0 },
            endColor: { r: 255, g: 100, b: 0, a: 0 },
            endColorVariance: { r: 0, g: 50, b: 0, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 360,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 360,
            rotatePerSecondVariance: 180,
          },
          shape: { mode: 'point', emitOnEdge: false },
        },
      },
      {
        id: 'preset-stars',
        name: '星光',
        description: '闪烁的星星粒子效果',
        category: 'magic',
        data: {
          blendMode: 'additive',
          emitter: {
            mode: 'circle',
            position: { x: 0, y: 0 },
            emissionRate: 20,
            angle: 0,
            angleVariance: 360,
            speed: 0,
            speedVariance: 0,
            gravity: { x: 0, y: 0 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 0,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 100,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 1, maxLife: 3 },
          size: { startSize: 3, startSizeVariance: 2, endSize: 3, endSizeVariance: 2 },
          color: {
            startColor: { r: 255, g: 255, b: 255, a: 0 },
            startColorVariance: { r: 50, g: 50, b: 100, a: 0 },
            endColor: { r: 200, g: 220, b: 255, a: 0 },
            endColorVariance: { r: 30, g: 30, b: 50, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 0,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 0,
            rotatePerSecondVariance: 0,
          },
          shape: { mode: 'circle', circleRadius: 150, emitOnEdge: false },
        },
      },
      {
        id: 'preset-rain',
        name: '雨滴',
        description: '下雨效果，带有方向性和速度',
        category: 'weather',
        data: {
          blendMode: 'alpha',
          emitter: {
            mode: 'rectangle',
            position: { x: 0, y: 0 },
            emissionRate: 200,
            angle: 270,
            angleVariance: 5,
            speed: 300,
            speedVariance: 50,
            gravity: { x: 0, y: 200 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 0,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 500,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 1, maxLife: 2 },
          size: { startSize: 2, startSizeVariance: 1, endSize: 2, endSizeVariance: 1 },
          color: {
            startColor: { r: 150, g: 180, b: 255, a: 0.5 },
            startColorVariance: { r: 20, g: 20, b: 30, a: 0.2 },
            endColor: { r: 150, g: 180, b: 255, a: 0.3 },
            endColorVariance: { r: 20, g: 20, b: 30, a: 0.1 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 0,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 0,
            rotatePerSecondVariance: 0,
          },
          shape: { mode: 'rectangle', rectWidth: 800, rectHeight: 0, emitOnEdge: false },
        },
      },
      {
        id: 'preset-snow',
        name: '雪花',
        description: '飘落的雪花效果，带有摇摆运动',
        category: 'weather',
        data: {
          blendMode: 'alpha',
          emitter: {
            mode: 'rectangle',
            position: { x: 0, y: 0 },
            emissionRate: 30,
            angle: 270,
            angleVariance: 20,
            speed: 30,
            speedVariance: 15,
            gravity: { x: 0, y: 20 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 0,
            radialAcceleration: 0,
            tangentialAcceleration: 30,
            maxParticles: 200,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 4, maxLife: 8 },
          size: { startSize: 4, startSizeVariance: 3, endSize: 4, endSizeVariance: 3 },
          color: {
            startColor: { r: 255, g: 255, b: 255, a: 0.8 },
            startColorVariance: { r: 10, g: 10, b: 10, a: 0.2 },
            endColor: { r: 255, g: 255, b: 255, a: 0 },
            endColorVariance: { r: 0, g: 0, b: 0, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 180,
            endRotation: 0,
            endRotationVariance: 180,
            rotatePerSecond: 30,
            rotatePerSecondVariance: 20,
          },
          shape: { mode: 'rectangle', rectWidth: 800, rectHeight: 0, emitOnEdge: false },
        },
      },
      {
        id: 'preset-sparkle',
        name: '闪光',
        description: '魔法闪光效果，快速闪烁消失',
        category: 'magic',
        data: {
          blendMode: 'additive',
          emitter: {
            mode: 'point',
            position: { x: 0, y: 0 },
            emissionRate: 50,
            angle: 0,
            angleVariance: 360,
            speed: 50,
            speedVariance: 30,
            gravity: { x: 0, y: 0 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 3,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 150,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 0.2, maxLife: 0.5 },
          size: { startSize: 8, startSizeVariance: 3, endSize: 0, endSizeVariance: 0 },
          color: {
            startColor: { r: 255, g: 255, b: 200, a: 1 },
            startColorVariance: { r: 30, g: 30, b: 50, a: 0 },
            endColor: { r: 255, g: 255, b: 255, a: 0 },
            endColorVariance: { r: 0, g: 0, b: 0, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 0,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 0,
            rotatePerSecondVariance: 0,
          },
          shape: { mode: 'point', emitOnEdge: false },
        },
      },
      {
        id: 'preset-bubbles',
        name: '气泡',
        description: '上升的气泡效果，带有摇摆',
        category: 'natural',
        data: {
          blendMode: 'alpha',
          emitter: {
            mode: 'point',
            position: { x: 0, y: 0 },
            emissionRate: 20,
            angle: 90,
            angleVariance: 15,
            speed: 40,
            speedVariance: 20,
            gravity: { x: 0, y: -30 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 0,
            radialAcceleration: 0,
            tangentialAcceleration: 20,
            maxParticles: 100,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 2, maxLife: 5 },
          size: { startSize: 10, startSizeVariance: 8, endSize: 15, endSizeVariance: 5 },
          color: {
            startColor: { r: 200, g: 230, b: 255, a: 0.4 },
            startColorVariance: { r: 20, g: 20, b: 20, a: 0.2 },
            endColor: { r: 255, g: 255, b: 255, a: 0 },
            endColorVariance: { r: 0, g: 0, b: 0, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 0,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 10,
            rotatePerSecondVariance: 5,
          },
          shape: { mode: 'point', emitOnEdge: false },
        },
      },
      {
        id: 'preset-fireworks',
        name: '烟花',
        description: '烟花爆炸效果，带有拖尾',
        category: 'effect',
        data: {
          blendMode: 'additive',
          emitter: {
            mode: 'point',
            position: { x: 0, y: 0 },
            emissionRate: 500,
            angle: 0,
            angleVariance: 360,
            speed: 150,
            speedVariance: 50,
            gravity: { x: 0, y: 80 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 1,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 300,
            duration: 0.05,
            startDelay: 0,
          },
          life: { minLife: 1, maxLife: 2 },
          size: { startSize: 5, startSizeVariance: 2, endSize: 1, endSizeVariance: 0 },
          color: {
            startColor: { r: 255, g: 100, b: 200, a: 1 },
            startColorVariance: { r: 100, g: 100, b: 100, a: 0 },
            endColor: { r: 100, g: 50, b: 200, a: 0 },
            endColorVariance: { r: 50, g: 50, b: 100, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 0,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 0,
            rotatePerSecondVariance: 0,
          },
          shape: { mode: 'point', emitOnEdge: false },
        },
      },
      {
        id: 'preset-trail',
        name: '拖尾',
        description: '运动物体的拖尾效果',
        category: 'effect',
        data: {
          blendMode: 'additive',
          emitter: {
            mode: 'point',
            position: { x: 0, y: 0 },
            emissionRate: 200,
            angle: 180,
            angleVariance: 10,
            speed: 50,
            speedVariance: 20,
            gravity: { x: 0, y: 0 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 2,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 200,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 0.3, maxLife: 0.8 },
          size: { startSize: 10, startSizeVariance: 3, endSize: 0, endSizeVariance: 0 },
          color: {
            startColor: { r: 100, g: 200, b: 255, a: 1 },
            startColorVariance: { r: 30, g: 30, b: 30, a: 0 },
            endColor: { r: 50, g: 100, b: 200, a: 0 },
            endColorVariance: { r: 20, g: 20, b: 50, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 0,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 0,
            rotatePerSecondVariance: 0,
          },
          shape: { mode: 'point', emitOnEdge: false },
        },
      },
      {
        id: 'preset-glow',
        name: '光晕',
        description: '柔和的光晕效果',
        category: 'magic',
        data: {
          blendMode: 'additive',
          emitter: {
            mode: 'point',
            position: { x: 0, y: 0 },
            emissionRate: 10,
            angle: 0,
            angleVariance: 360,
            speed: 10,
            speedVariance: 5,
            gravity: { x: 0, y: 0 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 0,
            radialAcceleration: 0,
            tangentialAcceleration: 0,
            maxParticles: 30,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 2, maxLife: 4 },
          size: { startSize: 20, startSizeVariance: 10, endSize: 60, endSizeVariance: 20 },
          color: {
            startColor: { r: 255, g: 255, b: 200, a: 0.3 },
            startColorVariance: { r: 20, g: 20, b: 30, a: 0.1 },
            endColor: { r: 255, g: 255, b: 255, a: 0 },
            endColorVariance: { r: 0, g: 0, b: 0, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 0,
            endRotation: 0,
            endRotationVariance: 0,
            rotatePerSecond: 0,
            rotatePerSecondVariance: 0,
          },
          shape: { mode: 'point', emitOnEdge: false },
        },
      },
      {
        id: 'preset-leaves',
        name: '落叶',
        description: '飘落的树叶效果',
        category: 'natural',
        data: {
          blendMode: 'alpha',
          emitter: {
            mode: 'rectangle',
            position: { x: 0, y: 0 },
            emissionRate: 5,
            angle: 270,
            angleVariance: 30,
            speed: 20,
            speedVariance: 10,
            gravity: { x: 0, y: 15 },
            acceleration: 0,
            accelerationVariance: 0,
            drag: 0,
            radialAcceleration: 0,
            tangentialAcceleration: 25,
            maxParticles: 50,
            duration: -1,
            startDelay: 0,
          },
          life: { minLife: 5, maxLife: 10 },
          size: { startSize: 15, startSizeVariance: 5, endSize: 15, endSizeVariance: 5 },
          color: {
            startColor: { r: 255, g: 150, b: 50, a: 0.8 },
            startColorVariance: { r: 50, g: 50, b: 30, a: 0.2 },
            endColor: { r: 200, g: 100, b: 30, a: 0 },
            endColorVariance: { r: 30, g: 30, b: 20, a: 0 },
          },
          rotation: {
            startRotation: 0,
            startRotationVariance: 180,
            endRotation: 0,
            endRotationVariance: 360,
            rotatePerSecond: 60,
            rotatePerSecondVariance: 30,
          },
          shape: { mode: 'rectangle', rectWidth: 600, rectHeight: 0, emitOnEdge: false },
        },
      },
    ];
  }

  private loadMockSystems(): void {
    this.createSystemFromPreset('preset-fire', 'FireEffect');
    this.createSystemFromPreset('preset-smoke', 'SmokeEffect');
    this.createSystemFromPreset('preset-explosion', 'ExplosionEffect');
    this.createSystemFromPreset('preset-stars', 'StarField');
  }
}

export const particleEditorService = new ParticleEditorService();
