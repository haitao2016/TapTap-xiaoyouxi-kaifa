// VR/AR 预览模式
// 基于 WebXR 的沉浸式开发体验

import { globalEventBus } from '../core/event-bus';

// XR 模式
export type XRMode = 'none' | 'vr' | 'ar';

// XR 会话
export interface XRSession {
  id: string;
  mode: XRMode;
  status: 'idle' | 'initializing' | 'active' | 'paused' | 'ended' | 'error';
  startTime?: number;
  endTime?: number;
  // 设备
  device: {
    isVR: boolean;
    isAR: boolean;
    hasHandTracking: boolean;
    hasEyeTracking: boolean;
    hasControllers: boolean;
    vendor: string;
    model: string;
  };
  // 会话配置
  config: {
    referenceSpace: 'local' | 'local-floor' | 'viewer' | 'bounded';
    requiredFeatures: string[];
    optionalFeatures: string[];
  };
}

// 空间锚点
export interface SpatialAnchor {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
  label: string;
  persistent: boolean;
  createdAt: number;
  // 关联的游戏对象
  gameObjectId?: string;
}

// VR 场景
export interface VRScene {
  id: string;
  name: string;
  // 场景对象
  objects: {
    id: string;
    type: 'mesh' | 'light' | 'camera' | 'audio' | 'ui';
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
    data: any;
    interactive: boolean;
  }[];
  // 环境
  environment: {
    skybox?: string;
    ambientLight?: { color: string; intensity: number };
    fog?: { color: string; near: number; far: number };
  };
  // 物理
  physics?: { gravity: number };
}

// 控制器输入
export interface ControllerInput {
  controllerId: string;
  // 姿态
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  // 按钮
  buttons: { name: string; pressed: boolean; touched: boolean; value: number }[];
  // 摇杆
  axes: { x: number; y: number };
  // 触发器
  trigger: number;
  // 握把
  grip: number;
}

class VRARPreviewService {
  private currentSession: XRSession | null = null;
  private sessions: XRSession[] = [];
  private anchors = new Map<string, SpatialAnchor>();
  private scenes = new Map<string, VRScene>();
  private controllerInputs = new Map<string, ControllerInput>();
  private listeners = new Set<(event: string, data: any) => void>();
  private xrSupported: boolean = false;
  private xrCapabilities: { vr: boolean; ar: boolean } = { vr: false, ar: false };

  constructor() {
    this.checkXRSupport();
  }

  // 检查 XR 支持
  private async checkXRSupport(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      this.xrSupported = false;
      return;
    }
    try {
      this.xrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      this.xrCapabilities.vr = this.xrSupported;
      if (navigator.xr.isSessionSupported) {
        try {
          this.xrCapabilities.ar = await navigator.xr.isSessionSupported('immersive-ar');
        } catch (e) {
          this.xrCapabilities.ar = false;
        }
      }
      this.notify('xr:capability-updated', this.xrCapabilities);
    } catch (e) {
      this.xrSupported = false;
    }
  }

  // 启动 VR 会话
  async startVRSession(config?: Partial<XRSession['config']>): Promise<XRSession> {
    const session: XRSession = {
      id: `xrsess-${Date.now()}`,
      mode: 'vr',
      status: 'initializing',
      device: await this.detectDevice(),
      config: {
        referenceSpace: 'local-floor',
        requiredFeatures: ['local'],
        optionalFeatures: ['hand-tracking', 'bounded-floor', 'eye-tracking'],
        ...config,
      },
    };

    this.currentSession = session;
    this.sessions.push(session);
    this.notify('vr:starting', session);

    try {
      // 实际启动 WebXR 会话
      if (typeof navigator !== 'undefined' && navigator.xr && this.xrCapabilities.vr) {
        const xrSession = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: session.config.requiredFeatures,
          optionalFeatures: session.config.optionalFeatures,
        });
        session.status = 'active';
        session.startTime = Date.now();
        this.notify('vr:started', session);
        this.setupSessionListeners(xrSession);
        return session;
      } else {
        // 模拟启动（无真实设备）
        session.status = 'active';
        session.startTime = Date.now();
        this.notify('vr:started', session);
        this.simulateVRLoop(session);
        return session;
      }
    } catch (e: any) {
      session.status = 'error';
      this.notify('vr:error', { session, error: e.message });
      throw e;
    }
  }

  // 启动 AR 会话
  async startARSession(): Promise<XRSession> {
    const session: XRSession = {
      id: `xrsess-${Date.now()}`,
      mode: 'ar',
      status: 'initializing',
      device: await this.detectDevice(),
      config: {
        referenceSpace: 'viewer',
        requiredFeatures: ['local'],
        optionalFeatures: ['hit-test', 'dom-overlay'],
      },
    };

    this.currentSession = session;
    this.sessions.push(session);

    if (typeof navigator !== 'undefined' && navigator.xr && this.xrCapabilities.ar) {
      try {
        const xrSession = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: session.config.requiredFeatures,
          optionalFeatures: session.config.optionalFeatures,
        });
        session.status = 'active';
        session.startTime = Date.now();
        this.notify('ar:started', session);
        return session;
      } catch (e: any) {
        session.status = 'error';
        throw e;
      }
    } else {
      session.status = 'active';
      session.startTime = Date.now();
      this.simulateARLoop(session);
      return session;
    }
  }

  // 检测设备
  private async detectDevice(): Promise<XRSession['device']> {
    // 实际应使用 XR 设备的 vendor 信息
    return {
      isVR: true,
      isAR: false,
      hasHandTracking: true,
      hasEyeTracking: false,
      hasControllers: true,
      vendor: 'Unknown',
      model: 'Generic VR',
    };
  }

  // 设置会话监听
  private setupSessionListeners(xrSession: any): void {
    xrSession.addEventListener('end', () => {
      if (this.currentSession) {
        this.currentSession.status = 'ended';
        this.currentSession.endTime = Date.now();
        this.notify('xr:ended', this.currentSession);
        this.currentSession = null;
      }
    });
  }

  // 模拟 VR 循环
  private simulateVRLoop(session: XRSession): void {
    // 模拟控制器更新
    const interval = setInterval(() => {
      if (session.status !== 'active') {
        clearInterval(interval);
        return;
      }
      this.updateSimulatedControllers();
    }, 16);
  }

  // 模拟 AR 循环
  private simulateARLoop(session: XRSession): void {
    const interval = setInterval(() => {
      if (session.status !== 'active') {
        clearInterval(interval);
        return;
      }
      this.updateSimulatedControllers();
    }, 16);
  }

  // 模拟控制器
  private updateSimulatedControllers(): void {
    const leftInput: ControllerInput = {
      controllerId: 'left',
      position: { x: -0.3 + Math.sin(Date.now() / 1000) * 0.1, y: 1.2, z: -0.5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      buttons: [
        { name: 'trigger', pressed: false, touched: false, value: 0 },
        { name: 'grip', pressed: false, touched: false, value: 0 },
        { name: 'menu', pressed: false, touched: false, value: 0 },
      ],
      axes: { x: 0, y: 0 },
      trigger: 0,
      grip: 0,
    };
    const rightInput: ControllerInput = {
      controllerId: 'right',
      position: { x: 0.3 + Math.sin(Date.now() / 1000) * 0.1, y: 1.2, z: -0.5 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      buttons: [
        { name: 'trigger', pressed: false, touched: false, value: 0 },
        { name: 'grip', pressed: false, touched: false, value: 0 },
        { name: 'a', pressed: false, touched: false, value: 0 },
      ],
      axes: { x: 0, y: 0 },
      trigger: 0,
      grip: 0,
    };
    this.controllerInputs.set('left', leftInput);
    this.controllerInputs.set('right', rightInput);
  }

  // 结束会话
  async endSession(): Promise<void> {
    if (!this.currentSession) return;
    this.currentSession.status = 'ended';
    this.currentSession.endTime = Date.now();
    this.notify('xr:ended', this.currentSession);
    this.currentSession = null;
  }

  // 创建空间锚点
  createAnchor(anchor: Omit<SpatialAnchor, 'id' | 'createdAt'>): SpatialAnchor {
    const newAnchor: SpatialAnchor = {
      ...anchor,
      id: `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    this.anchors.set(newAnchor.id, newAnchor);
    this.notify('anchor:created', newAnchor);
    return newAnchor;
  }

  // 命中测试（AR 中在真实世界表面创建锚点）
  async hitTest(ray: { origin: any; direction: any }): Promise<SpatialAnchor | null> {
    if (typeof navigator === 'undefined' || !navigator.xr) return null;
    // 实际实现应使用 XRHitTestSource
    return this.createAnchor({
      position: { x: 0, y: 0, z: -1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      label: 'Hit Test Result',
      persistent: false,
    });
  }

  // 加载场景
  loadScene(scene: Omit<VRScene, 'id'>): VRScene {
    const newScene: VRScene = {
      ...scene,
      id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.scenes.set(newScene.id, newScene);
    this.notify('scene:loaded', newScene);
    return newScene;
  }

  // 在 VR 中编辑对象
  editObjectInVR(
    sceneId: string,
    objectId: string,
    updates: { position?: any; rotation?: any; scale?: any }
  ): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;
    const obj = scene.objects.find((o) => o.id === objectId);
    if (!obj) return;
    Object.assign(obj, updates);
    this.notify('object:edited', { sceneId, objectId, updates });
  }

  // VR 编辑模式：使用控制器抓取移动对象
  grabAndMove(objectId: string, controllerId: string): void {
    const controller = this.controllerInputs.get(controllerId);
    if (!controller) return;
    this.notify('object:grabbed', { objectId, controllerId, position: controller.position });
  }

  // 获取当前会话
  getCurrentSession(): XRSession | null {
    return this.currentSession;
  }

  // 获取控制器输入
  getControllerInput(controllerId: string): ControllerInput | undefined {
    return this.controllerInputs.get(controllerId);
  }

  // 获取所有控制器
  getAllControllers(): ControllerInput[] {
    return Array.from(this.controllerInputs.values());
  }

  // 列出场景
  listScenes(): VRScene[] {
    return Array.from(this.scenes.values());
  }

  // 列出锚点
  listAnchors(): SpatialAnchor[] {
    return Array.from(this.anchors.values());
  }

  // 检查支持
  isSupported(): { xr: boolean; vr: boolean; ar: boolean } {
    return {
      xr: this.xrSupported,
      ...this.xrCapabilities,
    };
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

export const vrArPreviewService = new VRARPreviewService();
