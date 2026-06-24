import { buildService } from '../packages/core/src/build-service';

describe('BuildService', () => {
  beforeEach(() => {
    (buildService as any).tasks = new Map();
    (buildService as any).activeTaskId = null;
  });

  describe('validateConfig', () => {
    it('should validate config with missing required fields', () => {
      const result = buildService.validateConfig({
        projectId: 'test',
        projectPath: '',
        outputPath: '',
        compress: true,
        wasmSplit: true,
        development: false,
        targetPlatform: [],
        version: '',
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('项目路径不能为空');
      expect(result.errors).toContain('输出路径不能为空');
      expect(result.errors).toContain('版本号不能为空');
      expect(result.errors).toContain('至少选择一个目标平台');
    });

    it('should validate config with valid fields', () => {
      const result = buildService.validateConfig({
        projectId: 'test-project',
        projectPath: '/path/to/project',
        outputPath: '/path/to/output',
        compress: true,
        wasmSplit: true,
        development: false,
        targetPlatform: ['webgl'],
        version: '1.0.0',
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return supported platforms', () => {
      const platforms = buildService.getSupportedPlatforms();
      
      expect(platforms).toContain('webgl');
      expect(platforms).toContain('android');
      expect(platforms).toContain('ios');
    });
  });

  describe('getPlatformConfigs', () => {
    it('should return platform configurations', () => {
      const configs = buildService.getPlatformConfigs();
      
      expect(configs.length).toBeGreaterThan(0);
      
      const webglConfig = configs.find(c => c.platform === 'webgl');
      expect(webglConfig).not.toBeUndefined();
      expect(webglConfig?.supported).toBe(true);
      expect(webglConfig?.buildCommand).toBe('WebGL');
    });
  });

  describe('getAllTasks', () => {
    it('should return empty array when no tasks', () => {
      const tasks = buildService.getAllTasks();
      expect(tasks).toHaveLength(0);
    });
  });

  describe('getActiveTask', () => {
    it('should return null when no active task', () => {
      const task = buildService.getActiveTask();
      expect(task).toBe(null);
    });
  });
});