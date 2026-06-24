import { pluginManager } from '../packages/core/src/plugin-manager';

describe('PluginManager', () => {
  beforeEach(() => {
    (pluginManager as any).plugins = new Map();
    (pluginManager as any).commandPaletteItems = [];
  });

  describe('registerPlugin', () => {
    it('should register a plugin', () => {
      const meta = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        enabled: true,
        entry: 'test-plugin',
        hooks: [],
        category: 'Testing',
      };
      
      pluginManager.registerPlugin(meta);
      
      const plugins = pluginManager.getPlugins();
      expect(plugins).toContainEqual(meta);
    });
  });

  describe('activatePlugin', () => {
    it('should activate a plugin', async () => {
      let activated = false;
      
      pluginManager.registerPlugin(
        {
          id: 'test-activate',
          name: 'Test Activate',
          version: '1.0.0',
          description: 'Test',
          enabled: false,
          entry: 'test',
          hooks: [],
        },
        () => {
          activated = true;
        }
      );
      
      await pluginManager.activatePlugin('test-activate');
      
      const plugin = pluginManager.getPluginInfo('test-activate');
      expect(plugin?.activated).toBe(true);
      expect(activated).toBe(true);
    });
  });

  describe('deactivatePlugin', () => {
    it('should deactivate a plugin', async () => {
      pluginManager.registerPlugin(
        {
          id: 'test-deactivate',
          name: 'Test Deactivate',
          version: '1.0.0',
          description: 'Test',
          enabled: true,
          entry: 'test',
          hooks: [],
        },
        () => {},
        () => {}
      );
      
      await pluginManager.activatePlugin('test-deactivate');
      await pluginManager.deactivatePlugin('test-deactivate');
      
      const plugin = pluginManager.getPluginInfo('test-deactivate');
      expect(plugin?.activated).toBe(false);
    });
  });

  describe('getCommandPaletteItems', () => {
    it('should return command palette items with filter', async () => {
      pluginManager.registerPlugin(
        {
          id: 'test-cmd',
          name: 'Test Commands',
          version: '1.0.0',
          description: 'Test',
          enabled: true,
          entry: 'test',
          hooks: [],
        },
        (ctx) => {
          ctx.registerCommand('test-command', () => {}, {
            id: 'test-command',
            title: 'My Test Command',
            description: 'A test command',
            category: 'Testing',
          });
        }
      );
      
      await pluginManager.activatePlugin('test-cmd');
      
      const items = pluginManager.getCommandPaletteItems('test');
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].title).toBe('My Test Command');
    });

    it('should filter commands by title', async () => {
      pluginManager.registerPlugin(
        {
          id: 'test-filter',
          name: 'Test Filter',
          version: '1.0.0',
          description: 'Test',
          enabled: true,
          entry: 'test',
          hooks: [],
        },
        (ctx) => {
          ctx.registerCommand('cmd1', () => {}, {
            id: 'cmd1',
            title: 'Build Project',
            category: 'Build',
          });
          ctx.registerCommand('cmd2', () => {}, {
            id: 'cmd2',
            title: 'Run Tests',
            category: 'Testing',
          });
        }
      );
      
      await pluginManager.activatePlugin('test-filter');
      
      const filtered = pluginManager.getCommandPaletteItems('Build');
      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('Build Project');
    });
  });

  describe('loadBuiltinPlugins', () => {
    it('should load builtin plugins', () => {
      pluginManager.loadBuiltinPlugins();
      
      const plugins = pluginManager.getPlugins();
      expect(plugins.length).toBeGreaterThan(0);
      
      const unityTools = plugins.find(p => p.id === 'tapdev.unity-tools');
      expect(unityTools).not.toBeUndefined();
      expect(unityTools?.name).toBe('Unity 工具集');
    });
  });
});