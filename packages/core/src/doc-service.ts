import type { DocCategory, DocEntry } from '@tapdev/types';

const TAPTAP_DOC_BASE = 'https://developer.taptap.cn/minigameapidoc';

const BUILTIN_DOCS: DocCategory[] = [
  {
    id: 'quick-start',
    name: '快速入门',
    icon: 'rocket',
    entries: [
      {
        id: 'doc-guide',
        title: '小游戏文档指引',
        category: 'quick-start',
        url: `${TAPTAP_DOC_BASE}/quick-start/document-guide/`,
        tags: ['入门', '概览'],
      },
      {
        id: 'register',
        title: '注册与创建小游戏',
        category: 'quick-start',
        url: `${TAPTAP_DOC_BASE}/quick-start/register/`,
        tags: ['入驻', '认证'],
      },
    ],
  },
  {
    id: 'unity',
    name: 'Unity 适配',
    icon: 'unity',
    entries: [
      {
        id: 'unity-webgl',
        title: 'Unity WebGL 适配方案',
        category: 'unity',
        url: `${TAPTAP_DOC_BASE}/dev/engine/unity-adaptation/unity-webGL/`,
        tags: ['Unity', 'WebGL', 'WASM'],
        content: `# Unity WebGL 适配方案

TapTap 小游戏基于 WebAssembly 技术，无需更换 Unity 引擎与重写核心代码。

## 推荐版本
- Unity 2022.3.* 及以上（推荐）
- Unity 2021.1.* 及以上
- 团结引擎 WebGL 1.0.0+

## 安装 SDK
1. 打开 Package Manager
2. 添加 Git URL: https://github.com/taptap/minigame-sdk-unity.git
3. 菜单栏出现 "TapTap 小游戏"

## 构建流程
1. TapTap 小游戏 > 构建
2. 填写配置信息
3. 生成 game.zip 和 game_wasm_split.zip`,
      },
      {
        id: 'engine-suggestions',
        title: '兼容性和引擎建议',
        category: 'unity',
        url: `${TAPTAP_DOC_BASE}/dev/engine/unity-adaptation/engine-suggestions/`,
        tags: ['兼容性', '性能'],
      },
      {
        id: 'unity-tools',
        title: 'TapMiniGame 工具使用说明',
        category: 'unity',
        url: `${TAPTAP_DOC_BASE}/dev/engine/unity-adaptation/unity-tools/`,
        tags: ['DevTools', '资源优化'],
      },
    ],
  },
  {
    id: 'api',
    name: 'API 参考',
    icon: 'code',
    entries: [
      {
        id: 'tap-api',
        title: 'TapTap 小游戏 API',
        category: 'api',
        url: `${TAPTAP_DOC_BASE}/dev/api/`,
        tags: ['API', 'SDK'],
        content: `# TapTap 小游戏 API

## 分享
\`\`\`javascript
tap.showShareboard({
  title: '快来玩这个游戏！',
  success: () => console.log('分享成功'),
});
\`\`\`

## 登录
\`\`\`javascript
tap.login({
  success: (res) => console.log('用户ID:', res.openId),
});
\`\`\`

## 广告
\`\`\`javascript
const ad = tap.createRewardedVideoAd({ adUnitId: 'xxx' });
ad.show();
\`\`\``,
      },
    ],
  },
  {
    id: 'debug',
    name: '调试与测试',
    icon: 'bug',
    entries: [
      {
        id: 'debug-guide',
        title: '调试指南',
        category: 'debug',
        tags: ['调试', '真机'],
        content: `# 调试指南

## 本地调试
1. 启动 DevTools 本地服务器（默认端口 8081）
2. 在 Chrome/Safari 中打开调试 URL
3. 查看 Console 输出和网络请求

## 真机调试
1. 生成调试二维码
2. 使用 TapTap App 扫码
3. 在 DevTools 中查看真机日志

## 自动化测试
上传后台后可进行自动化测试与自测。`,
      },
    ],
  },
  {
    id: 'publish',
    name: '发布运营',
    icon: 'upload',
    entries: [
      {
        id: 'publish-guide',
        title: '发布流程',
        category: 'publish',
        tags: ['发布', '备案'],
        content: `# 发布流程

1. 完成小游戏前置备案
2. 上传 game.zip 至 TapTap 开发者后台
3. 配置宣传物料
4. 提交审核
5. 审核通过后正式上线`,
      },
    ],
  },
];

export class DocService {
  private categories: DocCategory[] = [...BUILTIN_DOCS];
  private searchIndex: DocEntry[] = [];

  constructor() {
    this.rebuildSearchIndex();
  }

  getCategories(): DocCategory[] {
    return [...this.categories];
  }

  getEntry(entryId: string): DocEntry | undefined {
    for (const cat of this.categories) {
      const entry = cat.entries.find((e) => e.id === entryId);
      if (entry) return entry;
    }
    return undefined;
  }

  search(query: string): DocEntry[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return this.searchIndex.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.tags.some((t) => t.toLowerCase().includes(q)) ||
        entry.content?.toLowerCase().includes(q)
    );
  }

  addCustomDoc(categoryId: string, entry: DocEntry): void {
    const category = this.categories.find((c) => c.id === categoryId);
    if (category) {
      category.entries.push(entry);
      this.rebuildSearchIndex();
    }
  }

  private rebuildSearchIndex(): void {
    this.searchIndex = this.categories.flatMap((c) => c.entries);
  }
}

export const docService = new DocService();
