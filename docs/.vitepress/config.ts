import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TapDev Studio',
  description: '跨平台 TapTap 小游戏集成开发环境',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '文档', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/tapdev/tapdev-studio' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '入门指南',
          items: [
            { text: '安装', link: '/guide/install' },
            { text: '快速开始', link: '/guide/quickstart' },
            { text: '项目结构', link: '/guide/project-structure' }
          ]
        },
        {
          text: '功能介绍',
          items: [
            { text: '代码编辑器', link: '/guide/editor' },
            { text: '调试功能', link: '/guide/debugger' },
            { text: '构建系统', link: '/guide/build' },
            { text: '插件系统', link: '/guide/plugins' }
          ]
        },
        {
          text: '高级功能',
          items: [
            { text: '主题定制', link: '/guide/themes' },
            { text: '快捷键配置', link: '/guide/shortcuts' },
            { text: '命令面板', link: '/guide/command-palette' }
          ]
        }
      ],
      '/api/': [
        {
          text: '核心服务',
          items: [
            { text: 'BuildService', link: '/api/build-service' },
            { text: 'DebugService', link: '/api/debug-service' },
            { text: 'EventBus', link: '/api/event-bus' },
            { text: 'PluginService', link: '/api/plugin-service' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/tapdev/tapdev-studio' }
    ]
  }
})