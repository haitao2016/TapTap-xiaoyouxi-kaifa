/**
 * WebGPU 渲染引擎服务
 * 提供高性能的 WebGPU 渲染能力，用于游戏预览和可视化编辑器
 *
 * 注意：此服务为 WebGPU API 的轻量封装，实际使用时需要浏览器支持 WebGPU
 */

import { globalEventBus } from './event-bus';

// WebGPU 类型别名，使用 any 作为占位符
type WebGPUAdapter = any;
type WebGPUDevice = any;
type WebGPUCanvasContext = any;
type WebGPUTextureFormat = string;
type WebGPUPrimitiveTopology = string;
type WebGPUVertexBufferLayout = any;
type WebGPUBufferUsageFlags = number;
type WebGPUTextureUsageFlags = number;
type WebGPURenderPipeline = any;
type WebGPUShaderModule = any;
type WebGPUSupportedLimits = any;

export interface WebGPUCapabilities {
  supported: boolean;
  adapter: WebGPUAdapter | null;
  device: WebGPUDevice | null;
  features: string[];
  limits: WebGPUSupportedLimits | null;
}

export interface RenderTarget {
  id: string;
  canvas: HTMLCanvasElement;
  context: WebGPUCanvasContext | null;
  format: WebGPUTextureFormat;
}

export interface ShaderModule {
  id: string;
  name: string;
  code: string;
  type: 'vertex' | 'fragment' | 'compute';
  compiled: boolean;
  error?: string;
}

export interface PipelineConfig {
  id: string;
  name: string;
  vertexShader: string;
  fragmentShader: string;
  topology: WebGPUPrimitiveTopology;
  targets: { format: WebGPUTextureFormat }[];
  buffers: WebGPUVertexBufferLayout[];
}

export interface BufferData {
  id: string;
  label: string;
  data: Float32Array | Uint16Array | Uint32Array;
  usage: WebGPUBufferUsageFlags;
  type: 'vertex' | 'index' | 'uniform' | 'storage';
}

export interface TextureData {
  id: string;
  label: string;
  width: number;
  height: number;
  format: WebGPUTextureFormat;
  usage: WebGPUTextureUsageFlags;
  mipLevelCount: number;
  sampleCount: number;
}

export interface RenderStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  bufferSize: number;
  memoryUsage: number;
}

export class WebGPURendererService {
  private capabilities: WebGPUCapabilities = {
    supported: false,
    adapter: null,
    device: null,
    features: [],
    limits: null,
  };

  private renderTargets = new Map<string, RenderTarget>();
  private shaderModules = new Map<string, ShaderModule>();
  private buffers = new Map<string, BufferData>();
  private textures = new Map<string, TextureData>();
  private pipelines = new Map<string, WebGPURenderPipeline>();

  private currentRenderTarget: RenderTarget | null = null;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;
  private frameStartTime = 0;
  private stats: RenderStats = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    bufferSize: 0,
    memoryUsage: 0,
  };

  private animationFrameId: number | null = null;
  private renderCallback: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    this.checkSupport();
  }

  /**
   * 获取全局 navigator.gpu 对象
   */
  private getGPU(): any | null {
    if (typeof navigator === 'undefined') {
      return null;
    }
    return (navigator as any).gpu || null;
  }

  /**
   * 检查 WebGPU 支持情况
   */
  async checkSupport(): Promise<WebGPUCapabilities> {
    const gpu = this.getGPU();

    if (!gpu) {
      this.capabilities.supported = false;
      return this.capabilities;
    }

    try {
      const adapter = await gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        this.capabilities.supported = false;
        return this.capabilities;
      }

      const device = await adapter.requestDevice();

      this.capabilities = {
        supported: true,
        adapter,
        device,
        features: adapter.features ? Array.from(adapter.features) : [],
        limits: device.limits,
      };

      // 处理设备丢失事件
      device.lost.then((info: { message: string }) => {
        console.error('WebGPU device lost:', info.message);
        this.handleDeviceLost();
      });

      device.addEventListener('uncapturederror', (event: { error: Error }) => {
        console.error('WebGPU uncaptured error:', event.error);
      });

      this.isInitialized = true;

      globalEventBus.emit({
        type: 'webgpu:initialized',
        payload: { supported: true },
      });
    } catch (error) {
      console.error('Failed to initialize WebGPU:', error);
      this.capabilities.supported = false;
    }

    return this.capabilities;
  }

  /**
   * 获取渲染能力信息
   */
  getCapabilities(): WebGPUCapabilities {
    return { ...this.capabilities };
  }

  /**
   * 检查是否支持 WebGPU
   */
  isSupported(): boolean {
    return this.capabilities.supported;
  }

  /**
   * 创建渲染目标
   */
  createRenderTarget(id: string, canvas: HTMLCanvasElement): RenderTarget | null {
    if (!this.capabilities.supported || !canvas) {
      return null;
    }

    const context = canvas.getContext('webgpu') as WebGPUCanvasContext | null;
    if (!context) {
      return null;
    }

    const gpu = this.getGPU();
    const format = gpu?.getPreferredCanvasFormat?.() || 'bgra8unorm';

    context.configure({
      device: this.capabilities.device,
      format,
      alphaMode: 'premultiplied',
    });

    const target: RenderTarget = {
      id,
      canvas,
      context,
      format,
    };

    this.renderTargets.set(id, target);
    return target;
  }

  /**
   * 获取渲染目标
   */
  getRenderTarget(id: string): RenderTarget | undefined {
    return this.renderTargets.get(id);
  }

  /**
   * 设置当前渲染目标
   */
  setRenderTarget(id: string): boolean {
    const target = this.renderTargets.get(id);
    if (!target) {
      return false;
    }
    this.currentRenderTarget = target;
    return true;
  }

  /**
   * 移除渲染目标
   */
  removeRenderTarget(id: string): void {
    this.renderTargets.delete(id);
    if (this.currentRenderTarget && this.renderTargets.get(id)) {
      this.currentRenderTarget = null;
    }
  }

  /**
   * 编译着色器模块
   */
  async compileShader(
    id: string,
    name: string,
    code: string,
    type: 'vertex' | 'fragment' | 'compute'
  ): Promise<ShaderModule> {
    if (!this.capabilities.device) {
      return { id, name, code, type, compiled: false, error: 'Device not available' };
    }

    const module: ShaderModule = {
      id,
      name,
      code,
      type,
      compiled: false,
    };

    try {
      const shaderModule: WebGPUShaderModule = this.capabilities.device.createShaderModule({
        code,
      });
      const compInfo = await shaderModule.getCompilationInfo();

      if (compInfo.messages && compInfo.messages.length > 0) {
        const errors = compInfo.messages
          .filter((msg: { type: string; message: string; lineNum: number }) => msg.type === 'error')
          .map(
            (msg: { type: string; message: string; lineNum: number }) =>
              `${msg.message} (at line ${msg.lineNum})`
          )
          .join('\n');

        if (errors) {
          module.error = errors;
          module.compiled = false;
          globalEventBus.emit({
            type: 'webgpu:shader-error',
            payload: { id, name, errors },
          });
        }
      }

      module.compiled = !module.error;
      this.shaderModules.set(id, module);

      globalEventBus.emit({
        type: 'webgpu:shader-compiled',
        payload: { id, name, success: module.compiled },
      });
    } catch (error) {
      module.error = error instanceof Error ? error.message : 'Unknown error';
      module.compiled = false;
    }

    return module;
  }

  /**
   * 获取着色器模块
   */
  getShaderModule(id: string): ShaderModule | undefined {
    return this.shaderModules.get(id);
  }

  /**
   * 创建缓冲区
   */
  createBuffer(
    id: string,
    label: string,
    data: Float32Array | Uint16Array | Uint32Array,
    usage: WebGPUBufferUsageFlags,
    type: BufferData['type']
  ): BufferData | null {
    if (!this.capabilities.device) {
      return null;
    }

    try {
      const buffer = this.capabilities.device.createBuffer({
        label,
        size: data.byteLength,
        usage,
        mappedAtCreation: true,
      });

      const typedArray = new (data.constructor as any)(buffer.getMappedRange());
      typedArray.set(data);
      buffer.unmap();

      const bufferData: BufferData = {
        id,
        label,
        data,
        usage,
        type,
      };

      this.buffers.set(id, bufferData);
      this.updateStats();

      return bufferData;
    } catch (error) {
      console.error('Failed to create buffer:', error);
      return null;
    }
  }

  /**
   * 更新缓冲区数据
   */
  updateBuffer(id: string, data: Float32Array | Uint16Array | Uint32Array): boolean {
    const bufferData = this.buffers.get(id);
    if (!bufferData || !this.capabilities.device) {
      return false;
    }

    try {
      const buffer = this.capabilities.device.createBuffer({
        label: bufferData.label,
        size: data.byteLength,
        usage: bufferData.usage,
        mappedAtCreation: true,
      });

      const typedArray = new (data.constructor as any)(buffer.getMappedRange());
      typedArray.set(data);
      buffer.unmap();

      bufferData.data = data;
      this.buffers.set(id, bufferData);

      return true;
    } catch (error) {
      console.error('Failed to update buffer:', error);
      return false;
    }
  }

  /**
   * 获取缓冲区
   */
  getBuffer(id: string): BufferData | undefined {
    return this.buffers.get(id);
  }

  /**
   * 移除缓冲区
   */
  removeBuffer(id: string): void {
    this.buffers.delete(id);
    this.updateStats();
  }

  /**
   * 创建纹理
   */
  createTexture(
    id: string,
    label: string,
    width: number,
    height: number,
    format: WebGPUTextureFormat = 'rgba8unorm',
    usage: WebGPUTextureUsageFlags = 0x04 | 0x10,
    mipLevelCount = 1,
    sampleCount = 1
  ): TextureData | null {
    if (!this.capabilities.device) {
      return null;
    }

    try {
      const texture = this.capabilities.device.createTexture({
        label,
        size: { width, height, depthOrArrayLayers: 1 },
        mipLevelCount,
        sampleCount,
        format,
        usage,
      });

      const textureData: TextureData = {
        id,
        label,
        width,
        height,
        format,
        usage,
        mipLevelCount,
        sampleCount,
      };

      this.textures.set(id, textureData);
      this.updateStats();

      return textureData;
    } catch (error) {
      console.error('Failed to create texture:', error);
      return null;
    }
  }

  /**
   * 获取纹理
   */
  getTexture(id: string): TextureData | undefined {
    return this.textures.get(id);
  }

  /**
   * 移除纹理
   */
  removeTexture(id: string): void {
    this.textures.delete(id);
    this.updateStats();
  }

  /**
   * 开始帧渲染
   */
  beginFrame(): void {
    this.frameStartTime = performance.now();
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
  }

  /**
   * 结束帧渲染
   */
  endFrame(): void {
    const frameTime = performance.now() - this.frameStartTime;
    this.stats.frameTime = frameTime;
    this.frameCount++;

    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.stats.fps = this.currentFps;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    globalEventBus.emit({
      type: 'webgpu:frame',
      payload: { stats: { ...this.stats } },
    });
  }

  /**
   * 获取渲染统计信息
   */
  getStats(): RenderStats {
    return { ...this.stats };
  }

  /**
   * 开始渲染循环
   */
  startRenderLoop(callback: () => void): void {
    this.renderCallback = callback;
    this.render();
  }

  /**
   * 停止渲染循环
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderCallback = null;
  }

  /**
   * 内部渲染循环
   */
  private render = (): void => {
    if (this.renderCallback) {
      this.renderCallback();
    }
    this.animationFrameId = requestAnimationFrame(this.render);
  };

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.textures = this.textures.size;
    this.stats.bufferSize = Array.from(this.buffers.values()).reduce(
      (sum, buf) => sum + buf.data.byteLength,
      0
    );
  }

  /**
   * 处理设备丢失
   */
  private handleDeviceLost(): void {
    this.isInitialized = false;
    this.stopRenderLoop();

    globalEventBus.emit({
      type: 'webgpu:device-lost',
      payload: {},
    });

    // 尝试重新初始化
    setTimeout(() => {
      this.reinitialize();
    }, 1000);
  }

  /**
   * 重新初始化
   */
  private async reinitialize(): Promise<void> {
    await this.checkSupport();
    if (this.capabilities.supported) {
      globalEventBus.emit({
        type: 'webgpu:reinitialized',
        payload: {},
      });
    }
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    this.stopRenderLoop();

    // 清理渲染目标
    this.renderTargets.forEach((target) => {
      // Canvas 不需要清理
    });
    this.renderTargets.clear();

    // 清理着色器模块
    this.shaderModules.clear();

    // 清理缓冲区
    this.buffers.clear();

    // 清理纹理
    this.textures.clear();

    // 清理管道
    this.pipelines.clear();

    this.currentRenderTarget = null;
    this.isInitialized = false;
  }
}

export const webgpuRendererService = new WebGPURendererService();
