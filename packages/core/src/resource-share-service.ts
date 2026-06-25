import { globalEventBus } from './event-bus';
import { randomUUID } from 'node:crypto';

export type ResourceCategory =
  | 'code'
  | 'art'
  | 'audio'
  | 'ui'
  | 'tutorial'
  | 'tool'
  | 'plugin'
  | 'other';

export type ResourceStatus = 'pending' | 'approved' | 'rejected';

export type ReportStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

export type ReportType =
  | 'copyright'
  | 'inappropriate'
  | 'spam'
  | 'malicious'
  | 'other';

export interface ResourceFile {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  content?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  category: ResourceCategory;
  tags: string[];
  status: ResourceStatus;
  rejectReason?: string;
  reviewerId?: string;
  reviewedAt?: number;
  version: string;
  files: ResourceFile[];
  totalSize: number;
  previewImages: string[];
  previewVideo?: string;
  downloads: number;
  favorites: number;
  views: number;
  likes: number;
  pointsCost: number;
  isFeatured?: boolean;
  createdAt: number;
  updatedAt: number;
  license?: string;
  isFavorite?: boolean;
  isLiked?: boolean;
}

export interface ResourceUploadData {
  title: string;
  description: string;
  content?: string;
  category: ResourceCategory;
  tags: string[];
  version: string;
  files: ResourceFile[];
  previewImages?: string[];
  previewVideo?: string;
  license?: string;
  pointsCost?: number;
}

export interface ResourceReview {
  id: string;
  resourceId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  content: string;
  helpfulCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface FavoriteCollection {
  id: string;
  name: string;
  description?: string;
  resourceIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DownloadRecord {
  id: string;
  resourceId: string;
  resourceTitle: string;
  userId: string;
  pointsCost: number;
  downloadedAt: number;
}

export interface PointsRecord {
  id: string;
  userId: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  resourceId?: string;
  createdAt: number;
}

export interface UserPoints {
  userId: string;
  total: number;
  earned: number;
  spent: number;
  level: number;
}

export interface Report {
  id: string;
  resourceId: string;
  reporterId: string;
  reporterName: string;
  type: ReportType;
  description: string;
  status: ReportStatus;
  handlerId?: string;
  handleNote?: string;
  createdAt: number;
  handledAt?: number;
}

export interface ResourceSearchOptions {
  query?: string;
  category?: ResourceCategory;
  status?: ResourceStatus;
  sortBy?: 'downloads' | 'favorites' | 'created' | 'updated' | 'views' | 'likes' | 'points';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  tags?: string[];
  authorId?: string;
  isFeatured?: boolean;
  maxPoints?: number;
}

export interface ResourceSearchResult {
  resources: Resource[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ResourceShareService {
  private resources: Resource[] = [];
  private reviews = new Map<string, ResourceReview[]>();
  private favoriteCollections: FavoriteCollection[] = [];
  private downloadRecords: DownloadRecord[] = [];
  private pointsRecords: PointsRecord[] = [];
  private userPoints = new Map<string, UserPoints>();
  private reports: Report[] = [];
  private userFavorites = new Map<string, Set<string>>();
  private userLikes = new Map<string, Set<string>>();
  private currentUserId = 'user-001';

  constructor() {
    this.loadMockResources();
    this.loadMockReviews();
    this.loadMockFavoriteCollections();
    this.loadMockDownloadRecords();
    this.loadMockPointsRecords();
    this.loadMockReports();
    this.loadMockUserPoints();
    this.loadUserFavorites();
    this.loadUserLikes();
  }

  getResources(options?: ResourceSearchOptions): ResourceSearchResult {
    let result = this.resources.filter(r => r.status === 'approved');

    if (options?.status) {
      result = this.resources.filter(r => r.status === options.status);
    }

    if (options?.query) {
      const query = options.query.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query)) ||
        r.authorName.toLowerCase().includes(query)
      );
    }

    if (options?.category) {
      result = result.filter(r => r.category === options.category);
    }

    if (options?.tags && options.tags.length > 0) {
      result = result.filter(r =>
        options.tags!.some(tag => r.tags.includes(tag))
      );
    }

    if (options?.authorId) {
      result = result.filter(r => r.authorId === options.authorId);
    }

    if (options?.isFeatured) {
      result = result.filter(r => r.isFeatured);
    }

    if (options?.maxPoints !== undefined) {
      result = result.filter(r => r.pointsCost <= options.maxPoints!);
    }

    const sortBy = options?.sortBy || 'created';
    const sortOrder = options?.sortOrder || 'desc';

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'downloads':
          comparison = b.downloads - a.downloads;
          break;
        case 'favorites':
          comparison = b.favorites - a.favorites;
          break;
        case 'created':
          comparison = b.createdAt - a.createdAt;
          break;
        case 'updated':
          comparison = b.updatedAt - a.updatedAt;
          break;
        case 'views':
          comparison = b.views - a.views;
          break;
        case 'likes':
          comparison = b.likes - a.likes;
          break;
        case 'points':
          comparison = a.pointsCost - b.pointsCost;
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
      resources: result.slice(start, end).map(r => this.enrichResource(r)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  getResourceById(resourceId: string): Resource | undefined {
    const resource = this.resources.find(r => r.id === resourceId);
    if (resource) {
      resource.views++;
      return this.enrichResource(resource);
    }
    return undefined;
  }

  getMyResources(status?: ResourceStatus): Resource[] {
    let result = this.resources.filter(r => r.authorId === this.currentUserId);
    if (status) {
      result = result.filter(r => r.status === status);
    }
    return result.map(r => this.enrichResource(r));
  }

  getFeaturedResources(limit = 10): Resource[] {
    return this.resources
      .filter(r => r.status === 'approved' && r.isFeatured)
      .slice(0, limit)
      .map(r => this.enrichResource(r));
  }

  getNewestResources(limit = 10): Resource[] {
    return this.resources
      .filter(r => r.status === 'approved')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(r => this.enrichResource(r));
  }

  getMostDownloadedResources(limit = 10): Resource[] {
    return this.resources
      .filter(r => r.status === 'approved')
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit)
      .map(r => this.enrichResource(r));
  }

  async uploadResource(data: ResourceUploadData): Promise<Resource> {
    const now = Date.now();
    const resource: Resource = {
      id: randomUUID(),
      title: data.title,
      description: data.description,
      content: data.content,
      authorId: this.currentUserId,
      authorName: '当前用户',
      category: data.category,
      tags: data.tags,
      status: 'pending',
      version: data.version,
      files: data.files,
      totalSize: data.files.reduce((sum, f) => sum + f.size, 0),
      previewImages: data.previewImages || [],
      previewVideo: data.previewVideo,
      downloads: 0,
      favorites: 0,
      views: 0,
      likes: 0,
      pointsCost: data.pointsCost || 0,
      createdAt: now,
      updatedAt: now,
      license: data.license,
    };

    this.resources.unshift(resource);

    globalEventBus.emit({
      type: 'resource:uploaded',
      payload: { resourceId: resource.id, resource },
    });

    return resource;
  }

  async updateResource(resourceId: string, data: Partial<ResourceUploadData>): Promise<Resource> {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) {
      throw new Error(`资源不存在: ${resourceId}`);
    }

    if (resource.authorId !== this.currentUserId) {
      throw new Error('无权修改此资源');
    }

    Object.assign(resource, data);
    resource.updatedAt = Date.now();
    resource.status = 'pending';

    globalEventBus.emit({
      type: 'resource:updated',
      payload: { resourceId, resource },
    });

    return resource;
  }

  async removeResource(resourceId: string): Promise<void> {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) {
      throw new Error(`资源不存在: ${resourceId}`);
    }

    if (resource.authorId !== this.currentUserId) {
      throw new Error('无权删除此资源');
    }

    const index = this.resources.findIndex(r => r.id === resourceId);
    if (index >= 0) {
      this.resources.splice(index, 1);
    }

    globalEventBus.emit({
      type: 'resource:removed',
      payload: { resourceId },
    });
  }

  async downloadResource(resourceId: string): Promise<boolean> {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource || resource.status !== 'approved') {
      throw new Error('资源不存在或未通过审核');
    }

    const points = this.getUserPoints();
    if (points.total < resource.pointsCost) {
      throw new Error('积分不足');
    }

    const alreadyDownloaded = this.downloadRecords.some(
      r => r.resourceId === resourceId && r.userId === this.currentUserId
    );

    if (alreadyDownloaded) {
      return true;
    }

    if (resource.pointsCost > 0) {
      this.addPointsRecord('spend', resource.pointsCost, `下载资源: ${resource.title}`, resourceId);
    }

    const record: DownloadRecord = {
      id: randomUUID(),
      resourceId,
      resourceTitle: resource.title,
      userId: this.currentUserId,
      pointsCost: resource.pointsCost,
      downloadedAt: Date.now(),
    };
    this.downloadRecords.unshift(record);

    resource.downloads++;

    if (resource.authorId !== this.currentUserId) {
      this.addPointsRecordForUser(resource.authorId, 'earn', Math.floor(resource.pointsCost * 0.7), `资源被下载: ${resource.title}`, resourceId);
    }

    globalEventBus.emit({
      type: 'resource:downloaded',
      payload: { resourceId, resource },
    });

    return true;
  }

  toggleFavorite(resourceId: string): boolean {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) {
      throw new Error(`资源不存在: ${resourceId}`);
    }

    const favorites = this.getUserFavorites();
    if (favorites.has(resourceId)) {
      favorites.delete(resourceId);
      resource.favorites = Math.max(0, resource.favorites - 1);
      globalEventBus.emit({ type: 'resource:unfavorited', payload: { resourceId } });
    } else {
      favorites.add(resourceId);
      resource.favorites++;
      globalEventBus.emit({ type: 'resource:favorited', payload: { resourceId } });
    }

    this.saveUserFavorites();
    return favorites.has(resourceId);
  }

  toggleLike(resourceId: string): boolean {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) {
      throw new Error(`资源不存在: ${resourceId}`);
    }

    const likes = this.getUserLikes();
    if (likes.has(resourceId)) {
      likes.delete(resourceId);
      resource.likes = Math.max(0, resource.likes - 1);
      globalEventBus.emit({ type: 'resource:unliked', payload: { resourceId } });
    } else {
      likes.add(resourceId);
      resource.likes++;
      globalEventBus.emit({ type: 'resource:liked', payload: { resourceId } });
    }

    this.saveUserLikes();
    return likes.has(resourceId);
  }

  getFavoriteCollections(): FavoriteCollection[] {
    return this.favoriteCollections;
  }

  createFavoriteCollection(name: string, description?: string): FavoriteCollection {
    const collection: FavoriteCollection = {
      id: randomUUID(),
      name,
      description,
      resourceIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.favoriteCollections.unshift(collection);
    return collection;
  }

  addToCollection(collectionId: string, resourceId: string): void {
    const collection = this.favoriteCollections.find(c => c.id === collectionId);
    if (collection && !collection.resourceIds.includes(resourceId)) {
      collection.resourceIds.push(resourceId);
      collection.updatedAt = Date.now();
    }
  }

  removeFromCollection(collectionId: string, resourceId: string): void {
    const collection = this.favoriteCollections.find(c => c.id === collectionId);
    if (collection) {
      collection.resourceIds = collection.resourceIds.filter(id => id !== resourceId);
      collection.updatedAt = Date.now();
    }
  }

  deleteCollection(collectionId: string): void {
    const index = this.favoriteCollections.findIndex(c => c.id === collectionId);
    if (index >= 0) {
      this.favoriteCollections.splice(index, 1);
    }
  }

  getDownloadHistory(page = 1, pageSize = 20): { records: DownloadRecord[]; total: number; totalPages: number } {
    const userRecords = this.downloadRecords.filter(r => r.userId === this.currentUserId);
    const total = userRecords.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    return {
      records: userRecords.slice(start, start + pageSize),
      total,
      totalPages,
    };
  }

  getUserPoints(): UserPoints {
    let points = this.userPoints.get(this.currentUserId);
    if (!points) {
      points = {
        userId: this.currentUserId,
        total: 500,
        earned: 500,
        spent: 0,
        level: 1,
      };
      this.userPoints.set(this.currentUserId, points);
    }
    return points;
  }

  getPointsHistory(page = 1, pageSize = 20): { records: PointsRecord[]; total: number; totalPages: number } {
    const userRecords = this.pointsRecords.filter(r => r.userId === this.currentUserId);
    const total = userRecords.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    return {
      records: userRecords.slice(start, start + pageSize),
      total,
      totalPages,
    };
  }

  async reportResource(resourceId: string, type: ReportType, description: string): Promise<Report> {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) {
      throw new Error(`资源不存在: ${resourceId}`);
    }

    const report: Report = {
      id: randomUUID(),
      resourceId,
      reporterId: this.currentUserId,
      reporterName: '当前用户',
      type,
      description,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.reports.unshift(report);

    globalEventBus.emit({
      type: 'resource:reported',
      payload: { resourceId, report },
    });

    return report;
  }

  getMyReports(): Report[] {
    return this.reports.filter(r => r.reporterId === this.currentUserId);
  }

  getResourceReviews(resourceId: string, page = 1, pageSize = 10): { reviews: ResourceReview[]; total: number; totalPages: number } {
    const reviews = this.reviews.get(resourceId) || [];
    const total = reviews.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    return {
      reviews: reviews.slice(start, start + pageSize),
      total,
      totalPages,
    };
  }

  async addReview(resourceId: string, rating: number, content: string): Promise<ResourceReview> {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) {
      throw new Error(`资源不存在: ${resourceId}`);
    }

    const review: ResourceReview = {
      id: randomUUID(),
      resourceId,
      userId: this.currentUserId,
      userName: '当前用户',
      rating,
      content,
      helpfulCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const existingReviews = this.reviews.get(resourceId) || [];
    const existingIndex = existingReviews.findIndex(r => r.userId === this.currentUserId);

    if (existingIndex >= 0) {
      review.id = existingReviews[existingIndex].id;
      review.createdAt = existingReviews[existingIndex].createdAt;
      review.helpfulCount = existingReviews[existingIndex].helpfulCount;
      existingReviews[existingIndex] = review;
    } else {
      existingReviews.unshift(review);
    }

    this.reviews.set(resourceId, existingReviews);

    globalEventBus.emit({
      type: 'resource:review-added',
      payload: { resourceId, review },
    });

    return review;
  }

  getCategories(): { id: ResourceCategory; name: string; icon: string; count: number }[] {
    const categoryMeta: Record<ResourceCategory, { name: string; icon: string }> = {
      code: { name: '代码分享', icon: 'code' },
      art: { name: '美术资源', icon: 'image' },
      audio: { name: '音效素材', icon: 'music' },
      ui: { name: 'UI设计', icon: 'layout' },
      tutorial: { name: '教程文档', icon: 'book-open' },
      tool: { name: '开发工具', icon: 'wrench' },
      plugin: { name: '插件扩展', icon: 'puzzle' },
      other: { name: '其他', icon: 'box' },
    };

    const categoryMap = new Map<ResourceCategory, number>();
    this.resources.filter(r => r.status === 'approved').forEach(r => {
      categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1);
    });

    return (Object.keys(categoryMeta) as ResourceCategory[]).map(id => ({
      id,
      name: categoryMeta[id].name,
      icon: categoryMeta[id].icon,
      count: categoryMap.get(id) || 0,
    }));
  }

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    this.resources.filter(r => r.status === 'approved').forEach(r =>
      r.tags.forEach(t => tagSet.add(t))
    );
    return [...tagSet].sort();
  }

  private addPointsRecord(type: 'earn' | 'spend', amount: number, reason: string, resourceId?: string): void {
    this.addPointsRecordForUser(this.currentUserId, type, amount, reason, resourceId);
  }

  private addPointsRecordForUser(userId: string, type: 'earn' | 'spend', amount: number, reason: string, resourceId?: string): void {
    const record: PointsRecord = {
      id: randomUUID(),
      userId,
      type,
      amount,
      reason,
      resourceId,
      createdAt: Date.now(),
    };
    this.pointsRecords.unshift(record);

    let points = this.userPoints.get(userId);
    if (!points) {
      points = { userId, total: 0, earned: 0, spent: 0, level: 1 };
      this.userPoints.set(userId, points);
    }

    if (type === 'earn') {
      points.earned += amount;
      points.total += amount;
    } else {
      points.spent += amount;
      points.total = Math.max(0, points.total - amount);
    }

    points.level = this.calculateLevel(points.earned);
  }

  private calculateLevel(earned: number): number {
    if (earned >= 10000) return 10;
    if (earned >= 5000) return 9;
    if (earned >= 3000) return 8;
    if (earned >= 2000) return 7;
    if (earned >= 1000) return 6;
    if (earned >= 500) return 5;
    if (earned >= 200) return 4;
    if (earned >= 100) return 3;
    if (earned >= 50) return 2;
    return 1;
  }

  private enrichResource(resource: Resource): Resource {
    const favorites = this.getUserFavorites();
    const likes = this.getUserLikes();
    return {
      ...resource,
      isFavorite: favorites.has(resource.id),
      isLiked: likes.has(resource.id),
    };
  }

  private getUserFavorites(): Set<string> {
    let favorites = this.userFavorites.get(this.currentUserId);
    if (!favorites) {
      favorites = new Set();
      this.userFavorites.set(this.currentUserId, favorites);
    }
    return favorites;
  }

  private getUserLikes(): Set<string> {
    let likes = this.userLikes.get(this.currentUserId);
    if (!likes) {
      likes = new Set();
      this.userLikes.set(this.currentUserId, likes);
    }
    return likes;
  }

  private loadUserFavorites(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tapdev-resource-favorites');
        if (saved) {
          const data: string[] = JSON.parse(saved);
          const favorites = this.getUserFavorites();
          data.forEach(id => favorites.add(id));
        }
      }
    } catch {
    }
  }

  private saveUserFavorites(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const favorites = this.getUserFavorites();
        localStorage.setItem('tapdev-resource-favorites', JSON.stringify([...favorites]));
      }
    } catch {
    }
  }

  private loadUserLikes(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tapdev-resource-likes');
        if (saved) {
          const data: string[] = JSON.parse(saved);
          const likes = this.getUserLikes();
          data.forEach(id => likes.add(id));
        }
      }
    } catch {
    }
  }

  private saveUserLikes(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const likes = this.getUserLikes();
        localStorage.setItem('tapdev-resource-likes', JSON.stringify([...likes]));
      }
    } catch {
    }
  }

  private loadMockResources(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.resources = [
      {
        id: 'res-001',
        title: '自制关卡编辑器脚本分享',
        description: '一个简单但实用的关卡编辑器脚本，支持拖拽放置瓦片，导出JSON格式。用了两周时间写的，希望对大家有帮助。',
        content: '## 功能特点\n- 支持多种瓦片类型\n- 拖拽式编辑\n- 一键导出JSON\n- 支持自定义瓦片大小',
        authorId: 'user-101',
        authorName: '游戏达人',
        authorAvatar: 'user-101.png',
        category: 'code',
        tags: ['关卡编辑器', '工具脚本', '2D', '瓦片地图'],
        status: 'approved',
        version: '1.0.0',
        files: [
          { name: 'level-editor.js', size: 45056, type: 'javascript' },
          { name: 'README.md', size: 2048, type: 'markdown' },
        ],
        totalSize: 47104,
        previewImages: ['level-editor-1.png', 'level-editor-2.png'],
        downloads: 1256,
        favorites: 234,
        views: 5678,
        likes: 389,
        pointsCost: 0,
        isFeatured: true,
        createdAt: now - 45 * day,
        updatedAt: now - 45 * day,
        license: 'MIT',
      },
      {
        id: 'res-002',
        title: '像素风格怪物素材包',
        description: '自己画的一组像素风格怪物素材，共8只怪物，每只都有4个方向的行走动画。免费分享给大家！',
        authorId: 'user-102',
        authorName: '像素画家',
        authorAvatar: 'user-102.png',
        category: 'art',
        tags: ['像素艺术', '怪物', '2D', '精灵图', '动画'],
        status: 'approved',
        version: '1.2.0',
        files: [
          { name: 'monsters.png', size: 2097152, type: 'image' },
          { name: 'spritesheet.json', size: 51200, type: 'json' },
        ],
        totalSize: 2148352,
        previewImages: ['monsters-1.png', 'monsters-2.png', 'monsters-3.png'],
        downloads: 2340,
        favorites: 456,
        views: 8901,
        likes: 678,
        pointsCost: 0,
        isFeatured: true,
        createdAt: now - 60 * day,
        updatedAt: now - 30 * day,
        license: 'CC0',
      },
      {
        id: 'res-003',
        title: 'Roguelike开发经验分享',
        description: '开发Roguelike游戏一年多了，总结了一些经验和踩过的坑。包括随机地图生成、物品系统、战斗系统等方面。',
        content: '## 前言\n\n接触Roguelike游戏开发已经一年多了，从最开始的兴趣使然，到现在完成了自己的第一个独立游戏。一路上踩了很多坑，也积累了一些经验，想在这里和大家分享一下。',
        authorId: 'user-103',
        authorName: '独立游戏开发者',
        authorAvatar: 'user-103.png',
        category: 'tutorial',
        tags: ['Roguelike', '开发经验', '游戏设计', '独立开发'],
        status: 'approved',
        version: '1.0.0',
        files: [
          { name: 'roguelike-guide.md', size: 51200, type: 'markdown' },
          { name: 'examples.zip', size: 204800, type: 'archive' },
        ],
        totalSize: 256000,
        previewImages: ['roguelike-tutorial-1.png'],
        downloads: 890,
        favorites: 567,
        views: 12345,
        likes: 890,
        pointsCost: 0,
        isFeatured: true,
        createdAt: now - 90 * day,
        updatedAt: now - 80 * day,
      },
      {
        id: 'res-004',
        title: '自制音效：UI交互音效包',
        description: '用合成软件做的一组UI交互音效，包括按钮点击、弹窗出现、提示音等共20个音效。MP3和WAV双格式。',
        authorId: 'user-104',
        authorName: '音效爱好者',
        authorAvatar: 'user-104.png',
        category: 'audio',
        tags: ['音效', 'UI', '交互', '合成器'],
        status: 'approved',
        version: '1.0.0',
        files: [
          { name: 'ui-sounds-mp3.zip', size: 3145728, type: 'archive' },
          { name: 'ui-sounds-wav.zip', size: 10485760, type: 'archive' },
        ],
        totalSize: 13631488,
        previewImages: ['ui-sounds-1.png'],
        downloads: 1567,
        favorites: 312,
        views: 4567,
        likes: 423,
        pointsCost: 0,
        createdAt: now - 30 * day,
        updatedAt: now - 30 * day,
        license: 'CC0',
      },
      {
        id: 'res-005',
        title: '战斗伤害数字插件',
        description: '一个轻量级的伤害数字显示插件，支持暴击、治疗、闪避等多种效果，可自定义动画和样式。',
        authorId: 'user-105',
        authorName: '插件达人',
        authorAvatar: 'user-105.png',
        category: 'plugin',
        tags: ['插件', '伤害数字', '战斗', 'UI特效'],
        status: 'approved',
        version: '2.1.0',
        files: [
          { name: 'damage-numbers.js', size: 30720, type: 'javascript' },
          { name: 'damage-numbers.css', size: 10240, type: 'css' },
        ],
        totalSize: 40960,
        previewImages: ['damage-plugin-1.png', 'damage-plugin-2.png'],
        downloads: 2100,
        favorites: 389,
        views: 6789,
        likes: 567,
        pointsCost: 20,
        isFeatured: true,
        createdAt: now - 120 * day,
        updatedAt: now - 15 * day,
        license: 'MIT',
      },
      {
        id: 'res-006',
        title: '手游UI界面设计稿',
        description: '一套手游UI界面设计稿，PSD格式，包含主界面、战斗界面、商城界面、背包界面等。仅供学习参考。',
        authorId: 'user-106',
        authorName: 'UI设计师',
        authorAvatar: 'user-106.png',
        category: 'ui',
        tags: ['UI设计', '手游', 'PSD', '界面设计'],
        status: 'approved',
        version: '1.0.0',
        files: [
          { name: 'ui-design.psd', size: 52428800, type: 'image' },
          { name: 'preview.png', size: 1048576, type: 'image' },
        ],
        totalSize: 53477376,
        previewImages: ['ui-design-1.png', 'ui-design-2.png', 'ui-design-3.png'],
        downloads: 3450,
        favorites: 678,
        views: 15678,
        likes: 987,
        pointsCost: 50,
        createdAt: now - 75 * day,
        updatedAt: now - 75 * day,
      },
      {
        id: 'res-007',
        title: '新手向：用TapDev做第一个游戏',
        description: '写给完全零基础的新手的教程，从安装到做出第一个简单的小游戏，图文并茂，一步步带你入门。',
        content: '## 准备工作\n\n在开始之前，我们需要先安装TapDev编辑器。请访问官方网站下载最新版本...',
        authorId: 'user-107',
        authorName: '入门导师',
        authorAvatar: 'user-107.png',
        category: 'tutorial',
        tags: ['新手教程', '入门', '零基础', '第一个游戏'],
        status: 'approved',
        version: '2.0.0',
        files: [
          { name: 'beginner-guide.md', size: 81920, type: 'markdown' },
          { name: 'demo-project.zip', size: 1048576, type: 'archive' },
        ],
        totalSize: 1130496,
        previewImages: ['beginner-1.png', 'beginner-2.png'],
        downloads: 5678,
        favorites: 890,
        views: 23456,
        likes: 1234,
        pointsCost: 0,
        isFeatured: true,
        createdAt: now - 180 * day,
        updatedAt: now - 45 * day,
      },
      {
        id: 'res-008',
        title: '等待审核：我的第一个游戏Demo',
        description: '刚学了一个月，做了一个简单的平台跳跃游戏Demo，分享给大家看看，请多多指教！',
        authorId: 'user-108',
        authorName: '新手上路',
        authorAvatar: 'user-108.png',
        category: 'code',
        tags: ['平台跳跃', 'Demo', '新手作品', '2D'],
        status: 'pending',
        version: '0.1.0',
        files: [
          { name: 'platformer-demo.zip', size: 5242880, type: 'archive' },
          { name: 'README.md', size: 1024, type: 'markdown' },
        ],
        totalSize: 5243904,
        previewImages: ['demo-1.png'],
        downloads: 0,
        favorites: 0,
        views: 123,
        likes: 5,
        pointsCost: 0,
        createdAt: now - 1 * day,
        updatedAt: now - 1 * day,
      },
      {
        id: 'res-009',
        title: '被拒绝：疑似侵权的素材包',
        description: '从网上收集的一些素材，整理后分享给大家。',
        authorId: 'user-109',
        authorName: '资源搬运工',
        authorAvatar: 'user-109.png',
        category: 'art',
        tags: ['素材', '收集'],
        status: 'rejected',
        rejectReason: '包含版权不明的素材，请上传原创或有明确授权的资源',
        reviewerId: 'admin-001',
        reviewedAt: now - 5 * day,
        version: '1.0.0',
        files: [
          { name: 'assets.zip', size: 10485760, type: 'archive' },
        ],
        totalSize: 10485760,
        previewImages: [],
        downloads: 0,
        favorites: 0,
        views: 456,
        likes: 2,
        pointsCost: 0,
        createdAt: now - 6 * day,
        updatedAt: now - 5 * day,
      },
      {
        id: 'res-010',
        title: '性能优化工具脚本合集',
        description: '自己整理的一些性能优化相关的工具脚本，包括图集打包、资源压缩、代码混淆等。',
        authorId: 'user-110',
        authorName: '性能优化专家',
        authorAvatar: 'user-110.png',
        category: 'tool',
        tags: ['性能优化', '工具脚本', '打包', '压缩'],
        status: 'approved',
        version: '1.3.0',
        files: [
          { name: 'texture-packer.py', size: 15360, type: 'python' },
          { name: 'image-compressor.js', size: 20480, type: 'javascript' },
          { name: 'minify.sh', size: 5120, type: 'shell' },
        ],
        totalSize: 40960,
        previewImages: ['tools-1.png'],
        downloads: 789,
        favorites: 189,
        views: 3456,
        likes: 267,
        pointsCost: 10,
        createdAt: now - 100 * day,
        updatedAt: now - 20 * day,
        license: 'MIT',
      },
      {
        id: 'res-011',
        title: '游戏中的数学：从入门到精通',
        description: '系统整理了游戏开发中常用的数学知识，包括向量、矩阵、插值、碰撞检测等。适合数学基础薄弱的同学。',
        content: '## 目录\n\n1. 向量运算基础\n2. 矩阵变换\n3. 插值算法\n4. 碰撞检测\n5. 物理模拟',
        authorId: 'user-111',
        authorName: '数学老师',
        authorAvatar: 'user-111.png',
        category: 'tutorial',
        tags: ['数学', '游戏数学', '向量', '矩阵', '物理'],
        status: 'approved',
        version: '1.0.0',
        files: [
          { name: 'game-math.pdf', size: 2097152, type: 'pdf' },
          { name: 'examples', size: 512000, type: 'directory' },
        ],
        totalSize: 2609152,
        previewImages: ['math-1.png'],
        downloads: 1234,
        favorites: 456,
        views: 8765,
        likes: 567,
        pointsCost: 30,
        isFeatured: true,
        createdAt: now - 50 * day,
        updatedAt: now - 50 * day,
      },
      {
        id: 'res-012',
        title: '背景音乐：轻快游戏BGM',
        description: '自己作曲的一首轻快风格的游戏背景音乐，循环优化过，可以用于休闲类游戏。免费使用，只需署名即可。',
        authorId: 'user-112',
        authorName: '业余作曲家',
        authorAvatar: 'user-112.png',
        category: 'audio',
        tags: ['背景音乐', 'BGM', '原创音乐', '轻快', '休闲'],
        status: 'approved',
        version: '1.0.0',
        files: [
          { name: 'happy-bgm.mp3', size: 4194304, type: 'audio' },
          { name: 'happy-bgm.wav', size: 20971520, type: 'audio' },
        ],
        totalSize: 25165824,
        previewImages: ['bgm-1.png'],
        downloads: 2345,
        favorites: 512,
        views: 7890,
        likes: 678,
        pointsCost: 0,
        createdAt: now - 35 * day,
        updatedAt: now - 35 * day,
        license: 'CC BY',
      },
    ];
  }

  private loadMockReviews(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const sampleReviews: Record<string, ResourceReview[]> = {
      'res-001': [
        {
          id: 'rev-001',
          resourceId: 'res-001',
          userId: 'user-201',
          userName: '路过的开发者',
          rating: 5,
          content: '很实用的脚本，省了我不少时间！代码写得也很清晰，学习了。',
          helpfulCount: 15,
          createdAt: now - 40 * day,
          updatedAt: now - 40 * day,
        },
        {
          id: 'rev-002',
          resourceId: 'res-001',
          userId: 'user-202',
          userName: '新手小白',
          rating: 4,
          content: '功能不错，就是文档稍微少了点，希望能多加点注释。',
          helpfulCount: 8,
          createdAt: now - 35 * day,
          updatedAt: now - 35 * day,
        },
      ],
      'res-002': [
        {
          id: 'rev-003',
          resourceId: 'res-002',
          userId: 'user-203',
          userName: '独立开发者',
          rating: 5,
          content: '画得太好了！用在我的小游戏里了，非常感谢分享。',
          helpfulCount: 32,
          createdAt: now - 55 * day,
          updatedAt: now - 55 * day,
        },
      ],
    };

    Object.entries(sampleReviews).forEach(([resourceId, reviews]) => {
      this.reviews.set(resourceId, reviews);
    });
  }

  private loadMockFavoriteCollections(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.favoriteCollections = [
      {
        id: 'fav-001',
        name: '实用工具',
        description: '收集的一些实用开发工具和脚本',
        resourceIds: ['res-001', 'res-010', 'res-005'],
        createdAt: now - 60 * day,
        updatedAt: now - 20 * day,
      },
      {
        id: 'fav-002',
        name: '学习资料',
        description: '好的教程和文章',
        resourceIds: ['res-003', 'res-007', 'res-011'],
        createdAt: now - 90 * day,
        updatedAt: now - 45 * day,
      },
      {
        id: 'fav-003',
        name: '美术资源',
        resourceIds: ['res-002'],
        createdAt: now - 50 * day,
        updatedAt: now - 50 * day,
      },
    ];
  }

  private loadMockDownloadRecords(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.downloadRecords = [
      {
        id: 'dl-001',
        resourceId: 'res-002',
        resourceTitle: '像素风格怪物素材包',
        userId: this.currentUserId,
        pointsCost: 0,
        downloadedAt: now - 30 * day,
      },
      {
        id: 'dl-002',
        resourceId: 'res-007',
        resourceTitle: '新手向：用TapDev做第一个游戏',
        userId: this.currentUserId,
        pointsCost: 0,
        downloadedAt: now - 60 * day,
      },
      {
        id: 'dl-003',
        resourceId: 'res-005',
        resourceTitle: '战斗伤害数字插件',
        userId: this.currentUserId,
        pointsCost: 20,
        downloadedAt: now - 15 * day,
      },
    ];
  }

  private loadMockPointsRecords(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.pointsRecords = [
      {
        id: 'pt-001',
        userId: this.currentUserId,
        type: 'earn',
        amount: 500,
        reason: '新用户注册奖励',
        createdAt: now - 90 * day,
      },
      {
        id: 'pt-002',
        userId: this.currentUserId,
        type: 'earn',
        amount: 100,
        reason: '首次上传资源',
        resourceId: 'res-008',
        createdAt: now - 45 * day,
      },
      {
        id: 'pt-003',
        userId: this.currentUserId,
        type: 'spend',
        amount: 20,
        reason: '下载资源: 战斗伤害数字插件',
        resourceId: 'res-005',
        createdAt: now - 15 * day,
      },
      {
        id: 'pt-004',
        userId: this.currentUserId,
        type: 'earn',
        amount: 50,
        reason: '连续签到7天',
        createdAt: now - 20 * day,
      },
    ];
  }

  private loadMockReports(): void {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    this.reports = [
      {
        id: 'report-001',
        resourceId: 'res-006',
        reporterId: 'user-201',
        reporterName: '热心市民',
        type: 'copyright',
        description: '这个设计稿好像是某款商业游戏的UI，怀疑是未经授权上传的。',
        status: 'resolved',
        handlerId: 'admin-001',
        handleNote: '已核实，资源正常，为原创设计',
        createdAt: now - 25 * day,
        handledAt: now - 24 * day,
      },
    ];
  }

  private loadMockUserPoints(): void {
    this.userPoints.set(this.currentUserId, {
      userId: this.currentUserId,
      total: 630,
      earned: 650,
      spent: 20,
      level: 4,
    });
  }
}

export const resourceShareService = new ResourceShareService();
