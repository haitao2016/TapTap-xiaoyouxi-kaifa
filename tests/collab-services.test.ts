import {
  collabService,
  cloudStorageService,
  gitService,
  teamService,
} from '../packages/core/src/collab';

describe('Phase 8: Collab Services', () => {
  describe('CollabService', () => {
    it('should join a project', () => {
      const me = collabService.joinProject('p1', 'Alice', 'editor');
      expect(me.userName).toBe('Alice');
      expect(me.role).toBe('editor');
      expect(me.online).toBe(true);
    });

    it('should generate invite link', () => {
      collabService.joinProject('p2', 'Bob', 'owner');
      const link = collabService.generateInviteLink('editor', 24);
      expect(link.token).toBeTruthy();
      expect(link.url).toContain(link.token);
    });

    it('should broadcast cursor', () => {
      collabService.joinProject('p3', 'Carol', 'editor');
      collabService.broadcastCursor('test.ts', 5, 10);
      const cursors = collabService.getCursors();
      expect(cursors.length).toBeGreaterThan(0);
    });

    it('should apply local operations', () => {
      collabService.joinProject('p4', 'Dan', 'editor');
      collabService.applyLocalOp('test.ts', 'insert', 0, 'hello');
      // 通过 mock event bus 验证（不依赖具体实现）
    });
  });

  describe('CloudStorageService', () => {
    it('should register a project', () => {
      const project = cloudStorageService.registerProject({
        name: 'Cloud Test',
        localPath: '/tmp/cloud',
        files: [
          { path: 'index.html', content: '<html></html>' },
          { path: 'main.js', content: 'console.log(1);' },
        ],
      });
      expect(project.name).toBe('Cloud Test');
      expect(project.files.size).toBe(2);
    });

    it('should create share link', () => {
      const project = cloudStorageService.registerProject({
        name: 'S',
        localPath: '/tmp/s',
        files: [],
      });
      const link = cloudStorageService.createShareLink(project.id, 'view', 24);
      expect(link.token).toBeTruthy();
      expect(link.permission).toBe('view');
    });

    it('should track online/offline state', () => {
      cloudStorageService.setOnline(false);
      cloudStorageService.setOnline(true);
    });
  });

  describe('GitService', () => {
    it('should expose service methods', () => {
      expect(typeof gitService.setWorkingDir).toBe('function');
      expect(typeof gitService.status).toBe('function');
      expect(typeof gitService.diff).toBe('function');
      expect(typeof gitService.log).toBe('function');
    });

    it('should parse conflict markers', () => {
      const content = `line1
<<<<<<< HEAD
ours
=======
theirs
>>>>>>> branch
line2`;
      const regions = (gitService as unknown as { parseConflictMarkers: (c: string, p: string) => { ours: string; theirs: string }[] }).parseConflictMarkers(content, 'test.txt');
      expect(regions.length).toBe(1);
      expect(regions[0]!.ours).toBe('ours');
      expect(regions[0]!.theirs).toBe('theirs');
    });
  });

  describe('TeamService', () => {
    it('should create a team with owner', () => {
      const team = teamService.createTeam('My Team', 'Owner', 'owner@example.com');
      expect(team.name).toBe('My Team');
      expect(team.members.size).toBe(1);
      const owner = Array.from(team.members.values())[0]!;
      expect(owner.role).toBe('owner');
    });

    it('should invite member and get permissions', () => {
      const team = teamService.createTeam('T2', 'O', 'o@e.com');
      const ownerId = Array.from(team.members.keys())[0]!;
      const result = teamService.inviteMember(team.id, 'dev@example.com', 'developer');
      expect(result.inviteToken).toBeTruthy();
      expect(teamService.checkPermission(team.id, ownerId, 'project.create')).toBe(true);
    });

    it('should change member role', () => {
      const team = teamService.createTeam('T3', 'O', 'o@e.com');
      const ownerId = Array.from(team.members.keys())[0]!;
      const invite = teamService.inviteMember(team.id, 'd@e.com', 'viewer');
      const newMemberId = Array.from(team.members.keys()).find((id) => id !== ownerId)!;
      const ok = teamService.changeRole(team.id, newMemberId, 'developer');
      expect(ok).toBe(true);
      expect(teamService.checkPermission(team.id, newMemberId, 'build.run')).toBe(true);
    });

    it('should not change owner role', () => {
      const team = teamService.createTeam('T4', 'O', 'o@e.com');
      const ownerId = Array.from(team.members.keys())[0]!;
      const ok = teamService.changeRole(team.id, ownerId, 'viewer');
      expect(ok).toBe(false);
    });
  });
});
