import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { achievementLeaderboardService } from '../packages/core/src/platform/achievement-leaderboard-service';
import { communityService } from '../packages/core/src/platform/community-service';
import { tapDBService } from '../packages/core/src/platform/tapdb-service';

describe('Phase 3: Platform Services Extended', () => {
  describe('AchievementLeaderboardService', () => {
    it('should list achievements', async () => {
      const result = await achievementLeaderboardService.listAchievements();
      expect(Array.isArray(result.achievements)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should get achievement by id', async () => {
      const list = await achievementLeaderboardService.listAchievements();
      if (list.achievements.length > 0) {
        const ach = achievementLeaderboardService.getAchievement(list.achievements[0].id);
        expect(ach).toBeDefined();
      }
    });

    it('should create an achievement', async () => {
      const ach = await achievementLeaderboardService.createAchievement({
        name: 'Test Achievement',
        description: 'A test achievement',
        type: 'normal',
        rarity: 'common',
        icon: 'trophy',
        category: 'test',
        points: 100,
        conditions: [{ type: 'score', target: 1000 }],
        rewards: [{ type: 'coins', amount: 100 }],
        hidden: false,
        sortOrder: 0,
        isActive: true,
      });
      expect(ach).toBeDefined();
      expect(ach.name).toBe('Test Achievement');
    });

    it('should update an achievement', async () => {
      const ach = await achievementLeaderboardService.createAchievement({
        name: 'To Update',
        description: 'will be updated',
        type: 'normal',
        rarity: 'common',
        icon: 'star',
        category: 'test',
        points: 50,
        conditions: [{ type: 'score', target: 100 }],
        rewards: [],
        hidden: false,
        sortOrder: 1,
        isActive: true,
      });
      const updated = await achievementLeaderboardService.updateAchievement(ach.id, {
        name: 'Updated Name',
      });
      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete an achievement', async () => {
      const ach = await achievementLeaderboardService.createAchievement({
        name: 'To Delete',
        description: 'will be deleted',
        type: 'normal',
        rarity: 'common',
        icon: 'trash',
        category: 'test',
        points: 10,
        conditions: [{ type: 'score', target: 10 }],
        rewards: [],
        hidden: false,
        sortOrder: 2,
        isActive: true,
      });
      const result = await achievementLeaderboardService.deleteAchievement(ach.id);
      expect(result).toBe(true);
      expect(achievementLeaderboardService.getAchievement(ach.id)).toBeUndefined();
    });

    it('should list achievement categories', () => {
      const cats = achievementLeaderboardService.getAchievementCategories();
      expect(Array.isArray(cats)).toBe(true);
    });

    it('should return rarity color', () => {
      const color = achievementLeaderboardService.getAchievementRarityColor('legendary');
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });

    it('should list leaderboards', async () => {
      const result = await achievementLeaderboardService.listLeaderboards();
      expect(Array.isArray(result.leaderboards)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should create a leaderboard', async () => {
      const lb = await achievementLeaderboardService.createLeaderboard({
        name: 'Test Leaderboard',
        description: 'test',
        type: 'score',
        order: 'desc',
        category: 'test',
        resetPeriod: 'weekly',
      });
      expect(lb).toBeDefined();
      expect(lb.name).toBe('Test Leaderboard');
    });

    it('should get leaderboard config', async () => {
      const lb = await achievementLeaderboardService.createLeaderboard({
        name: 'Config Test',
        description: 'config test',
        type: 'score',
        order: 'desc',
        category: 'test',
        resetPeriod: 'never',
      });
      const config = achievementLeaderboardService.getLeaderboardConfig(lb.id);
      expect(config).toBeDefined();
    });

    it('should submit score and get leaderboard', async () => {
      const lb = await achievementLeaderboardService.createLeaderboard({
        name: 'Score Test',
        description: 'score test',
        type: 'score',
        order: 'desc',
        category: 'test',
        resetPeriod: 'never',
      });
      await achievementLeaderboardService.submitScore(lb.id, 'player1', 1000, 'Player One');
      await achievementLeaderboardService.submitScore(lb.id, 'player2', 500, 'Player Two');
      const board = await achievementLeaderboardService.getLeaderboard(lb.id);
      expect(board.entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should get player rank', async () => {
      const lb = await achievementLeaderboardService.createLeaderboard({
        name: 'Rank Test',
        description: 'rank test',
        type: 'score',
        order: 'desc',
        category: 'test',
        resetPeriod: 'never',
      });
      await achievementLeaderboardService.submitScore(lb.id, 'player1', 100, 'P1');
      await achievementLeaderboardService.submitScore(lb.id, 'player2', 200, 'P2');
      const rank = await achievementLeaderboardService.getPlayerRank(lb.id, 'player2');
      expect(rank).not.toBeNull();
      if (rank) {
        expect(typeof rank.rank).toBe('number');
        expect(rank.rank).toBeGreaterThanOrEqual(1);
      }
    });

    it('should get top N entries', async () => {
      const lb = await achievementLeaderboardService.createLeaderboard({
        name: 'TopN Test',
        description: 'top n test',
        type: 'score',
        order: 'desc',
        category: 'test',
        resetPeriod: 'never',
      });
      for (let i = 0; i < 10; i++) {
        await achievementLeaderboardService.submitScore(lb.id, `p${i}`, i * 100, `P${i}`);
      }
      const top3 = await achievementLeaderboardService.getTopN(lb.id, 3);
      expect(top3.length).toBe(3);
    });

    it('should list leaderboard categories', () => {
      const cats = achievementLeaderboardService.getLeaderboardCategories();
      expect(Array.isArray(cats)).toBe(true);
    });

    it('should unlock achievement for user', async () => {
      const ach = await achievementLeaderboardService.createAchievement({
        name: 'Unlock Test',
        description: 'unlock test',
        type: 'normal',
        rarity: 'common',
        icon: 'lock',
        category: 'test',
        points: 50,
        conditions: [{ type: 'score', target: 100 }],
        rewards: [],
        hidden: false,
        sortOrder: 3,
        isActive: true,
      });
      const result = await achievementLeaderboardService.unlockAchievement('user1', ach.id);
      expect(result).toBeDefined();
    });
  });

  describe('CommunityService', () => {
    it('should list comments', async () => {
      const result = await communityService.listComments();
      expect(Array.isArray(result.comments)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should create a comment', async () => {
      const comment = await communityService.createComment({
        content: 'Great game!',
        authorId: 'user1',
        authorName: 'TestUser',
        targetId: 'game1',
        targetType: 'game',
        rating: 5,
      });
      expect(comment).toBeDefined();
      expect(comment.content).toBe('Great game!');
    });

    it('should get comment by id', async () => {
      const c = await communityService.createComment({
        content: 'test comment',
        authorId: 'u1',
        authorName: 'U1',
        targetId: 'g1',
        targetType: 'game',
      });
      const found = communityService.getComment(c.id);
      expect(found).toBeDefined();
    });

    it('should approve a comment', async () => {
      const c = await communityService.createComment({
        content: 'pending comment',
        authorId: 'u1',
        authorName: 'U1',
        targetId: 'g1',
        targetType: 'game',
      });
      const result = await communityService.approveComment(c.id);
      expect(result).toBe(true);
      const approved = communityService.getComment(c.id);
      expect(approved?.status).toBe('approved');
    });

    it('should reject a comment', async () => {
      const c = await communityService.createComment({
        content: 'bad comment',
        authorId: 'u1',
        authorName: 'U1',
        targetId: 'g1',
        targetType: 'game',
      });
      const result = await communityService.rejectComment(c.id, 'inappropriate');
      expect(result).toBe(true);
    });

    it('should delete a comment', async () => {
      const c = await communityService.createComment({
        content: 'to delete',
        authorId: 'u1',
        authorName: 'U1',
        targetId: 'g1',
        targetType: 'game',
      });
      const result = await communityService.deleteComment(c.id);
      expect(result).toBe(true);
    });

    it('should like a comment', async () => {
      const c = await communityService.createComment({
        content: 'likeable',
        authorId: 'u1',
        authorName: 'U1',
        targetId: 'g1',
        targetType: 'game',
      });
      const before = communityService.getComment(c.id)?.likes || 0;
      await communityService.likeComment(c.id);
      const after = communityService.getComment(c.id)?.likes || 0;
      expect(after).toBe(before + 1);
    });

    it('should pin a comment', async () => {
      const c = await communityService.createComment({
        content: 'pin me',
        authorId: 'u1',
        authorName: 'U1',
        targetId: 'g1',
        targetType: 'game',
      });
      const result = await communityService.pinComment(c.id, true);
      expect(result).toBe(true);
      expect(communityService.getComment(c.id)?.isPinned).toBe(true);
    });

    it('should list announcements', async () => {
      const result = await communityService.listAnnouncements();
      expect(Array.isArray(result.announcements)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should create an announcement', async () => {
      const ann = await communityService.createAnnouncement({
        title: 'Test Announcement',
        content: 'Hello world',
        type: 'update',
        priority: 1,
      });
      expect(ann).toBeDefined();
      expect(ann.title).toBe('Test Announcement');
    });

    it('should publish an announcement', async () => {
      const ann = await communityService.createAnnouncement({
        title: 'Draft Announcement',
        content: 'draft',
        type: 'event',
        priority: 0,
      });
      const result = await communityService.publishAnnouncement(ann.id);
      expect(result).toBe(true);
    });

    it('should list feedbacks', async () => {
      const result = await communityService.listFeedbacks();
      expect(Array.isArray(result.feedbacks)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should create feedback', async () => {
      const fb = await communityService.createFeedback({
        title: 'Bug report',
        content: 'Found a bug',
        category: 'bug',
        priority: 'high',
        authorId: 'user1',
        authorName: 'Reporter',
      });
      expect(fb).toBeDefined();
      expect(fb.category).toBe('bug');
    });

    it('should update feedback status', async () => {
      const fb = await communityService.createFeedback({
        title: 'Status test',
        content: 'testing status',
        category: 'suggestion',
        priority: 'medium',
        authorId: 'u1',
        authorName: 'U1',
      });
      const result = await communityService.updateFeedbackStatus(fb.id, 'processing');
      expect(result).toBe(true);
    });

    it('should list FAQs', async () => {
      const result = await communityService.listFAQs();
      expect(Array.isArray(result.faqs)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should create an FAQ', async () => {
      const faq = await communityService.createFAQ({
        question: 'How to play?',
        answer: 'Just start playing!',
        category: 'beginner',
      });
      expect(faq).toBeDefined();
      expect(faq.question).toBe('How to play?');
    });

    it('should get community stats', async () => {
      const stats = await communityService.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalComments).toBe('number');
    });

    it('should list comment tags', () => {
      const tags = communityService.listCommentTags();
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should list FAQ categories', () => {
      const cats = communityService.listFAQCategories();
      expect(Array.isArray(cats)).toBe(true);
    });
  });

  describe('TapDBService', () => {
    it('should query data', async () => {
      const result = await tapDBService.query({
        appId: 'test-app',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        metrics: ['dau', 'new_users'],
        granularity: 'day',
        analysisType: 'trend',
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should list events', async () => {
      const events = await tapDBService.listEvents('test-app');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should get funnel analysis', async () => {
      const funnel = await tapDBService.getFunnel('test-app', ['launch', 'login', 'play']);
      expect(funnel).toBeDefined();
      expect(funnel.steps.length).toBeGreaterThanOrEqual(3);
    });

    it('should list segments', async () => {
      const segments = await tapDBService.listSegments('test-app');
      expect(Array.isArray(segments)).toBe(true);
    });

    it('should start and stop realtime monitor', () => {
      const callback = jest.fn();
      const unsubscribe = tapDBService.startRealtimeMonitor('test-app', callback);
      expect(typeof unsubscribe).toBe('function');
      tapDBService.stopRealtimeMonitor('test-app');
    });

    it('should create export task', async () => {
      const task = await tapDBService.createExportTask({
        appId: 'test-app',
        type: 'event',
        eventName: 'login',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      expect(task).toBeDefined();
      expect(task.id).toBeTruthy();
    });

    it('should get export task', async () => {
      const task = await tapDBService.createExportTask({
        appId: 'test-app',
        type: 'event',
        eventName: 'purchase',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      const found = tapDBService.getExportTask(task.id);
      expect(found).toBeDefined();
    });

    it('should list export tasks', async () => {
      await tapDBService.createExportTask({
        appId: 'test-app',
        type: 'event',
        eventName: 'e1',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      });
      const tasks = tapDBService.listExportTasks('test-app');
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should clear cache', () => {
      tapDBService.clearCache();
    });
  });
});
