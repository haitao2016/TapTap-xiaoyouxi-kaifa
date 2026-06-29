import { globalEventBus } from './event-bus';
import { randomUUID } from './utils/crypto-utils';

export type AssetCategory =
  | 'game-component'
  | 'ui-template'
  | 'audio'
  | 'art'
  | 'particle'
  | 'scene-template'
  | 'full-project';

export type AssetPriceType = 'free' | 'paid' | 'subscription';

export interface AssetFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface AssetDependency {
  assetId?: string;
  name: string;
  version: string;
  optional?: boolean;
}

export interface AssetVersion {
  version: string;
  releaseDate: number;
  notes: string;
  breakingChanges?: boolean;
}

export interface AssetReview {
  id: string;
  assetId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  content: string;
  helpfulCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  author: string;
  authorId: string;
  authorAvatar?: string;
  version: string;
  category: AssetCategory;
  tags: string[];
  priceType: AssetPriceType;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  ratingCount: number;
  downloads: number;
  favorites: number;
  previewImages: string[];
  previewVideo?: string;
  icon?: string;
  files: AssetFile[];
  totalSize: number;
  dependencies: AssetDependency[];
  changelog: AssetVersion[];
  compatibleVersions: string[];
  createdAt: number;
  updatedAt: number;
  license: string;
  featured?: boolean;
  verified?: boolean;
  installed?: boolean;
  installedVersion?: string;
  installedAt?: number;
  isFavorite?: boolean;
}

export interface AssetCategoryInfo {
  id: AssetCategory;
  name: string;
  icon: string;
  description: string;
  assetCount: number;
}

export interface AssetSearchOptions {
  query?: string;
  category?: AssetCategory;
  priceType?: AssetPriceType;
  sortBy?: 'downloads' | 'rating' | 'updated' | 'created' | 'name' | 'price' | 'favorites';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  tags?: string[];
  featured?: boolean;
  verified?: boolean;
  installed?: boolean;
  minRating?: number;
  maxPrice?: number;
}

export interface AssetSearchResult {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AssetInstallation {
  assetId: string;
  version: string;
  installedAt: number;
  enabled: boolean;
}

export interface InstallAssetOptions {
  version?: string;
  onProgress?: (progress: number, stage: string) => void;
}

export interface AssetAuthor {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  assetCount: number;
  totalDownloads: number;
  averageRating: number;
  verified?: boolean;
  createdAt: number;
}

export class AssetStoreService {
  private assets: Asset[] = [];
  private installedAssets = new Map<string, AssetInstallation>();
  private favoriteAssets = new Set<string>();
  private categories: AssetCategoryInfo[] = [];
  private reviews = new Map<string, AssetReview[]>();
  private authors: AssetAuthor[] = [];

  constructor() {
    this.loadMockAssets();
    this.loadCategories();
    this.loadMockAuthors();
    this.loadMockReviews();
    this.loadInstalledAssets();
    this.loadFavoriteAssets();
  }

  getAssets(options?: AssetSearchOptions): AssetSearchResult {
    let result = [...this.assets];

    if (options?.query) {
      const query = options.query.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.tags.some((t) => t.toLowerCase().includes(query)) ||
          a.author.toLowerCase().includes(query)
      );
    }

    if (options?.category) {
      result = result.filter((a) => a.category === options.category);
    }

    if (options?.priceType) {
      result = result.filter((a) => a.priceType === options.priceType);
    }

    if (options?.tags && options.tags.length > 0) {
      result = result.filter((a) => options.tags!.some((tag) => a.tags.includes(tag)));
    }

    if (options?.featured) {
      result = result.filter((a) => a.featured);
    }

    if (options?.verified) {
      result = result.filter((a) => a.verified);
    }

    if (options?.installed !== undefined) {
      result = result.filter((a) => {
        const isInstalled = this.installedAssets.has(a.id);
        return options.installed ? isInstalled : !isInstalled;
      });
    }

    if (options?.minRating !== undefined) {
      result = result.filter((a) => a.rating >= options.minRating!);
    }

    if (options?.maxPrice !== undefined) {
      result = result.filter((a) => a.price <= options.maxPrice!);
    }

    const sortBy = options?.sortBy || 'downloads';
    const sortOrder = options?.sortOrder || 'desc';

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'downloads':
          comparison = b.downloads - a.downloads;
          break;
        case 'rating':
          comparison = b.rating - a.rating;
          break;
        case 'updated':
          comparison = b.updatedAt - a.updatedAt;
          break;
        case 'created':
          comparison = b.createdAt - a.createdAt;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'favorites':
          comparison = b.favorites - a.favorites;
          break;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    const total = result.length;
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const totalPages = Math.ceil(total / pageSize);

    return {
      assets: result.slice(start, end).map((a) => this.enrichAsset(a)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  getAssetById(assetId: string): Asset | undefined {
    const asset = this.assets.find((a) => a.id === assetId);
    return asset ? this.enrichAsset(asset) : undefined;
  }

  getCategories(): AssetCategoryInfo[] {
    return this.categories;
  }

  getCategoryById(categoryId: AssetCategory): AssetCategoryInfo | undefined {
    return this.categories.find((c) => c.id === categoryId);
  }

  getInstalledAssets(): Asset[] {
    const assets: Asset[] = [];
    this.installedAssets.forEach((install, assetId) => {
      const asset = this.assets.find((a) => a.id === assetId);
      if (asset) {
        assets.push(this.enrichAsset(asset));
      }
    });
    return assets;
  }

  getFavoriteAssets(): Asset[] {
    return this.assets.filter((a) => this.favoriteAssets.has(a.id)).map((a) => this.enrichAsset(a));
  }

  isAssetInstalled(assetId: string): boolean {
    return this.installedAssets.has(assetId);
  }

  isAssetFavorite(assetId: string): boolean {
    return this.favoriteAssets.has(assetId);
  }

  async installAsset(assetId: string, options?: InstallAssetOptions): Promise<AssetInstallation> {
    const asset = this.assets.find((a) => a.id === assetId);
    if (!asset) {
      throw new Error(`资产不存在: ${assetId}`);
    }

    const targetVersion = options?.version || asset.version;

    if (options?.onProgress) {
      options.onProgress(10, '正在下载资产文件...');
      await this.delay(200);
      options.onProgress(30, '正在验证文件完整性...');
      await this.delay(200);
      options.onProgress(50, '正在解压资源...');
      await this.delay(200);
      options.onProgress(70, '正在安装依赖...');
      await this.delay(200);
      options.onProgress(90, '正在配置项目...');
      await this.delay(200);
      options.onProgress(100, '安装完成');
    }

    const installation: AssetInstallation = {
      assetId,
      version: targetVersion,
      installedAt: Date.now(),
      enabled: true,
    };

    this.installedAssets.set(assetId, installation);
    this.saveInstalledAssets();

    asset.downloads++;

    globalEventBus.emit({
      type: 'asset:installed',
      payload: { assetId, version: targetVersion, asset },
    });

    return installation;
  }

  async uninstallAsset(assetId: string): Promise<void> {
    const install = this.installedAssets.get(assetId);
    if (!install) return;

    globalEventBus.emit({ type: 'asset:uninstalling', payload: { assetId } });

    await this.delay(300);

    this.installedAssets.delete(assetId);
    this.saveInstalledAssets();

    globalEventBus.emit({ type: 'asset:uninstalled', payload: { assetId } });
  }

  async updateAsset(assetId: string, targetVersion?: string): Promise<AssetInstallation> {
    const install = this.installedAssets.get(assetId);
    if (!install) {
      throw new Error(`资产未安装: ${assetId}`);
    }

    const asset = this.getAssetById(assetId);
    if (!asset) {
      throw new Error(`资产不存在: ${assetId}`);
    }

    const latestVersion = targetVersion || asset.version;
    if (install.version === latestVersion) {
      return install;
    }

    globalEventBus.emit({
      type: 'asset:updating',
      payload: { assetId, fromVersion: install.version, toVersion: latestVersion },
    });

    await this.delay(500);

    install.version = latestVersion;
    install.installedAt = Date.now();
    this.saveInstalledAssets();

    globalEventBus.emit({
      type: 'asset:updated',
      payload: { assetId, version: latestVersion },
    });

    return install;
  }

  toggleFavorite(assetId: string): boolean {
    const asset = this.assets.find((a) => a.id === assetId);
    if (!asset) {
      throw new Error(`资产不存在: ${assetId}`);
    }

    if (this.favoriteAssets.has(assetId)) {
      this.favoriteAssets.delete(assetId);
      asset.favorites = Math.max(0, asset.favorites - 1);
      globalEventBus.emit({ type: 'asset:unfavorited', payload: { assetId } });
      this.saveFavoriteAssets();
      return false;
    } else {
      this.favoriteAssets.add(assetId);
      asset.favorites++;
      globalEventBus.emit({ type: 'asset:favorited', payload: { assetId } });
      this.saveFavoriteAssets();
      return true;
    }
  }

  getAssetReviews(
    assetId: string,
    page = 1,
    pageSize = 10
  ): { reviews: AssetReview[]; total: number; totalPages: number } {
    const reviews = this.reviews.get(assetId) || [];
    const total = reviews.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return {
      reviews: reviews.slice(start, start + pageSize),
      total,
      totalPages,
    };
  }

  async addReview(
    assetId: string,
    userId: string,
    userName: string,
    rating: number,
    content: string,
    title?: string
  ): Promise<AssetReview> {
    const asset = this.assets.find((a) => a.id === assetId);
    if (!asset) {
      throw new Error(`资产不存在: ${assetId}`);
    }

    const review: AssetReview = {
      id: randomUUID(),
      assetId,
      userId,
      userName,
      rating,
      title,
      content,
      helpfulCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const existingReviews = this.reviews.get(assetId) || [];
    const existingIndex = existingReviews.findIndex((r) => r.userId === userId);

    if (existingIndex >= 0) {
      review.id = existingReviews[existingIndex].id;
      review.createdAt = existingReviews[existingIndex].createdAt;
      review.helpfulCount = existingReviews[existingIndex].helpfulCount;
      existingReviews[existingIndex] = review;
    } else {
      existingReviews.unshift(review);
    }

    this.reviews.set(assetId, existingReviews);

    const totalRating = existingReviews.reduce((sum, r) => sum + r.rating, 0);
    asset.rating = totalRating / existingReviews.length;
    asset.ratingCount = existingReviews.length;

    globalEventBus.emit({ type: 'asset:review-added', payload: { assetId, review } });

    return review;
  }

  markReviewHelpful(reviewId: string, assetId: string): void {
    const reviews = this.reviews.get(assetId) || [];
    const review = reviews.find((r) => r.id === reviewId);
    if (review) {
      review.helpfulCount++;
    }
  }

  getAuthor(authorId: string): AssetAuthor | undefined {
    return this.authors.find((a) => a.id === authorId);
  }

  getAuthorAssets(authorId: string): Asset[] {
    return this.assets.filter((a) => a.authorId === authorId).map((a) => this.enrichAsset(a));
  }

  getFeaturedAssets(limit = 10): Asset[] {
    return this.assets
      .filter((a) => a.featured)
      .slice(0, limit)
      .map((a) => this.enrichAsset(a));
  }

  getPopularAssets(limit = 10): Asset[] {
    return [...this.assets]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit)
      .map((a) => this.enrichAsset(a));
  }

  getNewestAssets(limit = 10): Asset[] {
    return [...this.assets]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map((a) => this.enrichAsset(a));
  }

  getTopRatedAssets(limit = 10): Asset[] {
    return [...this.assets]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
      .map((a) => this.enrichAsset(a));
  }

  getRelatedAssets(assetId: string, limit = 5): Asset[] {
    const asset = this.getAssetById(assetId);
    if (!asset) return [];

    return this.assets
      .filter((a) => a.id !== assetId && a.category === asset.category)
      .slice(0, limit)
      .map((a) => this.enrichAsset(a));
  }

  getAssetsByTag(tag: string): Asset[] {
    return this.assets.filter((a) => a.tags.includes(tag)).map((a) => this.enrichAsset(a));
  }

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.assets.forEach((a) => a.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }

  getInstalledCount(): number {
    return this.installedAssets.size;
  }

  getTotalCount(): number {
    return this.assets.length;
  }

  getFavoriteCount(): number {
    return this.favoriteAssets.size;
  }

  private enrichAsset(asset: Asset): Asset {
    const installed = this.installedAssets.has(asset.id);
    return {
      ...asset,
      installed,
      installedVersion: installed ? this.installedAssets.get(asset.id)?.version : undefined,
      installedAt: installed ? this.installedAssets.get(asset.id)?.installedAt : undefined,
      isFavorite: this.favoriteAssets.has(asset.id),
    };
  }

  private loadInstalledAssets(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tapdev-installed-assets');
        if (saved) {
          const data = JSON.parse(saved);
          Object.entries(data).forEach(([id, install]) => {
            this.installedAssets.set(id, install as AssetInstallation);
          });
        }
      }
    } catch {}
  }

  private saveInstalledAssets(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = Object.fromEntries(this.installedAssets.entries());
        localStorage.setItem('tapdev-installed-assets', JSON.stringify(data));
      }
    } catch {}
  }

  private loadFavoriteAssets(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tapdev-favorite-assets');
        if (saved) {
          const data: string[] = JSON.parse(saved);
          data.forEach((id) => this.favoriteAssets.add(id));
        }
      }
    } catch {}
  }

  private saveFavoriteAssets(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = [...this.favoriteAssets];
        localStorage.setItem('tapdev-favorite-assets', JSON.stringify(data));
      }
    } catch {}
  }

  private loadCategories(): void {
    const categoryMap = new Map<AssetCategory, number>();
    this.assets.forEach((a) => {
      categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
    });

    const categoryMeta: Record<AssetCategory, { name: string; icon: string; description: string }> =
      {
        'game-component': { name: '游戏组件', icon: 'puzzle', description: '可复用的游戏功能组件' },
        'ui-template': { name: 'UI模板', icon: 'layout', description: '精美游戏界面模板' },
        audio: { name: '音效素材', icon: 'music', description: '游戏音效和背景音乐' },
        art: { name: '美术资源', icon: 'image', description: '2D/3D 美术素材资源' },
        particle: { name: '粒子特效', icon: 'sparkles', description: '炫酷粒子特效系统' },
        'scene-template': { name: '场景模板', icon: 'map', description: '完整游戏场景模板' },
        'full-project': {
          name: '完整项目',
          icon: 'package',
          description: '可直接运行的完整游戏项目',
        },
      };

    this.categories = Array.from(categoryMap.entries()).map(([id, count]) => ({
      id,
      name: categoryMeta[id]?.name || id,
      icon: categoryMeta[id]?.icon || 'box',
      description: categoryMeta[id]?.description || '',
      assetCount: count,
    }));
  }

  private loadMockAssets(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.assets = [
      {
        id: 'asset-001',
        name: '通用UI框架',
        description: '一套完整的游戏UI框架，包含按钮、弹窗、列表、进度条等常用组件',
        longDescription:
          '通用UI框架提供了游戏开发中最常用的UI组件，采用模块化设计，易于扩展和定制。支持多种分辨率自适应，内置主题系统，可以快速切换不同的视觉风格。',
        author: 'TapDev Studio',
        authorId: 'author-001',
        authorAvatar: 'avatar-1.png',
        version: '2.1.0',
        category: 'ui-template',
        tags: ['ui', 'framework', 'gui', 'hud', 'responsive'],
        priceType: 'free',
        price: 0,
        rating: 4.8,
        ratingCount: 256,
        downloads: 15680,
        favorites: 1250,
        previewImages: ['ui-1.png', 'ui-2.png', 'ui-3.png'],
        icon: 'layout',
        files: [
          { name: 'UIManager.ts', path: 'src/ui/UIManager.ts', size: 15360, type: 'typescript' },
          {
            name: 'UIButton.ts',
            path: 'src/ui/components/UIButton.ts',
            size: 8192,
            type: 'typescript',
          },
          {
            name: 'UIDialog.ts',
            path: 'src/ui/components/UIDialog.ts',
            size: 12288,
            type: 'typescript',
          },
          {
            name: 'UIList.ts',
            path: 'src/ui/components/UIList.ts',
            size: 10240,
            type: 'typescript',
          },
          {
            name: 'UIProgressBar.ts',
            path: 'src/ui/components/UIProgressBar.ts',
            size: 6144,
            type: 'typescript',
          },
        ],
        totalSize: 524288,
        dependencies: [],
        changelog: [
          { version: '2.1.0', releaseDate: now - 3 * day, notes: '新增虚拟列表组件，优化性能' },
          {
            version: '2.0.0',
            releaseDate: now - 30 * day,
            notes: '重构架构，支持主题系统',
            breakingChanges: true,
          },
          { version: '1.0.0', releaseDate: now - 90 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 90 * day,
        updatedAt: now - 3 * day,
        license: 'MIT',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-002',
        name: '三消游戏核心',
        description: '完整的三消游戏核心玩法系统，支持多种消除规则和道具效果',
        longDescription:
          '三消游戏核心提供了完整的三消游戏逻辑，包括棋盘系统、匹配检测、消除动画、关卡生成等功能。支持多种特殊方块和道具效果，可以快速构建各种三消类游戏。',
        author: 'GameCraft',
        authorId: 'author-002',
        authorAvatar: 'avatar-2.png',
        version: '1.5.0',
        category: 'game-component',
        tags: ['match-3', 'puzzle', 'gameplay', 'casual', 'levels'],
        priceType: 'paid',
        price: 99,
        originalPrice: 149,
        discount: 33,
        rating: 4.9,
        ratingCount: 189,
        downloads: 8560,
        favorites: 980,
        previewImages: ['match3-1.png', 'match3-2.png', 'match3-3.png'],
        previewVideo: 'match3-demo.mp4',
        icon: 'grid',
        files: [
          {
            name: 'Match3Board.ts',
            path: 'src/match3/Match3Board.ts',
            size: 20480,
            type: 'typescript',
          },
          {
            name: 'Match3Logic.ts',
            path: 'src/match3/Match3Logic.ts',
            size: 25600,
            type: 'typescript',
          },
          {
            name: 'LevelGenerator.ts',
            path: 'src/match3/LevelGenerator.ts',
            size: 15360,
            type: 'typescript',
          },
          {
            name: 'PowerUpSystem.ts',
            path: 'src/match3/PowerUpSystem.ts',
            size: 12288,
            type: 'typescript',
          },
        ],
        totalSize: 1048576,
        dependencies: [{ name: '通用UI框架', version: '2.0.0', optional: true }],
        changelog: [
          { version: '1.5.0', releaseDate: now - 5 * day, notes: '新增5种特殊方块效果' },
          { version: '1.4.0', releaseDate: now - 20 * day, notes: '优化关卡生成算法' },
          { version: '1.0.0', releaseDate: now - 60 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 60 * day,
        updatedAt: now - 5 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-003',
        name: '角色控制器',
        description: '2D平台游戏角色控制器，支持跳跃、移动、攻击等多种动作',
        longDescription:
          '角色控制器提供了完善的2D平台游戏角色控制功能，包括流畅的移动、精确的跳跃判定、墙壁滑行、二段跳等特性。内置状态机系统，方便扩展新的动作状态。',
        author: 'PixelForge',
        authorId: 'author-003',
        authorAvatar: 'avatar-3.png',
        version: '2.0.1',
        category: 'game-component',
        tags: ['platformer', 'character', 'controller', '2d', 'physics'],
        priceType: 'paid',
        price: 59,
        rating: 4.7,
        ratingCount: 145,
        downloads: 6780,
        favorites: 720,
        previewImages: ['character-1.png', 'character-2.png'],
        icon: 'user',
        files: [
          {
            name: 'CharacterController2D.ts',
            path: 'src/character/CharacterController2D.ts',
            size: 18432,
            type: 'typescript',
          },
          {
            name: 'CharacterStateMachine.ts',
            path: 'src/character/CharacterStateMachine.ts',
            size: 10240,
            type: 'typescript',
          },
          {
            name: 'PlayerInput.ts',
            path: 'src/character/PlayerInput.ts',
            size: 7168,
            type: 'typescript',
          },
        ],
        totalSize: 524288,
        dependencies: [],
        changelog: [
          { version: '2.0.1', releaseDate: now - 2 * day, notes: '修复跳跃判定问题' },
          {
            version: '2.0.0',
            releaseDate: now - 25 * day,
            notes: '重写状态机系统',
            breakingChanges: true,
          },
          { version: '1.2.0', releaseDate: now - 50 * day, notes: '新增墙壁滑行和蹬墙跳' },
          { version: '1.0.0', releaseDate: now - 80 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 80 * day,
        updatedAt: now - 2 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-004',
        name: 'RPG音效包',
        description: '包含100+高品质RPG游戏音效，涵盖战斗、UI、环境等多种场景',
        longDescription:
          'RPG音效包含了丰富的角色扮演游戏音效资源，包括攻击音效、技能音效、UI交互音效、环境音效等。所有音效均为高品质无损格式，可直接用于商业项目。',
        author: 'SoundMasters',
        authorId: 'author-004',
        authorAvatar: 'avatar-4.png',
        version: '1.2.0',
        category: 'audio',
        tags: ['audio', 'sfx', 'rpg', 'sound-effects', 'music'],
        priceType: 'paid',
        price: 79,
        originalPrice: 99,
        discount: 20,
        rating: 4.9,
        ratingCount: 312,
        downloads: 12350,
        favorites: 1560,
        previewImages: ['audio-1.png'],
        icon: 'music',
        files: [
          { name: 'combat_bundle', path: 'audio/combat', size: 10485760, type: 'directory' },
          { name: 'ui_bundle', path: 'audio/ui', size: 5242880, type: 'directory' },
          {
            name: 'environment_bundle',
            path: 'audio/environment',
            size: 15728640,
            type: 'directory',
          },
          { name: 'magic_bundle', path: 'audio/magic', size: 8388608, type: 'directory' },
        ],
        totalSize: 41943040,
        dependencies: [],
        changelog: [
          { version: '1.2.0', releaseDate: now - 10 * day, notes: '新增30个魔法音效' },
          { version: '1.1.0', releaseDate: now - 40 * day, notes: '新增环境音效包' },
          { version: '1.0.0', releaseDate: now - 100 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 100 * day,
        updatedAt: now - 10 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-005',
        name: '像素风格角色包',
        description: '32x32像素风格角色素材包，包含4个主角和20个敌人角色',
        longDescription:
          '像素风格角色包提供了精美的32x32像素艺术风格角色素材。每个角色都有完整的动画序列，包括待机、行走、奔跑、跳跃、攻击、受伤等状态。',
        author: 'PixelArt Studio',
        authorId: 'author-005',
        authorAvatar: 'avatar-5.png',
        version: '1.0.0',
        category: 'art',
        tags: ['pixel-art', '2d', 'sprites', 'characters', 'animation'],
        priceType: 'paid',
        price: 129,
        rating: 4.8,
        ratingCount: 98,
        downloads: 3450,
        favorites: 680,
        previewImages: ['pixel-1.png', 'pixel-2.png', 'pixel-3.png'],
        icon: 'image',
        files: [
          { name: 'heroes', path: 'sprites/heroes', size: 8388608, type: 'directory' },
          { name: 'enemies', path: 'sprites/enemies', size: 10485760, type: 'directory' },
          { name: 'npcs', path: 'sprites/npcs', size: 4194304, type: 'directory' },
        ],
        totalSize: 25165824,
        dependencies: [],
        changelog: [{ version: '1.0.0', releaseDate: now - 15 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 15 * day,
        updatedAt: now - 15 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-006',
        name: '粒子特效系统',
        description: '功能强大的粒子特效系统，支持火焰、爆炸、魔法等多种特效',
        longDescription:
          '粒子特效系统提供了丰富的粒子效果和可视化编辑器。支持多种粒子发射器类型，包括点、线、面、球体等。内置200+预设特效，可直接使用。',
        author: 'FXLab',
        authorId: 'author-006',
        authorAvatar: 'avatar-6.png',
        version: '3.2.0',
        category: 'particle',
        tags: ['particles', 'vfx', 'effects', 'fx', 'visual-effects'],
        priceType: 'paid',
        price: 149,
        originalPrice: 199,
        discount: 25,
        rating: 4.9,
        ratingCount: 267,
        downloads: 9870,
        favorites: 1340,
        previewImages: ['particle-1.png', 'particle-2.png', 'particle-3.png'],
        previewVideo: 'particle-demo.mp4',
        icon: 'sparkles',
        files: [
          {
            name: 'ParticleSystem.ts',
            path: 'src/particles/ParticleSystem.ts',
            size: 25600,
            type: 'typescript',
          },
          {
            name: 'ParticleEmitter.ts',
            path: 'src/particles/ParticleEmitter.ts',
            size: 20480,
            type: 'typescript',
          },
          {
            name: 'ParticlePresets.ts',
            path: 'src/particles/ParticlePresets.ts',
            size: 30720,
            type: 'typescript',
          },
        ],
        totalSize: 2097152,
        dependencies: [],
        changelog: [
          { version: '3.2.0', releaseDate: now - 7 * day, notes: '新增50个魔法特效预设' },
          { version: '3.1.0', releaseDate: now - 35 * day, notes: '性能优化，支持GPU加速' },
          {
            version: '3.0.0',
            releaseDate: now - 70 * day,
            notes: '全新架构设计',
            breakingChanges: true,
          },
        ],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 120 * day,
        updatedAt: now - 7 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-007',
        name: '森林场景包',
        description: '完整的森林场景模板，包含地形、树木、岩石、植被等元素',
        longDescription:
          '森林场景包提供了一整套森林环境的场景资源，包括模块化的地形瓦片、各种树木、岩石、草地、花朵等装饰元素。可以快速搭建出精美的2D森林场景。',
        author: 'Environment Art',
        authorId: 'author-007',
        authorAvatar: 'avatar-7.png',
        version: '1.1.0',
        category: 'scene-template',
        tags: ['forest', 'scene', 'environment', 'nature', 'tileset'],
        priceType: 'paid',
        price: 89,
        rating: 4.6,
        ratingCount: 76,
        downloads: 2340,
        favorites: 450,
        previewImages: ['forest-1.png', 'forest-2.png', 'forest-3.png'],
        icon: 'tree-pine',
        files: [
          { name: 'tileset.png', path: 'assets/tileset.png', size: 2097152, type: 'image' },
          { name: 'trees', path: 'assets/trees', size: 4194304, type: 'directory' },
          { name: 'decorations', path: 'assets/decorations', size: 3145728, type: 'directory' },
          { name: 'scene.prefab', path: 'scenes/forest.prefab', size: 51200, type: 'prefab' },
        ],
        totalSize: 10485760,
        dependencies: [],
        changelog: [
          { version: '1.1.0', releaseDate: now - 8 * day, notes: '新增季节变体' },
          { version: '1.0.0', releaseDate: now - 45 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 45 * day,
        updatedAt: now - 8 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-008',
        name: '塔防游戏模板',
        description: '完整的塔防游戏项目模板，包含多种防御塔和敌人类型',
        longDescription:
          '塔防游戏模板是一个完整可运行的塔防游戏项目，包含完整的游戏逻辑、关卡系统、升级系统、多种防御塔和敌人类型。代码结构清晰，易于学习和扩展。',
        author: 'TapDev Studio',
        authorId: 'author-001',
        authorAvatar: 'avatar-1.png',
        version: '1.0.0',
        category: 'full-project',
        tags: ['tower-defense', 'full-game', 'strategy', 'template', 'demo'],
        priceType: 'paid',
        price: 199,
        originalPrice: 299,
        discount: 33,
        rating: 4.9,
        ratingCount: 156,
        downloads: 5670,
        favorites: 890,
        previewImages: ['towerdefense-1.png', 'towerdefense-2.png', 'towerdefense-3.png'],
        previewVideo: 'towerdefense-demo.mp4',
        icon: 'shield',
        files: [{ name: 'project', path: '/', size: 52428800, type: 'directory' }],
        totalSize: 52428800,
        dependencies: [
          { name: '通用UI框架', version: '2.0.0', optional: false },
          { name: '粒子特效系统', version: '3.0.0', optional: true },
        ],
        changelog: [{ version: '1.0.0', releaseDate: now - 20 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 20 * day,
        updatedAt: now - 20 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-009',
        name: 'Roguelike地牢生成器',
        description: '程序化地牢生成系统，支持多种房间类型和走廊生成算法',
        longDescription:
          'Roguelike地牢生成器提供了强大的程序化地牢生成功能。支持房间放置、走廊连接、门和钥匙系统、宝箱放置等功能，可以生成无限变化的地牢布局。',
        author: 'Procedural Labs',
        authorId: 'author-008',
        authorAvatar: 'avatar-8.png',
        version: '1.3.0',
        category: 'game-component',
        tags: ['roguelike', 'dungeon', 'procedural', 'generation', 'map'],
        priceType: 'paid',
        price: 79,
        rating: 4.7,
        ratingCount: 134,
        downloads: 4560,
        favorites: 620,
        previewImages: ['dungeon-1.png', 'dungeon-2.png'],
        icon: 'map',
        files: [
          {
            name: 'DungeonGenerator.ts',
            path: 'src/dungeon/DungeonGenerator.ts',
            size: 22528,
            type: 'typescript',
          },
          {
            name: 'RoomGenerator.ts',
            path: 'src/dungeon/RoomGenerator.ts',
            size: 15360,
            type: 'typescript',
          },
          {
            name: 'CorridorGenerator.ts',
            path: 'src/dungeon/CorridorGenerator.ts',
            size: 10240,
            type: 'typescript',
          },
        ],
        totalSize: 786432,
        dependencies: [],
        changelog: [
          { version: '1.3.0', releaseDate: now - 12 * day, notes: '新增BSP生成算法' },
          { version: '1.2.0', releaseDate: now - 40 * day, notes: '新增房间装饰系统' },
          { version: '1.0.0', releaseDate: now - 75 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 75 * day,
        updatedAt: now - 12 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-010',
        name: '卡牌战斗系统',
        description: '完整的卡牌战斗系统，支持卡组构建、战斗结算、特效展示',
        longDescription:
          '卡牌战斗系统提供了完整的TCG卡牌游戏核心功能，包括卡牌数据管理、卡组构建、战斗系统、AI对手、特效展示等。支持多种卡牌类型和技能效果。',
        author: 'CardGame Pro',
        authorId: 'author-009',
        authorAvatar: 'avatar-9.png',
        version: '2.0.0',
        category: 'game-component',
        tags: ['card-game', 'tcg', 'battle', 'deck-builder', 'strategy'],
        priceType: 'paid',
        price: 129,
        rating: 4.8,
        ratingCount: 178,
        downloads: 6230,
        favorites: 850,
        previewImages: ['card-1.png', 'card-2.png', 'card-3.png'],
        previewVideo: 'card-demo.mp4',
        icon: 'layers',
        files: [
          {
            name: 'CardSystem.ts',
            path: 'src/cards/CardSystem.ts',
            size: 25600,
            type: 'typescript',
          },
          {
            name: 'BattleManager.ts',
            path: 'src/cards/BattleManager.ts',
            size: 20480,
            type: 'typescript',
          },
          {
            name: 'DeckBuilder.ts',
            path: 'src/cards/DeckBuilder.ts',
            size: 15360,
            type: 'typescript',
          },
          {
            name: 'CardEffects.ts',
            path: 'src/cards/CardEffects.ts',
            size: 18432,
            type: 'typescript',
          },
        ],
        totalSize: 1572864,
        dependencies: [{ name: '通用UI框架', version: '2.0.0', optional: false }],
        changelog: [
          {
            version: '2.0.0',
            releaseDate: now - 15 * day,
            notes: '全新战斗系统',
            breakingChanges: true,
          },
          { version: '1.2.0', releaseDate: now - 55 * day, notes: '新增AI对手' },
          { version: '1.0.0', releaseDate: now - 100 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 100 * day,
        updatedAt: now - 15 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-011',
        name: '对话系统',
        description: '分支对话系统，支持条件判断、变量、表情和打字机效果',
        longDescription:
          '对话系统提供了功能丰富的NPC对话功能，支持分支对话、条件分支、变量存储、角色表情、打字机效果、语音播放等特性。可视化编辑器让对话设计变得简单。',
        author: 'StoryTools',
        authorId: 'author-010',
        authorAvatar: 'avatar-10.png',
        version: '1.4.0',
        category: 'game-component',
        tags: ['dialogue', 'story', 'npc', 'conversation', 'visual-novel'],
        priceType: 'paid',
        price: 69,
        rating: 4.6,
        ratingCount: 89,
        downloads: 3120,
        favorites: 420,
        previewImages: ['dialogue-1.png', 'dialogue-2.png'],
        icon: 'message-circle',
        files: [
          {
            name: 'DialogueSystem.ts',
            path: 'src/dialogue/DialogueSystem.ts',
            size: 18432,
            type: 'typescript',
          },
          {
            name: 'DialogueParser.ts',
            path: 'src/dialogue/DialogueParser.ts',
            size: 12288,
            type: 'typescript',
          },
        ],
        totalSize: 524288,
        dependencies: [],
        changelog: [
          { version: '1.4.0', releaseDate: now - 5 * day, notes: '新增对话编辑器' },
          { version: '1.3.0', releaseDate: now - 30 * day, notes: '支持语音播放' },
          { version: '1.0.0', releaseDate: now - 65 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 65 * day,
        updatedAt: now - 5 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-012',
        name: '库存背包系统',
        description: '游戏背包和物品管理系统，支持物品堆叠、分类、拖拽排序',
        longDescription:
          '库存背包系统提供了完整的游戏背包管理功能，支持多种物品类型、物品堆叠、物品分类、拖拽排序、物品使用、装备系统等功能。界面精美，交互流畅。',
        author: 'GameCraft',
        authorId: 'author-002',
        authorAvatar: 'avatar-2.png',
        version: '1.2.0',
        category: 'ui-template',
        tags: ['inventory', 'backpack', 'items', 'equipment', 'ui'],
        priceType: 'paid',
        price: 49,
        rating: 4.5,
        ratingCount: 67,
        downloads: 2890,
        favorites: 380,
        previewImages: ['inventory-1.png', 'inventory-2.png'],
        icon: 'package',
        files: [
          {
            name: 'InventoryManager.ts',
            path: 'src/inventory/InventoryManager.ts',
            size: 15360,
            type: 'typescript',
          },
          {
            name: 'InventoryUI.ts',
            path: 'src/inventory/InventoryUI.ts',
            size: 18432,
            type: 'typescript',
          },
          {
            name: 'ItemDatabase.ts',
            path: 'src/inventory/ItemDatabase.ts',
            size: 10240,
            type: 'typescript',
          },
        ],
        totalSize: 786432,
        dependencies: [{ name: '通用UI框架', version: '2.0.0', optional: false }],
        changelog: [
          { version: '1.2.0', releaseDate: now - 18 * day, notes: '新增装备系统' },
          { version: '1.1.0', releaseDate: now - 45 * day, notes: '优化拖拽体验' },
          { version: '1.0.0', releaseDate: now - 70 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 70 * day,
        updatedAt: now - 18 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-013',
        name: '背景音乐包',
        description: '10首高品质游戏背景音乐，涵盖多种风格和氛围',
        longDescription:
          '背景音乐包含10首精心制作的游戏背景音乐，风格涵盖史诗、冒险、轻松、神秘、战斗等多种氛围。所有音乐均为循环优化，可无缝循环播放。',
        author: 'SoundMasters',
        authorId: 'author-004',
        authorAvatar: 'avatar-4.png',
        version: '1.1.0',
        category: 'audio',
        tags: ['music', 'bgm', 'soundtrack', 'background', 'orchestral'],
        priceType: 'paid',
        price: 99,
        rating: 4.8,
        ratingCount: 145,
        downloads: 5670,
        favorites: 720,
        previewImages: ['bgm-1.png'],
        icon: 'headphones',
        files: [
          {
            name: 'epic_theme.ogg',
            path: 'audio/bgm/epic_theme.ogg',
            size: 8388608,
            type: 'audio',
          },
          { name: 'adventure.ogg', path: 'audio/bgm/adventure.ogg', size: 7340032, type: 'audio' },
          {
            name: 'mysterious.ogg',
            path: 'audio/bgm/mysterious.ogg',
            size: 6291456,
            type: 'audio',
          },
          { name: 'battle.ogg', path: 'audio/bgm/battle.ogg', size: 5242880, type: 'audio' },
          { name: 'peaceful.ogg', path: 'audio/bgm/peaceful.ogg', size: 4194304, type: 'audio' },
        ],
        totalSize: 52428800,
        dependencies: [],
        changelog: [
          { version: '1.1.0', releaseDate: now - 25 * day, notes: '新增3首战斗音乐' },
          { version: '1.0.0', releaseDate: now - 80 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 80 * day,
        updatedAt: now - 25 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-014',
        name: '科幻UI套件',
        description: '赛博朋克风格的科幻UI界面套件，包含HUD、菜单、数据面板',
        longDescription:
          '科幻UI套件提供了精美的赛博朋克风格UI组件，包括全息效果、扫描线、发光边框等特效。适合科幻、赛博朋克、未来题材的游戏项目。',
        author: 'UI Masters',
        authorId: 'author-011',
        authorAvatar: 'avatar-11.png',
        version: '1.0.0',
        category: 'ui-template',
        tags: ['sci-fi', 'cyberpunk', 'hud', 'futuristic', 'ui-kit'],
        priceType: 'paid',
        price: 79,
        rating: 4.7,
        ratingCount: 92,
        downloads: 3450,
        favorites: 560,
        previewImages: ['scifi-1.png', 'scifi-2.png', 'scifi-3.png'],
        icon: 'monitor',
        files: [
          { name: 'SciFiHUD.ts', path: 'src/scifi/SciFiHUD.ts', size: 20480, type: 'typescript' },
          { name: 'SciFiMenu.ts', path: 'src/scifi/SciFiMenu.ts', size: 15360, type: 'typescript' },
          {
            name: 'GlowEffects.ts',
            path: 'src/scifi/GlowEffects.ts',
            size: 10240,
            type: 'typescript',
          },
        ],
        totalSize: 1048576,
        dependencies: [{ name: '通用UI框架', version: '2.0.0', optional: false }],
        changelog: [{ version: '1.0.0', releaseDate: now - 10 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 10 * day,
        updatedAt: now - 10 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-015',
        name: '平台跳跃游戏模板',
        description: '完整的2D平台跳跃游戏项目，包含关卡编辑器和多种机关',
        longDescription:
          '平台跳跃游戏模板是一个完整可运行的2D平台游戏项目，包含角色控制、关卡系统、金币收集、敌人、机关等完整游戏要素。附带关卡编辑器，方便创建更多关卡。',
        author: 'TapDev Studio',
        authorId: 'author-001',
        authorAvatar: 'avatar-1.png',
        version: '1.1.0',
        category: 'full-project',
        tags: ['platformer', 'full-game', '2d', 'jump', 'adventure'],
        priceType: 'paid',
        price: 179,
        originalPrice: 249,
        discount: 28,
        rating: 4.8,
        ratingCount: 201,
        downloads: 7890,
        favorites: 1120,
        previewImages: ['platformer-1.png', 'platformer-2.png', 'platformer-3.png'],
        previewVideo: 'platformer-demo.mp4',
        icon: 'play',
        files: [{ name: 'project', path: '/', size: 41943040, type: 'directory' }],
        totalSize: 41943040,
        dependencies: [
          { name: '通用UI框架', version: '2.0.0', optional: false },
          { name: '角色控制器', version: '2.0.0', optional: false },
        ],
        changelog: [
          { version: '1.1.0', releaseDate: now - 8 * day, notes: '新增关卡编辑器' },
          { version: '1.0.0', releaseDate: now - 30 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 30 * day,
        updatedAt: now - 8 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-016',
        name: '3D低多边形角色包',
        description: '低多边形风格3D角色模型包，包含10个角色和动画',
        longDescription:
          '3D低多边形角色包提供了风格统一的低多边形3D角色模型，每个角色都有完整的动画绑定和常用动画剪辑。适合卡通风格的3D游戏项目。',
        author: '3D Model Studio',
        authorId: 'author-012',
        authorAvatar: 'avatar-12.png',
        version: '1.0.0',
        category: 'art',
        tags: ['3d', 'low-poly', 'models', 'characters', 'animation'],
        priceType: 'paid',
        price: 199,
        rating: 4.7,
        ratingCount: 56,
        downloads: 1890,
        favorites: 340,
        previewImages: ['lowpoly-1.png', 'lowpoly-2.png'],
        icon: 'box',
        files: [
          { name: 'characters', path: 'models/characters', size: 31457280, type: 'directory' },
          { name: 'animations', path: 'models/animations', size: 20971520, type: 'directory' },
        ],
        totalSize: 52428800,
        dependencies: [],
        changelog: [{ version: '1.0.0', releaseDate: now - 18 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 18 * day,
        updatedAt: now - 18 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-017',
        name: '成就系统',
        description: '游戏成就和统计系统，支持Steam/ TapTap等平台集成',
        longDescription:
          '成就系统提供了完整的游戏成就管理功能，包括成就定义、进度追踪、成就解锁、统计数据等。支持多平台成就系统集成。',
        author: 'GameCraft',
        authorId: 'author-002',
        authorAvatar: 'avatar-2.png',
        version: '1.1.0',
        category: 'game-component',
        tags: ['achievements', 'stats', 'steam', 'trophies', 'progression'],
        priceType: 'free',
        price: 0,
        rating: 4.4,
        ratingCount: 78,
        downloads: 4560,
        favorites: 310,
        previewImages: ['achievement-1.png'],
        icon: 'award',
        files: [
          {
            name: 'AchievementManager.ts',
            path: 'src/achievements/AchievementManager.ts',
            size: 12288,
            type: 'typescript',
          },
          {
            name: 'StatsTracker.ts',
            path: 'src/achievements/StatsTracker.ts',
            size: 10240,
            type: 'typescript',
          },
        ],
        totalSize: 393216,
        dependencies: [],
        changelog: [
          { version: '1.1.0', releaseDate: now - 22 * day, notes: '新增TapTap成就集成' },
          { version: '1.0.0', releaseDate: now - 55 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 55 * day,
        updatedAt: now - 22 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-018',
        name: '新手引导系统',
        description: '游戏新手引导和教程系统，支持高亮、对话、手势引导',
        longDescription:
          '新手引导系统提供了完整的游戏教程功能，支持高亮指定UI元素、对话引导、手势动画、步骤控制等功能。可以快速创建游戏新手教程。',
        author: 'UX Tools',
        authorId: 'author-013',
        authorAvatar: 'avatar-13.png',
        version: '1.0.0',
        category: 'game-component',
        tags: ['tutorial', 'guide', 'onboarding', 'newbie', 'ux'],
        priceType: 'paid',
        price: 39,
        rating: 4.5,
        ratingCount: 45,
        downloads: 1780,
        favorites: 260,
        previewImages: ['tutorial-1.png', 'tutorial-2.png'],
        icon: 'help-circle',
        files: [
          {
            name: 'TutorialManager.ts',
            path: 'src/tutorial/TutorialManager.ts',
            size: 15360,
            type: 'typescript',
          },
          {
            name: 'TutorialStep.ts',
            path: 'src/tutorial/TutorialStep.ts',
            size: 10240,
            type: 'typescript',
          },
        ],
        totalSize: 393216,
        dependencies: [{ name: '通用UI框架', version: '2.0.0', optional: false }],
        changelog: [{ version: '1.0.0', releaseDate: now - 12 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 12 * day,
        updatedAt: now - 12 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-019',
        name: 'Roguelike完整项目',
        description: '完整的Roguelike动作游戏项目，包含随机地牢和装备系统',
        longDescription:
          'Roguelike完整项目是一个功能完整的Roguelike动作游戏，包含随机地牢生成、角色成长、装备系统、技能树、多种敌人和Boss。代码结构清晰，易于学习和扩展。',
        author: 'TapDev Studio',
        authorId: 'author-001',
        authorAvatar: 'avatar-1.png',
        version: '1.0.0',
        category: 'full-project',
        tags: ['roguelike', 'full-game', 'action', 'dungeon', 'rpg'],
        priceType: 'paid',
        price: 299,
        originalPrice: 399,
        discount: 25,
        rating: 4.9,
        ratingCount: 167,
        downloads: 4560,
        favorites: 980,
        previewImages: ['roguelike-1.png', 'roguelike-2.png', 'roguelike-3.png'],
        previewVideo: 'roguelike-demo.mp4',
        icon: 'sword',
        files: [{ name: 'project', path: '/', size: 73400320, type: 'directory' }],
        totalSize: 73400320,
        dependencies: [
          { name: '通用UI框架', version: '2.0.0', optional: false },
          { name: 'Roguelike地牢生成器', version: '1.3.0', optional: false },
          { name: '粒子特效系统', version: '3.0.0', optional: true },
        ],
        changelog: [{ version: '1.0.0', releaseDate: now - 25 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 25 * day,
        updatedAt: now - 25 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-020',
        name: '技能树系统',
        description: '可定制的技能树系统，支持多种技能节点和解锁条件',
        longDescription:
          '技能树系统提供了灵活的技能树管理功能，支持多种技能节点类型、解锁条件、技能升级、技能效果等。可视化编辑器让技能树设计变得简单直观。',
        author: 'Procedural Labs',
        authorId: 'author-008',
        authorAvatar: 'avatar-8.png',
        version: '1.2.0',
        category: 'game-component',
        tags: ['skill-tree', 'abilities', 'talents', 'progression', 'rpg'],
        priceType: 'paid',
        price: 69,
        rating: 4.6,
        ratingCount: 89,
        downloads: 3240,
        favorites: 450,
        previewImages: ['skilltree-1.png', 'skilltree-2.png'],
        icon: 'git-branch',
        files: [
          {
            name: 'SkillTreeManager.ts',
            path: 'src/skilltree/SkillTreeManager.ts',
            size: 18432,
            type: 'typescript',
          },
          {
            name: 'SkillNode.ts',
            path: 'src/skilltree/SkillNode.ts',
            size: 12288,
            type: 'typescript',
          },
        ],
        totalSize: 524288,
        dependencies: [],
        changelog: [
          { version: '1.2.0', releaseDate: now - 15 * day, notes: '新增技能树编辑器' },
          { version: '1.1.0', releaseDate: now - 40 * day, notes: '支持多种技能类型' },
          { version: '1.0.0', releaseDate: now - 70 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 70 * day,
        updatedAt: now - 15 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-021',
        name: '卡通UI素材包',
        description: '可爱卡通风格UI素材，包含按钮、图标、边框和背景',
        longDescription:
          '卡通UI素材包提供了一套完整的卡通风格UI素材资源，包括各种按钮、图标、边框、面板背景等。矢量格式，可任意缩放不失真。',
        author: 'UI Masters',
        authorId: 'author-011',
        authorAvatar: 'avatar-11.png',
        version: '1.0.0',
        category: 'art',
        tags: ['cartoon', 'ui-assets', 'icons', 'buttons', 'cute'],
        priceType: 'paid',
        price: 59,
        rating: 4.7,
        ratingCount: 67,
        downloads: 2560,
        favorites: 380,
        previewImages: ['cartoon-ui-1.png', 'cartoon-ui-2.png'],
        icon: 'smile',
        files: [
          { name: 'buttons', path: 'assets/ui/buttons', size: 2097152, type: 'directory' },
          { name: 'icons', path: 'assets/ui/icons', size: 3145728, type: 'directory' },
          { name: 'panels', path: 'assets/ui/panels', size: 1572864, type: 'directory' },
        ],
        totalSize: 8388608,
        dependencies: [],
        changelog: [{ version: '1.0.0', releaseDate: now - 5 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 5 * day,
        updatedAt: now - 5 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-022',
        name: '三消游戏完整项目',
        description: '完整的三消游戏项目，包含100个关卡和多种道具',
        longDescription:
          '三消游戏完整项目是一个完整可运行的三消游戏，包含100个精心设计的关卡、多种特殊方块、道具系统、分数系统、排行榜等完整游戏功能。',
        author: 'TapDev Studio',
        authorId: 'author-001',
        authorAvatar: 'avatar-1.png',
        version: '1.0.0',
        category: 'full-project',
        tags: ['match-3', 'full-game', 'puzzle', 'casual', 'levels'],
        priceType: 'paid',
        price: 159,
        originalPrice: 229,
        discount: 31,
        rating: 4.8,
        ratingCount: 234,
        downloads: 8970,
        favorites: 1340,
        previewImages: ['match3-full-1.png', 'match3-full-2.png', 'match3-full-3.png'],
        previewVideo: 'match3-full-demo.mp4',
        icon: 'grid-3x3',
        files: [{ name: 'project', path: '/', size: 31457280, type: 'directory' }],
        totalSize: 31457280,
        dependencies: [
          { name: '通用UI框架', version: '2.0.0', optional: false },
          { name: '三消游戏核心', version: '1.5.0', optional: false },
        ],
        changelog: [{ version: '1.0.0', releaseDate: now - 15 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 15 * day,
        updatedAt: now - 15 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-023',
        name: '城市场景包',
        description: '现代城市场景资源包，包含建筑、街道、车辆和装饰',
        longDescription:
          '城市场景包提供了完整的现代城市场景资源，包括多种建筑、街道、车辆、交通标志、树木等装饰元素。模块化设计，可以自由组合搭建不同的城市场景。',
        author: 'Environment Art',
        authorId: 'author-007',
        authorAvatar: 'avatar-7.png',
        version: '1.0.0',
        category: 'scene-template',
        tags: ['city', 'urban', 'scene', 'buildings', 'modern'],
        priceType: 'paid',
        price: 109,
        rating: 4.5,
        ratingCount: 45,
        downloads: 1670,
        favorites: 290,
        previewImages: ['city-1.png', 'city-2.png'],
        icon: 'building-2',
        files: [
          { name: 'buildings', path: 'assets/city/buildings', size: 8388608, type: 'directory' },
          { name: 'streets', path: 'assets/city/streets', size: 4194304, type: 'directory' },
          { name: 'vehicles', path: 'assets/city/vehicles', size: 3145728, type: 'directory' },
          {
            name: 'decorations',
            path: 'assets/city/decorations',
            size: 2097152,
            type: 'directory',
          },
        ],
        totalSize: 20971520,
        dependencies: [],
        changelog: [{ version: '1.0.0', releaseDate: now - 20 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 20 * day,
        updatedAt: now - 20 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-024',
        name: '环境音效包',
        description: '50+高质量环境音效，包含自然、城市、室内等多种场景',
        longDescription:
          '环境音效包含了丰富的环境音资源，涵盖森林、海洋、雨天、城市、室内等多种场景。所有音效均为高品质录制，可营造沉浸式的游戏氛围。',
        author: 'SoundMasters',
        authorId: 'author-004',
        authorAvatar: 'avatar-4.png',
        version: '1.0.0',
        category: 'audio',
        tags: ['ambient', 'environment', 'nature', 'atmosphere', 'soundscape'],
        priceType: 'paid',
        price: 69,
        rating: 4.8,
        ratingCount: 112,
        downloads: 4560,
        favorites: 580,
        previewImages: ['ambient-1.png'],
        icon: 'wind',
        files: [
          { name: 'nature', path: 'audio/ambient/nature', size: 15728640, type: 'directory' },
          { name: 'urban', path: 'audio/ambient/urban', size: 10485760, type: 'directory' },
          { name: 'indoor', path: 'audio/ambient/indoor', size: 8388608, type: 'directory' },
          { name: 'weather', path: 'audio/ambient/weather', size: 12582912, type: 'directory' },
        ],
        totalSize: 52428800,
        dependencies: [],
        changelog: [{ version: '1.0.0', releaseDate: now - 30 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 30 * day,
        updatedAt: now - 30 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-025',
        name: '卡牌游戏完整项目',
        description: '完整的卡牌对战游戏项目，包含卡组构建和单人战役',
        longDescription:
          '卡牌游戏完整项目是一个完整可运行的TCG卡牌对战游戏，包含卡组构建、战斗系统、单人战役、卡牌收集、商店系统等完整功能。',
        author: 'CardGame Pro',
        authorId: 'author-009',
        authorAvatar: 'avatar-9.png',
        version: '1.0.0',
        category: 'full-project',
        tags: ['card-game', 'full-game', 'tcg', 'strategy', 'battle'],
        priceType: 'paid',
        price: 249,
        originalPrice: 329,
        discount: 24,
        rating: 4.9,
        ratingCount: 145,
        downloads: 5230,
        favorites: 870,
        previewImages: ['card-full-1.png', 'card-full-2.png', 'card-full-3.png'],
        previewVideo: 'card-full-demo.mp4',
        icon: 'layers',
        files: [{ name: 'project', path: '/', size: 62914560, type: 'directory' }],
        totalSize: 62914560,
        dependencies: [
          { name: '通用UI框架', version: '2.0.0', optional: false },
          { name: '卡牌战斗系统', version: '2.0.0', optional: false },
          { name: '粒子特效系统', version: '3.0.0', optional: true },
        ],
        changelog: [{ version: '1.0.0', releaseDate: now - 10 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 10 * day,
        updatedAt: now - 10 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-026',
        name: '排行榜系统',
        description: '游戏排行榜系统，支持本地和在线排行榜',
        longDescription:
          '排行榜系统提供了完整的游戏排行榜功能，支持多种排行类型、分数提交、排名查询、本地排行榜等功能。可扩展支持在线排行榜服务。',
        author: 'GameCraft',
        authorId: 'author-002',
        authorAvatar: 'avatar-2.png',
        version: '1.0.0',
        category: 'game-component',
        tags: ['leaderboard', 'ranking', 'scores', 'high-scores', 'online'],
        priceType: 'free',
        price: 0,
        rating: 4.3,
        ratingCount: 56,
        downloads: 3450,
        favorites: 210,
        previewImages: ['leaderboard-1.png'],
        icon: 'trophy',
        files: [
          {
            name: 'LeaderboardManager.ts',
            path: 'src/leaderboard/LeaderboardManager.ts',
            size: 12288,
            type: 'typescript',
          },
        ],
        totalSize: 262144,
        dependencies: [],
        changelog: [{ version: '1.0.0', releaseDate: now - 35 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 35 * day,
        updatedAt: now - 35 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-027',
        name: '像素风格瓦片包',
        description: '像素风格游戏瓦片地图资源，包含多种主题的瓦片集',
        longDescription:
          '像素风格瓦片包提供了多种主题的像素风格瓦片地图资源，包括地牢、森林、沙漠、雪地等主题。每个主题都有完整的瓦片集和装饰元素。',
        author: 'PixelArt Studio',
        authorId: 'author-005',
        authorAvatar: 'avatar-5.png',
        version: '1.0.0',
        category: 'art',
        tags: ['pixel-art', 'tileset', 'map', '2d', 'platformer'],
        priceType: 'paid',
        price: 89,
        rating: 4.7,
        ratingCount: 78,
        downloads: 2890,
        favorites: 450,
        previewImages: ['tileset-1.png', 'tileset-2.png'],
        icon: 'grid-3x3',
        files: [
          {
            name: 'dungeon_tileset.png',
            path: 'assets/tilesets/dungeon_tileset.png',
            size: 2097152,
            type: 'image',
          },
          {
            name: 'forest_tileset.png',
            path: 'assets/tilesets/forest_tileset.png',
            size: 2097152,
            type: 'image',
          },
          {
            name: 'desert_tileset.png',
            path: 'assets/tilesets/desert_tileset.png',
            size: 1572864,
            type: 'image',
          },
          {
            name: 'snow_tileset.png',
            path: 'assets/tilesets/snow_tileset.png',
            size: 1572864,
            type: 'image',
          },
        ],
        totalSize: 10485760,
        dependencies: [],
        changelog: [{ version: '1.0.0', releaseDate: now - 22 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 22 * day,
        updatedAt: now - 22 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-028',
        name: '战斗伤害数字',
        description: '漂浮伤害数字特效，支持多种样式和动画效果',
        longDescription:
          '战斗伤害数字特效提供了漂亮的伤害数字显示效果，支持普通伤害、暴击、治疗、miss等多种类型，内置多种动画效果和样式配置。',
        author: 'FXLab',
        authorId: 'author-006',
        authorAvatar: 'avatar-6.png',
        version: '1.1.0',
        category: 'particle',
        tags: ['damage', 'numbers', 'combat', 'floating-text', 'vfx'],
        priceType: 'free',
        price: 0,
        rating: 4.6,
        ratingCount: 123,
        downloads: 6780,
        favorites: 540,
        previewImages: ['damage-1.png', 'damage-2.png'],
        icon: 'zap',
        files: [
          {
            name: 'DamageNumber.ts',
            path: 'src/damage/DamageNumber.ts',
            size: 8192,
            type: 'typescript',
          },
          {
            name: 'DamageTextManager.ts',
            path: 'src/damage/DamageTextManager.ts',
            size: 10240,
            type: 'typescript',
          },
        ],
        totalSize: 262144,
        dependencies: [],
        changelog: [
          { version: '1.1.0', releaseDate: now - 12 * day, notes: '新增多种动画样式' },
          { version: '1.0.0', releaseDate: now - 50 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 50 * day,
        updatedAt: now - 12 * day,
        license: 'MIT',
        verified: true,
      },
      {
        id: 'asset-029',
        name: '解谜游戏模板',
        description: '第一人称解谜游戏模板，包含交互系统和谜题框架',
        longDescription:
          '解谜游戏模板提供了第一人称解谜游戏的基础框架，包括角色控制、物品交互、谜题系统、库存管理等功能。可以快速构建各种解谜游戏。',
        author: 'PuzzleWorks',
        authorId: 'author-014',
        authorAvatar: 'avatar-14.png',
        version: '1.0.0',
        category: 'full-project',
        tags: ['puzzle', 'full-game', 'first-person', 'adventure', 'mystery'],
        priceType: 'paid',
        price: 189,
        rating: 4.7,
        ratingCount: 89,
        downloads: 2340,
        favorites: 420,
        previewImages: ['puzzle-1.png', 'puzzle-2.png'],
        icon: 'puzzle',
        files: [{ name: 'project', path: '/', size: 41943040, type: 'directory' }],
        totalSize: 41943040,
        dependencies: [
          { name: '库存背包系统', version: '1.2.0', optional: false },
          { name: '对话系统', version: '1.4.0', optional: true },
        ],
        changelog: [{ version: '1.0.0', releaseDate: now - 28 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 28 * day,
        updatedAt: now - 28 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-030',
        name: '太空场景包',
        description: '太空科幻场景资源，包含星球、星云、飞船和特效',
        longDescription:
          '太空场景包提供了完整的太空科幻场景资源，包括各种行星、星云背景、飞船模型、陨石、太空站等元素。适合太空题材的游戏项目。',
        author: 'Environment Art',
        authorId: 'author-007',
        authorAvatar: 'avatar-7.png',
        version: '1.0.0',
        category: 'scene-template',
        tags: ['space', 'sci-fi', 'planets', 'stars', 'spaceships'],
        priceType: 'paid',
        price: 119,
        rating: 4.6,
        ratingCount: 56,
        downloads: 1890,
        favorites: 350,
        previewImages: ['space-1.png', 'space-2.png', 'space-3.png'],
        icon: 'star',
        files: [
          { name: 'planets', path: 'assets/space/planets', size: 10485760, type: 'directory' },
          {
            name: 'backgrounds',
            path: 'assets/space/backgrounds',
            size: 8388608,
            type: 'directory',
          },
          { name: 'ships', path: 'assets/space/ships', size: 12582912, type: 'directory' },
          { name: 'effects', path: 'assets/space/effects', size: 6291456, type: 'directory' },
        ],
        totalSize: 41943040,
        dependencies: [],
        changelog: [{ version: '1.0.0', releaseDate: now - 15 * day, notes: '初始版本发布' }],
        compatibleVersions: ['0.4.0'],
        createdAt: now - 15 * day,
        updatedAt: now - 15 * day,
        license: 'Commercial',
        verified: true,
      },
      {
        id: 'asset-031',
        name: 'UI图标包',
        description: '500+精美游戏UI图标，涵盖物品、技能、装备等类型',
        longDescription:
          'UI图标包含了游戏开发中常用的各类图标资源，包括物品图标、技能图标、装备图标、UI功能图标等。统一的美术风格，多种尺寸规格。',
        author: 'UI Masters',
        authorId: 'author-011',
        authorAvatar: 'avatar-11.png',
        version: '1.2.0',
        category: 'art',
        tags: ['icons', 'ui', 'game-icons', 'assets', 'items'],
        priceType: 'paid',
        price: 49,
        rating: 4.8,
        ratingCount: 201,
        downloads: 8970,
        favorites: 1120,
        previewImages: ['icons-1.png', 'icons-2.png'],
        icon: 'icons',
        files: [
          { name: 'items', path: 'assets/icons/items', size: 4194304, type: 'directory' },
          { name: 'skills', path: 'assets/icons/skills', size: 3145728, type: 'directory' },
          { name: 'equipment', path: 'assets/icons/equipment', size: 3145728, type: 'directory' },
          { name: 'ui', path: 'assets/icons/ui', size: 2097152, type: 'directory' },
        ],
        totalSize: 15728640,
        dependencies: [],
        changelog: [
          { version: '1.2.0', releaseDate: now - 8 * day, notes: '新增100个技能图标' },
          { version: '1.1.0', releaseDate: now - 35 * day, notes: '新增装备图标分类' },
          { version: '1.0.0', releaseDate: now - 70 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 70 * day,
        updatedAt: now - 8 * day,
        license: 'Commercial',
        featured: true,
        verified: true,
      },
      {
        id: 'asset-032',
        name: '存档系统',
        description: '游戏存档和数据持久化系统，支持多存档位和云存档',
        longDescription:
          '存档系统提供了完整的游戏存档管理功能，支持多存档位、自动存档、快速存档、存档加密、云存档同步等功能。',
        author: 'GameCraft',
        authorId: 'author-002',
        authorAvatar: 'avatar-2.png',
        version: '1.1.0',
        category: 'game-component',
        tags: ['save', 'save-game', 'persistence', 'storage', 'cloud'],
        priceType: 'free',
        price: 0,
        rating: 4.5,
        ratingCount: 89,
        downloads: 5670,
        favorites: 420,
        previewImages: ['save-1.png'],
        icon: 'save',
        files: [
          {
            name: 'SaveManager.ts',
            path: 'src/save/SaveManager.ts',
            size: 15360,
            type: 'typescript',
          },
          { name: 'SaveSlot.ts', path: 'src/save/SaveSlot.ts', size: 10240, type: 'typescript' },
        ],
        totalSize: 393216,
        dependencies: [],
        changelog: [
          { version: '1.1.0', releaseDate: now - 18 * day, notes: '新增云存档支持' },
          { version: '1.0.0', releaseDate: now - 60 * day, notes: '初始版本发布' },
        ],
        compatibleVersions: ['0.3.0', '0.4.0'],
        createdAt: now - 60 * day,
        updatedAt: now - 18 * day,
        license: 'MIT',
        verified: true,
      },
    ];
  }

  private loadMockAuthors(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.authors = [
      {
        id: 'author-001',
        name: 'TapDev Studio',
        avatar: 'avatar-1.png',
        bio: 'TapDev官方开发团队，致力于提供高质量的游戏开发资源和工具。',
        assetCount: 5,
        totalDownloads: 42350,
        averageRating: 4.9,
        verified: true,
        createdAt: now - 365 * day,
      },
      {
        id: 'author-002',
        name: 'GameCraft',
        avatar: 'avatar-2.png',
        bio: '专注于游戏核心玩法组件开发，让游戏开发更简单。',
        assetCount: 4,
        totalDownloads: 19300,
        averageRating: 4.7,
        verified: true,
        createdAt: now - 200 * day,
      },
      {
        id: 'author-003',
        name: 'PixelForge',
        avatar: 'avatar-3.png',
        bio: '2D游戏开发专家，像素艺术爱好者。',
        assetCount: 1,
        totalDownloads: 6780,
        averageRating: 4.7,
        verified: true,
        createdAt: now - 180 * day,
      },
      {
        id: 'author-004',
        name: 'SoundMasters',
        avatar: 'avatar-4.png',
        bio: '专业游戏音效制作团队，提供高品质音频资源。',
        assetCount: 3,
        totalDownloads: 22580,
        averageRating: 4.8,
        verified: true,
        createdAt: now - 250 * day,
      },
      {
        id: 'author-005',
        name: 'PixelArt Studio',
        avatar: 'avatar-5.png',
        bio: '专业像素艺术工作室，创作精美的像素风格游戏资源。',
        assetCount: 2,
        totalDownloads: 6340,
        averageRating: 4.7,
        verified: true,
        createdAt: now - 120 * day,
      },
      {
        id: 'author-006',
        name: 'FXLab',
        avatar: 'avatar-6.png',
        bio: '游戏特效专家，专注于粒子系统和视觉效果开发。',
        assetCount: 2,
        totalDownloads: 16650,
        averageRating: 4.9,
        verified: true,
        createdAt: now - 220 * day,
      },
      {
        id: 'author-007',
        name: 'Environment Art',
        avatar: 'avatar-7.png',
        bio: '场景环境美术团队，打造沉浸式游戏世界。',
        assetCount: 3,
        totalDownloads: 5900,
        averageRating: 4.6,
        verified: true,
        createdAt: now - 150 * day,
      },
      {
        id: 'author-008',
        name: 'Procedural Labs',
        avatar: 'avatar-8.png',
        bio: '程序化生成技术研究团队，探索无限可能。',
        assetCount: 2,
        totalDownloads: 7800,
        averageRating: 4.6,
        verified: true,
        createdAt: now - 160 * day,
      },
      {
        id: 'author-009',
        name: 'CardGame Pro',
        avatar: 'avatar-9.png',
        bio: '卡牌游戏专家，深耕卡牌游戏领域多年。',
        assetCount: 2,
        totalDownloads: 11460,
        averageRating: 4.8,
        verified: true,
        createdAt: now - 180 * day,
      },
      {
        id: 'author-010',
        name: 'StoryTools',
        avatar: 'avatar-10.png',
        bio: '专注于游戏叙事工具开发，让故事更生动。',
        assetCount: 1,
        totalDownloads: 3120,
        averageRating: 4.6,
        verified: true,
        createdAt: now - 100 * day,
      },
      {
        id: 'author-011',
        name: 'UI Masters',
        avatar: 'avatar-11.png',
        bio: '游戏UI设计和开发团队，追求极致的用户体验。',
        assetCount: 3,
        totalDownloads: 14980,
        averageRating: 4.7,
        verified: true,
        createdAt: now - 140 * day,
      },
      {
        id: 'author-012',
        name: '3D Model Studio',
        avatar: 'avatar-12.png',
        bio: '专业3D模型制作团队，提供高品质3D游戏资源。',
        assetCount: 1,
        totalDownloads: 1890,
        averageRating: 4.7,
        verified: true,
        createdAt: now - 80 * day,
      },
      {
        id: 'author-013',
        name: 'UX Tools',
        avatar: 'avatar-13.png',
        bio: '用户体验设计工具团队，让游戏更易用。',
        assetCount: 1,
        totalDownloads: 1780,
        averageRating: 4.5,
        verified: true,
        createdAt: now - 60 * day,
      },
      {
        id: 'author-014',
        name: 'PuzzleWorks',
        avatar: 'avatar-14.png',
        bio: '解谜游戏开发工作室，挑战你的智力极限。',
        assetCount: 1,
        totalDownloads: 2340,
        averageRating: 4.7,
        verified: true,
        createdAt: now - 90 * day,
      },
    ];
  }

  private loadMockReviews(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const sampleReviews: Record<string, AssetReview[]> = {
      'asset-001': [
        {
          id: 'review-001',
          assetId: 'asset-001',
          userId: 'user-001',
          userName: '游戏开发者小王',
          rating: 5,
          title: '非常实用的UI框架',
          content: '这套UI框架功能很全面，组件丰富，使用起来很方便。文档也很详细，强烈推荐！',
          helpfulCount: 28,
          createdAt: now - 10 * day,
          updatedAt: now - 10 * day,
        },
        {
          id: 'review-002',
          assetId: 'asset-001',
          userId: 'user-002',
          userName: '独立开发者',
          rating: 5,
          title: '节省了大量开发时间',
          content: '用这个框架快速搭建了游戏的UI，比自己从零开始写快多了。组件质量也很高。',
          helpfulCount: 15,
          createdAt: now - 20 * day,
          updatedAt: now - 20 * day,
        },
        {
          id: 'review-003',
          assetId: 'asset-001',
          userId: 'user-003',
          userName: '新手小白',
          rating: 4,
          title: '很好用，但是学习曲线稍陡',
          content: '功能很强大，对于新手来说需要一点时间来学习，不过一旦上手就非常好用了。',
          helpfulCount: 8,
          createdAt: now - 30 * day,
          updatedAt: now - 30 * day,
        },
      ],
      'asset-002': [
        {
          id: 'review-004',
          assetId: 'asset-002',
          userId: 'user-004',
          userName: '三消爱好者',
          rating: 5,
          title: '三消游戏的福音',
          content:
            '作为一个想做三消游戏的开发者，这个资产简直是救星！核心逻辑都写好了，只需要做美术和关卡。',
          helpfulCount: 42,
          createdAt: now - 5 * day,
          updatedAt: now - 5 * day,
        },
        {
          id: 'review-005',
          assetId: 'asset-002',
          userId: 'user-005',
          userName: '休闲游戏工作室',
          rating: 5,
          title: '物超所值',
          content: '代码质量很高，注释清晰，特殊方块效果很炫酷。我们的三消游戏两周就上线了！',
          helpfulCount: 31,
          createdAt: now - 15 * day,
          updatedAt: now - 15 * day,
        },
      ],
    };

    Object.entries(sampleReviews).forEach(([assetId, reviews]) => {
      this.reviews.set(assetId, reviews);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const assetStoreService = new AssetStoreService();
