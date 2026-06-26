/**
 * 社区运营工具
 * - 评论管理：评论列表、评论详情、回复评论、删除评论、置顶
 * - 评论筛选：按时间、按热度、按评分、待审核
 * - 公告管理：发布公告、编辑公告、公告列表、置顶公告
 * - 公告类型：更新公告、活动公告、维护公告、系统公告
 * - 玩家反馈：反馈列表、反馈分类、反馈处理状态
 * - 反馈分类：Bug反馈、功能建议、体验问题、其他
 * - FAQ 管理：FAQ列表、FAQ分类、搜索FAQ
 * - 标签管理：评论标签、反馈标签
 * - 统计数据：评论数、反馈数、公告阅读量
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type CommentSort = 'time' | 'hot' | 'rating';
export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'deleted';
export type AnnouncementType = 'update' | 'event' | 'maintenance' | 'system';
export type FeedbackCategory = 'bug' | 'suggestion' | 'experience' | 'other';
export type FeedbackStatus = 'open' | 'processing' | 'resolved' | 'closed';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  likes: number;
  replies: Comment[];
  replyCount: number;
  parentId?: string;
  status: CommentStatus;
  isPinned: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  isPinned: boolean;
  viewCount: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  isPublished: boolean;
}

export interface Feedback {
  id: string;
  title: string;
  content: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  authorId: string;
  authorName: string;
  authorContact?: string;
  tags: string[];
  screenshots: string[];
  assignee?: string;
  resolution?: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  sortOrder: number;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CommunityStats {
  totalComments: number;
  pendingComments: number;
  totalAnnouncements: number;
  totalFeedbacks: number;
  openFeedbacks: number;
  totalFAQs: number;
  announcementViews: number;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c-001',
    content: '这个游戏太好玩了！画面精美，玩法多样，强烈推荐！',
    authorId: 'u-001',
    authorName: '游戏达人小明',
    authorAvatar: '',
    rating: 5,
    likes: 128,
    replies: [],
    replyCount: 3,
    status: 'approved',
    isPinned: true,
    tags: ['好评', '推荐'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'c-002',
    content: '希望能增加更多的角色和关卡，现在内容有点少。',
    authorId: 'u-002',
    authorName: '玩家老王',
    authorAvatar: '',
    rating: 4,
    likes: 56,
    replies: [],
    replyCount: 1,
    status: 'approved',
    isPinned: false,
    tags: ['建议'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 43200000,
  },
  {
    id: 'c-003',
    content: '第三关有点太难了，卡了好久都过不去...',
    authorId: 'u-003',
    authorName: '新手玩家',
    authorAvatar: '',
    rating: 3,
    likes: 23,
    replies: [],
    replyCount: 0,
    status: 'pending',
    isPinned: false,
    tags: ['难度'],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
];

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a-001',
    title: '【版本更新】V2.0 全新内容上线',
    content: '亲爱的玩家们，V2.0版本正式上线！新增5个关卡、3个角色、全新PVP模式...',
    type: 'update',
    isPinned: true,
    viewCount: 12580,
    createdBy: '运营团队',
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
    publishedAt: Date.now() - 86400000 * 7,
    isPublished: true,
  },
  {
    id: 'a-002',
    title: '【活动公告】夏日狂欢活动开启',
    content: '夏日限定活动即将开启！参与活动即可获得限定皮肤和大量奖励...',
    type: 'event',
    isPinned: true,
    viewCount: 8920,
    createdBy: '运营团队',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 2,
    publishedAt: Date.now() - 86400000 * 3,
    isPublished: true,
  },
  {
    id: 'a-003',
    title: '【维护公告】6月25日服务器维护通知',
    content: '为了给大家带来更好的游戏体验，我们将于6月25日凌晨2:00-6:00进行服务器维护...',
    type: 'maintenance',
    isPinned: false,
    viewCount: 3456,
    createdBy: '技术团队',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000,
    publishedAt: Date.now() - 86400000 * 2,
    isPublished: true,
  },
  {
    id: 'a-004',
    title: '【系统公告】防沉迷系统升级',
    content: '根据最新规定，游戏防沉迷系统已完成升级，请各位玩家合理安排游戏时间...',
    type: 'system',
    isPinned: false,
    viewCount: 2100,
    createdBy: '运营团队',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
    publishedAt: Date.now() - 86400000 * 10,
    isPublished: true,
  },
];

const MOCK_FEEDBACKS: Feedback[] = [
  {
    id: 'f-001',
    title: '登录时闪退',
    content: '每次打开游戏在登录界面就会闪退，手机型号是iPhone 14，系统版本iOS 17。',
    category: 'bug',
    status: 'processing',
    priority: 'high',
    authorId: 'u-004',
    authorName: '闪退用户',
    authorContact: 'user1@example.com',
    tags: ['登录', '闪退', 'iOS'],
    screenshots: [],
    assignee: '技术支持A',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'f-002',
    title: '建议增加好友系统',
    content: '希望能增加好友系统，可以和好友一起组队玩游戏。',
    category: 'suggestion',
    status: 'open',
    priority: 'medium',
    authorId: 'u-005',
    authorName: '社交玩家',
    tags: ['好友', '社交'],
    screenshots: [],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'f-003',
    title: '界面字体太小了',
    content: '游戏内界面字体太小，看着很费劲，能不能调大一点或者增加字体大小设置？',
    category: 'experience',
    status: 'resolved',
    priority: 'low',
    authorId: 'u-006',
    authorName: '视力不好的玩家',
    tags: ['UI', '字体'],
    screenshots: [],
    assignee: '产品经理B',
    resolution: '已在设置中增加字体大小调节功能，将在下个版本上线。',
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 5,
    resolvedAt: Date.now() - 86400000 * 5,
  },
];

const MOCK_FAQS: FAQ[] = [
  {
    id: 'faq-001',
    question: '如何更换账号？',
    answer: '您可以在游戏设置 - 账号管理中点击"切换账号"按钮进行更换。',
    category: '账号问题',
    tags: ['账号', '切换'],
    viewCount: 5680,
    helpfulCount: 320,
    notHelpfulCount: 15,
    sortOrder: 1,
    isPublished: true,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'faq-002',
    question: '充值未到账怎么办？',
    answer: '如果充值后钻石未及时到账，请耐心等待5-10分钟。如仍未到账，请联系客服并提供订单号。',
    category: '充值问题',
    tags: ['充值', '钻石'],
    viewCount: 3420,
    helpfulCount: 210,
    notHelpfulCount: 25,
    sortOrder: 2,
    isPublished: true,
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'faq-003',
    question: '游戏数据可以转移吗？',
    answer: '同渠道账号的游戏数据是互通的。不同渠道之间数据暂不支持转移。',
    category: '账号问题',
    tags: ['数据', '转移', '渠道'],
    viewCount: 2100,
    helpfulCount: 150,
    notHelpfulCount: 30,
    sortOrder: 3,
    isPublished: true,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'faq-004',
    question: '如何联系客服？',
    answer: '您可以通过游戏内设置 - 帮助与反馈 - 联系客服，或发送邮件至 support@example.com。',
    category: '客服问题',
    tags: ['客服', '联系'],
    viewCount: 1890,
    helpfulCount: 95,
    notHelpfulCount: 20,
    sortOrder: 4,
    isPublished: true,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 5,
  },
];

const COMMENT_TAGS = ['好评', '差评', '建议', 'BUG', '难度', '画面', '音效', '玩法'];
const FEEDBACK_TAGS = [
  '登录',
  '闪退',
  '卡顿',
  '充值',
  '账号',
  'UI',
  '音效',
  '玩法',
  '社交',
  '好友',
];
const FAQ_CATEGORIES = ['账号问题', '充值问题', '游戏玩法', '技术问题', '客服问题', '活动问题'];

export class CommunityService {
  private comments = new Map<string, Comment>();
  private announcements = new Map<string, Announcement>();
  private feedbacks = new Map<string, Feedback>();
  private faqs = new Map<string, FAQ>();

  constructor() {
    MOCK_COMMENTS.forEach((c) => this.comments.set(c.id, c));
    MOCK_ANNOUNCEMENTS.forEach((a) => this.announcements.set(a.id, a));
    MOCK_FEEDBACKS.forEach((f) => this.feedbacks.set(f.id, f));
    MOCK_FAQS.forEach((f) => this.faqs.set(f.id, f));
  }

  async listComments(options?: {
    sort?: CommentSort;
    status?: CommentStatus;
    page?: number;
    pageSize?: number;
    tag?: string;
  }): Promise<{ comments: Comment[]; total: number }> {
    let comments = Array.from(this.comments.values());

    if (options?.status) {
      comments = comments.filter((c) => c.status === options.status);
    }
    if (options?.tag) {
      comments = comments.filter((c) => c.tags.includes(options.tag!));
    }

    if (options?.sort === 'hot') {
      comments.sort((a, b) => b.likes - a.likes);
    } else if (options?.sort === 'rating') {
      comments.sort((a, b) => b.rating - a.rating);
    } else {
      comments.sort((a, b) => b.createdAt - a.createdAt);
    }

    const pinned = comments.filter((c) => c.isPinned);
    const unpinned = comments.filter((c) => !c.isPinned);
    comments = [...pinned, ...unpinned];

    const total = comments.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    comments = comments.slice(start, start + pageSize);

    return { comments, total };
  }

  getComment(commentId: string): Comment | undefined {
    return this.comments.get(commentId);
  }

  async createComment(options: {
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    rating?: number;
    parentId?: string;
    tags?: string[];
  }): Promise<Comment> {
    const comment: Comment = {
      id: `c-${randomUUID().slice(0, 8)}`,
      content: options.content,
      authorId: options.authorId,
      authorName: options.authorName,
      authorAvatar: options.authorAvatar ?? '',
      rating: options.rating ?? 5,
      likes: 0,
      replies: [],
      replyCount: 0,
      parentId: options.parentId,
      status: 'pending',
      isPinned: false,
      tags: options.tags ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.comments.set(comment.id, comment);

    if (options.parentId) {
      const parent = this.comments.get(options.parentId);
      if (parent) {
        parent.replyCount++;
        parent.replies.push(comment);
      }
    }

    globalEventBus.emit({ type: 'community:commentCreated', payload: comment });
    return comment;
  }

  async approveComment(commentId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    comment.status = 'approved';
    comment.updatedAt = Date.now();

    globalEventBus.emit({ type: 'community:commentApproved', payload: commentId });
    return true;
  }

  async rejectComment(commentId: string, reason?: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    comment.status = 'rejected';
    comment.updatedAt = Date.now();

    globalEventBus.emit({ type: 'community:commentRejected', payload: { commentId, reason } });
    return true;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    comment.status = 'deleted';
    comment.updatedAt = Date.now();

    globalEventBus.emit({ type: 'community:commentDeleted', payload: commentId });
    return true;
  }

  async pinComment(commentId: string, pinned: boolean): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    comment.isPinned = pinned;
    comment.updatedAt = Date.now();

    globalEventBus.emit({ type: 'community:commentPinned', payload: { commentId, pinned } });
    return true;
  }

  async likeComment(commentId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) return false;

    comment.likes++;
    globalEventBus.emit({ type: 'community:commentLiked', payload: commentId });
    return true;
  }

  async listAnnouncements(options?: {
    type?: AnnouncementType;
    isPinned?: boolean;
    isPublished?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ announcements: Announcement[]; total: number }> {
    let announcements = Array.from(this.announcements.values());

    if (options?.type) {
      announcements = announcements.filter((a) => a.type === options.type);
    }
    if (options?.isPinned !== undefined) {
      announcements = announcements.filter((a) => a.isPinned === options.isPinned);
    }
    if (options?.isPublished !== undefined) {
      announcements = announcements.filter((a) => a.isPublished === options.isPublished);
    }

    const pinned = announcements.filter((a) => a.isPinned);
    const unpinned = announcements.filter((a) => !a.isPinned);
    pinned.sort((a, b) => b.createdAt - a.createdAt);
    unpinned.sort((a, b) => b.createdAt - a.createdAt);
    announcements = [...pinned, ...unpinned];

    const total = announcements.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    announcements = announcements.slice(start, start + pageSize);

    return { announcements, total };
  }

  getAnnouncement(announcementId: string): Announcement | undefined {
    const announcement = this.announcements.get(announcementId);
    if (announcement && announcement.isPublished) {
      announcement.viewCount++;
    }
    return announcement;
  }

  async createAnnouncement(options: {
    title: string;
    content: string;
    type: AnnouncementType;
    createdBy: string;
    isPinned?: boolean;
    publishNow?: boolean;
  }): Promise<Announcement> {
    const announcement: Announcement = {
      id: `a-${randomUUID().slice(0, 8)}`,
      title: options.title,
      content: options.content,
      type: options.type,
      isPinned: options.isPinned ?? false,
      viewCount: 0,
      createdBy: options.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      publishedAt: options.publishNow ? Date.now() : undefined,
      isPublished: options.publishNow ?? false,
    };

    this.announcements.set(announcement.id, announcement);
    globalEventBus.emit({ type: 'community:announcementCreated', payload: announcement });
    return announcement;
  }

  async updateAnnouncement(
    announcementId: string,
    updates: Partial<Announcement>
  ): Promise<Announcement | null> {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) return null;

    Object.assign(announcement, updates, { updatedAt: Date.now() });
    globalEventBus.emit({ type: 'community:announcementUpdated', payload: announcement });
    return announcement;
  }

  async deleteAnnouncement(announcementId: string): Promise<boolean> {
    const deleted = this.announcements.delete(announcementId);
    if (deleted) {
      globalEventBus.emit({ type: 'community:announcementDeleted', payload: announcementId });
    }
    return deleted;
  }

  async publishAnnouncement(announcementId: string): Promise<boolean> {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) return false;

    announcement.isPublished = true;
    announcement.publishedAt = Date.now();
    announcement.updatedAt = Date.now();

    globalEventBus.emit({ type: 'community:announcementPublished', payload: announcement });
    return true;
  }

  async pinAnnouncement(announcementId: string, pinned: boolean): Promise<boolean> {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) return false;

    announcement.isPinned = pinned;
    announcement.updatedAt = Date.now();

    globalEventBus.emit({
      type: 'community:announcementPinned',
      payload: { announcementId, pinned },
    });
    return true;
  }

  async listFeedbacks(options?: {
    category?: FeedbackCategory;
    status?: FeedbackStatus;
    priority?: FeedbackPriority;
    assignee?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ feedbacks: Feedback[]; total: number }> {
    let feedbacks = Array.from(this.feedbacks.values());

    if (options?.category) {
      feedbacks = feedbacks.filter((f) => f.category === options.category);
    }
    if (options?.status) {
      feedbacks = feedbacks.filter((f) => f.status === options.status);
    }
    if (options?.priority) {
      feedbacks = feedbacks.filter((f) => f.priority === options.priority);
    }
    if (options?.assignee) {
      feedbacks = feedbacks.filter((f) => f.assignee === options.assignee);
    }

    feedbacks.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt - a.createdAt;
    });

    const total = feedbacks.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    feedbacks = feedbacks.slice(start, start + pageSize);

    return { feedbacks, total };
  }

  getFeedback(feedbackId: string): Feedback | undefined {
    return this.feedbacks.get(feedbackId);
  }

  async createFeedback(options: {
    title: string;
    content: string;
    category: FeedbackCategory;
    authorId: string;
    authorName: string;
    authorContact?: string;
    priority?: FeedbackPriority;
    tags?: string[];
    screenshots?: string[];
  }): Promise<Feedback> {
    const feedback: Feedback = {
      id: `f-${randomUUID().slice(0, 8)}`,
      title: options.title,
      content: options.content,
      category: options.category,
      status: 'open',
      priority: options.priority ?? 'medium',
      authorId: options.authorId,
      authorName: options.authorName,
      authorContact: options.authorContact,
      tags: options.tags ?? [],
      screenshots: options.screenshots ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.feedbacks.set(feedback.id, feedback);
    globalEventBus.emit({ type: 'community:feedbackCreated', payload: feedback });
    return feedback;
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    resolution?: string
  ): Promise<boolean> {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return false;

    feedback.status = status;
    feedback.updatedAt = Date.now();
    if (resolution) {
      feedback.resolution = resolution;
    }
    if (status === 'resolved') {
      feedback.resolvedAt = Date.now();
    }

    globalEventBus.emit({
      type: 'community:feedbackStatusUpdated',
      payload: { feedbackId, status },
    });
    return true;
  }

  async assignFeedback(feedbackId: string, assignee: string): Promise<boolean> {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return false;

    feedback.assignee = assignee;
    feedback.updatedAt = Date.now();

    globalEventBus.emit({ type: 'community:feedbackAssigned', payload: { feedbackId, assignee } });
    return true;
  }

  async listFAQs(options?: {
    category?: string;
    search?: string;
    isPublished?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ faqs: FAQ[]; total: number }> {
    let faqs = Array.from(this.faqs.values());

    if (options?.category) {
      faqs = faqs.filter((f) => f.category === options.category);
    }
    if (options?.isPublished !== undefined) {
      faqs = faqs.filter((f) => f.isPublished === options.isPublished);
    }
    if (options?.search) {
      const keyword = options.search.toLowerCase();
      faqs = faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(keyword) ||
          f.answer.toLowerCase().includes(keyword) ||
          f.tags.some((t) => t.toLowerCase().includes(keyword))
      );
    }

    faqs.sort((a, b) => a.sortOrder - b.sortOrder);

    const total = faqs.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    faqs = faqs.slice(start, start + pageSize);

    return { faqs, total };
  }

  getFAQ(faqId: string): FAQ | undefined {
    const faq = this.faqs.get(faqId);
    if (faq) {
      faq.viewCount++;
    }
    return faq;
  }

  async createFAQ(options: {
    question: string;
    answer: string;
    category: string;
    tags?: string[];
    sortOrder?: number;
  }): Promise<FAQ> {
    const faq: FAQ = {
      id: `faq-${randomUUID().slice(0, 8)}`,
      question: options.question,
      answer: options.answer,
      category: options.category,
      tags: options.tags ?? [],
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      sortOrder: options.sortOrder ?? 999,
      isPublished: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.faqs.set(faq.id, faq);
    globalEventBus.emit({ type: 'community:faqCreated', payload: faq });
    return faq;
  }

  async updateFAQ(faqId: string, updates: Partial<FAQ>): Promise<FAQ | null> {
    const faq = this.faqs.get(faqId);
    if (!faq) return null;

    Object.assign(faq, updates, { updatedAt: Date.now() });
    globalEventBus.emit({ type: 'community:faqUpdated', payload: faq });
    return faq;
  }

  async deleteFAQ(faqId: string): Promise<boolean> {
    const deleted = this.faqs.delete(faqId);
    if (deleted) {
      globalEventBus.emit({ type: 'community:faqDeleted', payload: faqId });
    }
    return deleted;
  }

  async markFAQHelpful(faqId: string, helpful: boolean): Promise<boolean> {
    const faq = this.faqs.get(faqId);
    if (!faq) return false;

    if (helpful) {
      faq.helpfulCount++;
    } else {
      faq.notHelpfulCount++;
    }

    return true;
  }

  listCommentTags(): string[] {
    return COMMENT_TAGS;
  }

  listFeedbackTags(): string[] {
    return FEEDBACK_TAGS;
  }

  listFAQCategories(): string[] {
    return FAQ_CATEGORIES;
  }

  listAnnouncementTypes(): { type: AnnouncementType; label: string }[] {
    return [
      { type: 'update', label: '更新公告' },
      { type: 'event', label: '活动公告' },
      { type: 'maintenance', label: '维护公告' },
      { type: 'system', label: '系统公告' },
    ];
  }

  listFeedbackCategories(): { category: FeedbackCategory; label: string }[] {
    return [
      { category: 'bug', label: 'Bug反馈' },
      { category: 'suggestion', label: '功能建议' },
      { category: 'experience', label: '体验问题' },
      { category: 'other', label: '其他' },
    ];
  }

  async getStats(): Promise<CommunityStats> {
    const comments = Array.from(this.comments.values());
    const announcements = Array.from(this.announcements.values());
    const feedbacks = Array.from(this.feedbacks.values());

    return {
      totalComments: comments.filter((c) => c.status !== 'deleted').length,
      pendingComments: comments.filter((c) => c.status === 'pending').length,
      totalAnnouncements: announcements.length,
      totalFeedbacks: feedbacks.length,
      openFeedbacks: feedbacks.filter((f) => f.status === 'open' || f.status === 'processing')
        .length,
      totalFAQs: this.faqs.size,
      announcementViews: announcements.reduce((sum, a) => sum + a.viewCount, 0),
    };
  }
}

export const communityService = new CommunityService();
