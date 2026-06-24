import {
  html5Adapter2D,
  html5Adapter3D,
  cocosAdapter,
  detectProjectEngine,
  listAllTemplates,
} from '../packages/core/src/engines';
import { createEnhancedProject, detectShaderLanguage } from '../packages/core/src/engines/language-enhance';

describe('Phase 6: Engine Adapters', () => {
  describe('Html5Adapter2D', () => {
    it('should list supported templates', () => {
      const templates = html5Adapter2D.getSupportedTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates).toContain('2d-platformer');
    });

    it('should create project files for a template', () => {
      const result = html5Adapter2D.createProject({
        name: 'TestGame',
        path: '/tmp/test',
        template: '2d-platformer',
      });
      expect(result.files.length).toBeGreaterThan(0);
      const indexFile = result.files.find((f) => f.path === 'index.html');
      expect(indexFile).toBeDefined();
      expect(indexFile!.content).toContain('TestGame');
      const gameJson = result.files.find((f) => f.path === 'game.json');
      expect(gameJson).toBeDefined();
    });

    it('should fallback to default template for unknown one', () => {
      const result = html5Adapter2D.createProject({
        name: 'X',
        path: '/tmp/x',
        template: 'invalid-template',
      });
      expect(result.files.length).toBeGreaterThan(0);
    });
  });

  describe('Html5Adapter3D', () => {
    it('should list 3D templates', () => {
      const templates = html5Adapter3D.getSupportedTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should create threejs project', () => {
      const result = html5Adapter3D.createProject({
        name: '3DTest',
        path: '/tmp/3d',
        template: '3d-threejs-runner',
      });
      const pkg = result.files.find((f) => f.path === 'package.json');
      expect(pkg).toBeDefined();
      expect(pkg!.content).toContain('three');
    });

    it('should create babylon project', () => {
      const result = html5Adapter3D.createProject({
        name: 'BTest',
        path: '/tmp/b',
        template: '3d-babylon-puzzle',
      });
      expect(result.files.some((f) => f.content.includes('BABYLON'))).toBe(true);
    });
  });

  describe('CocosAdapter', () => {
    it('should reject non-cocos paths', () => {
      const result = cocosAdapter.parseProject('/nonexistent/path');
      expect(result).toBeNull();
    });
  });

  describe('detectProjectEngine', () => {
    it('should return null for non-existent path', () => {
      expect(detectProjectEngine('/nope/nope/nope')).toBeNull();
    });
  });

  describe('listAllTemplates', () => {
    it('should list templates for all engines', () => {
      const templates = listAllTemplates();
      expect(templates['native-js-2d'].length).toBeGreaterThan(0);
      expect(templates['native-js-3d'].length).toBeGreaterThan(0);
    });
  });

  describe('LanguageEnhance', () => {
    it('should detect GLSL shader', () => {
      expect(detectShaderLanguage('foo.vert')).toBe('glsl');
      expect(detectShaderLanguage('foo.frag')).toBe('glsl');
    });

    it('should detect WGSL shader', () => {
      expect(detectShaderLanguage('foo.wgsl')).toBe('wgsl');
    });

    it('should create enhanced project with shader files', () => {
      const result = createEnhancedProject({ projectPath: '/tmp/x', withShader: true });
      const shaderFiles = result.files.filter((f) => f.path.includes('shader') || f.path.endsWith('.vert') || f.path.endsWith('.frag') || f.path.endsWith('.wgsl'));
      expect(shaderFiles.length).toBeGreaterThan(0);
    });
  });
});
