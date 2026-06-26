/**
 * WebGPU 渲染引擎服务测试
 * Phase v3.1: WebGPU 渲染引擎升级
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock WebGPU API
const mockGPU = {
  requestAdapter: vi.fn(),
  getPreferredCanvasFormat: vi.fn().mockReturnValue('bgra8unorm'),
};

const mockAdapter = {
  requestDevice: vi.fn(),
  features: new Set(['timestamp-query']),
};

const mockDevice = {
  createShaderModule: vi.fn(),
  createBuffer: vi.fn(),
  createTexture: vi.fn(),
  createRenderPipeline: vi.fn(),
  lost: {
    then: vi.fn((cb: (info: { message: string }) => void) => {
      // Don't call callback in tests
    }),
  },
  addEventListener: vi.fn(),
};

// Mock navigator.gpu
Object.defineProperty(global, 'navigator', {
  value: {
    gpu: mockGPU,
  },
  configurable: true,
});

describe('Phase v3.1: WebGPU Renderer Service', () => {
  describe('WebGPURendererService', () => {
    let WebGPURendererService: any;
    let webgpuRendererService: any;

    beforeEach(async () => {
      vi.clearAllMocks();

      // Reset modules
      vi.resetModules();

      // Mock GPU setup
      mockGPU.requestAdapter.mockResolvedValue(mockAdapter);
      mockAdapter.requestDevice.mockResolvedValue(mockDevice);

      // Import the service
      const module = await import('@tapdev/core');
      WebGPURendererService = module.WebGPURendererService;
      webgpuRendererService = module.webgpuRendererService;
    });

    describe('checkSupport', () => {
      it('should check WebGPU support', async () => {
        const capabilities = await webgpuRendererService.checkSupport();

        // May or may not be supported depending on environment
        expect(capabilities).toBeDefined();
        expect(capabilities.supported).toBeDefined();
        expect(typeof capabilities.supported).toBe('boolean');
      });

      it('should return capabilities object', async () => {
        await webgpuRendererService.checkSupport();
        const capabilities = webgpuRendererService.getCapabilities();

        expect(capabilities).toHaveProperty('supported');
        expect(capabilities).toHaveProperty('adapter');
        expect(capabilities).toHaveProperty('device');
        expect(capabilities).toHaveProperty('features');
        expect(capabilities).toHaveProperty('limits');
      });
    });

    describe('isSupported', () => {
      it('should return boolean indicating WebGPU support', () => {
        const supported = webgpuRendererService.isSupported();
        expect(typeof supported).toBe('boolean');
      });
    });

    describe('createRenderTarget', () => {
      it('should return null when WebGPU not supported', () => {
        // Force unsupported state
        vi.spyOn(webgpuRendererService as any, 'capabilities', 'get').mockReturnValue({
          supported: false,
        });

        const canvas = document.createElement('canvas');
        const target = webgpuRendererService.createRenderTarget('test', canvas);

        expect(target).toBeNull();
      });

      it('should return null for invalid canvas', () => {
        const target = webgpuRendererService.createRenderTarget('test', null as any);
        expect(target).toBeNull();
      });
    });

    describe('Render Target Management', () => {
      it('should get render target by id', () => {
        const target = webgpuRendererService.getRenderTarget('nonexistent');
        expect(target).toBeUndefined();
      });

      it('should set current render target', () => {
        const result = webgpuRendererService.setRenderTarget('nonexistent');
        expect(result).toBe(false);
      });

      it('should remove render target', () => {
        expect(() => webgpuRendererService.removeRenderTarget('nonexistent')).not.toThrow();
      });
    });

    describe('Shader Compilation', () => {
      it('should handle shader compilation when device not available', async () => {
        // Force no device
        vi.spyOn(webgpuRendererService as any, 'capabilities', 'get').mockReturnValue({
          supported: true,
          device: null,
        });

        const module = await webgpuRendererService.compileShader(
          'test-shader',
          'Test Shader',
          'some shader code',
          'vertex'
        );

        expect(module.compiled).toBe(false);
        expect(module.error).toBeDefined();
      });
    });

    describe('Shader Module Management', () => {
      it('should get shader module by id', () => {
        const module = webgpuRendererService.getShaderModule('nonexistent');
        expect(module).toBeUndefined();
      });
    });

    describe('Buffer Management', () => {
      it('should return null when device not available', () => {
        vi.spyOn(webgpuRendererService as any, 'capabilities', 'get').mockReturnValue({
          supported: true,
          device: null,
        });

        const buffer = webgpuRendererService.createBuffer(
          'test-buffer',
          'Test Buffer',
          new Float32Array([1, 2, 3]),
          0,
          'vertex'
        );

        expect(buffer).toBeNull();
      });

      it('should get buffer by id', () => {
        const buffer = webgpuRendererService.getBuffer('nonexistent');
        expect(buffer).toBeUndefined();
      });

      it('should remove buffer', () => {
        expect(() => webgpuRendererService.removeBuffer('nonexistent')).not.toThrow();
      });
    });

    describe('Texture Management', () => {
      it('should return null when device not available', () => {
        vi.spyOn(webgpuRendererService as any, 'capabilities', 'get').mockReturnValue({
          supported: true,
          device: null,
        });

        const texture = webgpuRendererService.createTexture(
          'test-texture',
          'Test Texture',
          256,
          256
        );

        expect(texture).toBeNull();
      });

      it('should get texture by id', () => {
        const texture = webgpuRendererService.getTexture('nonexistent');
        expect(texture).toBeUndefined();
      });

      it('should remove texture', () => {
        expect(() => webgpuRendererService.removeTexture('nonexistent')).not.toThrow();
      });
    });

    describe('Frame Rendering', () => {
      it('should begin and end frame', () => {
        expect(() => webgpuRendererService.beginFrame()).not.toThrow();
        expect(() => webgpuRendererService.endFrame()).not.toThrow();
      });
    });

    describe('Render Statistics', () => {
      it('should return initial stats', () => {
        const stats = webgpuRendererService.getStats();

        expect(stats).toBeDefined();
        expect(stats).toHaveProperty('fps');
        expect(stats).toHaveProperty('frameTime');
        expect(stats).toHaveProperty('drawCalls');
        expect(stats).toHaveProperty('triangles');
        expect(stats).toHaveProperty('textures');
        expect(stats).toHaveProperty('bufferSize');
        expect(stats).toHaveProperty('memoryUsage');
      });
    });

    describe('Render Loop', () => {
      it('should start and stop render loop', () => {
        const callback = vi.fn();

        expect(() => webgpuRendererService.startRenderLoop(callback)).not.toThrow();
        expect(() => webgpuRendererService.stopRenderLoop()).not.toThrow();
      });
    });

    describe('Dispose', () => {
      it('should dispose all resources', () => {
        expect(() => webgpuRendererService.dispose()).not.toThrow();
      });
    });

    describe('WebGPUCapabilities interface', () => {
      it('should have correct structure', () => {
        const capabilities: any = webgpuRendererService.getCapabilities();

        expect(capabilities).toHaveProperty('supported');
        expect(capabilities).toHaveProperty('adapter');
        expect(capabilities).toHaveProperty('device');
        expect(capabilities).toHaveProperty('features');
        expect(capabilities).toHaveProperty('limits');
      });
    });

    describe('RenderStats interface', () => {
      it('should have correct structure', () => {
        const stats = webgpuRendererService.getStats();

        expect(typeof stats.fps).toBe('number');
        expect(typeof stats.frameTime).toBe('number');
        expect(typeof stats.drawCalls).toBe('number');
        expect(typeof stats.triangles).toBe('number');
        expect(typeof stats.textures).toBe('number');
        expect(typeof stats.bufferSize).toBe('number');
        expect(typeof stats.memoryUsage).toBe('number');
      });
    });
  });
});
