import { pluginMarketService } from '../packages/core/src/plugin-market-service';
import { templateService } from '../packages/core/src/template-service';
import { pluginSandbox } from '../packages/core/src/plugin-sandbox';

describe('Plugin Market Service', () => {
  it('should have marketplace plugins', () => {
    const result = pluginMarketService.getMarketplacePlugins();
    expect(result.total).toBeGreaterThan(0);
    expect(result.plugins.length).toBeGreaterThan(0);
  });

  it('should have categories', () => {
    const categories = pluginMarketService.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    categories.forEach(cat => {
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeDefined();
      expect(cat.pluginCount).toBeGreaterThan(0);
    });
  });

  it('should search plugins', () => {
    const result = pluginMarketService.getMarketplacePlugins({ query: '主题' });
    expect(result.plugins.length).toBeGreaterThan(0);
  });

  it('should filter by category', () => {
    const result = pluginMarketService.getMarketplacePlugins({ category: 'ui' });
    expect(result.plugins.length).toBeGreaterThan(0);
    result.plugins.forEach(p => expect(p.category).toBe('ui'));
  });

  it('should get plugin by id', () => {
    const plugin = pluginMarketService.getPluginById('tapdev-theme-manager');
    expect(plugin).toBeDefined();
    expect(plugin?.name).toBe('主题管理器');
  });

  it('should install and uninstall plugin', async () => {
    const pluginId = 'tapdev-theme-manager';
    await pluginMarketService.installPlugin(pluginId);
    expect(pluginMarketService.isPluginInstalled(pluginId)).toBe(true);
    
    await pluginMarketService.uninstallPlugin(pluginId);
    expect(pluginMarketService.isPluginInstalled(pluginId)).toBe(false);
  });

  it('should get featured plugins', () => {
    const featured = pluginMarketService.getFeaturedPlugins();
    expect(featured.length).toBeGreaterThan(0);
  });

  it('should get related plugins', () => {
    const related = pluginMarketService.getRelatedPlugins('tapdev-theme-manager');
    expect(Array.isArray(related)).toBe(true);
  });
});

describe('Template Service', () => {
  it('should have templates', () => {
    const result = templateService.getTemplates();
    expect(result.total).toBeGreaterThan(0);
  });

  it('should have categories', () => {
    const categories = templateService.getCategories();
    expect(categories.length).toBeGreaterThan(0);
  });

  it('should get template by id', () => {
    const template = templateService.getTemplateById('tapdev-empty-project');
    expect(template).toBeDefined();
    expect(template?.name).toBe('空项目');
  });

  it('should create project from template', async () => {
    const project = await templateService.createProject({
      templateId: 'tapdev-empty-project',
      projectName: 'Test Project',
    });
    
    expect(project.projectId).toBeDefined();
    expect(project.projectName).toBe('Test Project');
    expect(project.files.length).toBeGreaterThan(0);
  });

  it('should create project with variables', async () => {
    const project = await templateService.createProject({
      templateId: 'tapdev-empty-project',
      projectName: 'My Game',
    });
    
    const packageJson = templateService.getProjectFileContent(project.projectId, 'package.json');
    expect(packageJson).toContain('My Game');
  });

  it('should filter templates by framework', () => {
    const result = templateService.getTemplates({ framework: 'Phaser' });
    expect(result.total).toBeGreaterThan(0);
    result.templates.forEach(t => expect(t.framework).toBe('Phaser'));
  });
});

describe('Plugin Sandbox', () => {
  afterEach(() => {
    pluginSandbox.destroyAllSandboxes();
  });

  it('should create sandbox', () => {
    const runtime = pluginSandbox.createSandbox('test-plugin');
    expect(runtime.pluginId).toBe('test-plugin');
    expect(runtime.status).toBe('idle');
  });

  it('should register and call API method', async () => {
    pluginSandbox.createSandbox('test-plugin');
    (pluginSandbox as any).sandboxes.get('test-plugin').status = 'running';
    pluginSandbox.registerAPIMethod('test-plugin', 'add', (a: number, b: number) => a + b);
    
    const result = await pluginSandbox.callMethod('test-plugin', 'add', 1, 2);
    expect(result).toBe(3);
  });

  it('should send and receive messages', () => {
    pluginSandbox.createSandbox('test-plugin');
    
    let receivedPayload: unknown = null;
    pluginSandbox.onMessage('test-plugin', 'test-event', (payload) => {
      receivedPayload = payload;
    });
    
    pluginSandbox.sendMessage('test-plugin', { type: 'test-event', payload: 'hello' });
    
    expect(receivedPayload).toBe('hello');
  });

  it('should pause and resume sandbox', () => {
    pluginSandbox.createSandbox('test-plugin');
    (pluginSandbox as any).sandboxes.get('test-plugin').status = 'running';
    
    pluginSandbox.pauseSandbox('test-plugin');
    expect(pluginSandbox.getRuntime('test-plugin')?.status).toBe('paused');
    
    pluginSandbox.resumeSandbox('test-plugin');
    expect(pluginSandbox.getRuntime('test-plugin')?.status).toBe('running');
  });

  it('should terminate sandbox', () => {
    pluginSandbox.createSandbox('test-plugin');
    pluginSandbox.terminateSandbox('test-plugin');
    expect(pluginSandbox.getRuntime('test-plugin')?.status).toBe('terminated');
  });
});
