import { globalEventBus } from './event-bus';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  avatar?: string;
  joinedAt: number;
  lastActive?: number;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdAt: number;
  updatedAt: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ProjectPermission {
  projectId: string;
  userId: string;
  permissions: string[];
}

export class TeamService {
  private currentTeam: Team | null = null;
  private permissions: Permission[] = [];
  private projectPermissions = new Map<string, ProjectPermission[]>();

  constructor() {
    this.loadDefaultPermissions();
  }

  getCurrentTeam(): Team | null {
    return this.currentTeam;
  }

  async setCurrentTeam(teamId: string): Promise<void> {
    await this.delay(500);

    this.currentTeam = {
      id: teamId,
      name: 'TapDev Team',
      description: 'TapDev Studio 开发团队',
      members: [
        {
          id: 'user-1',
          name: '管理员',
          email: 'admin@tapdev.io',
          role: 'owner',
          joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          lastActive: Date.now(),
        },
        {
          id: 'user-2',
          name: '开发者 A',
          email: 'dev-a@tapdev.io',
          role: 'member',
          joinedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
          lastActive: Date.now() - 2 * 60 * 60 * 1000,
        },
        {
          id: 'user-3',
          name: '开发者 B',
          email: 'dev-b@tapdev.io',
          role: 'member',
          joinedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
          lastActive: Date.now() - 5 * 60 * 60 * 1000,
        },
      ],
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    };

    globalEventBus.emit({ type: 'team:changed', payload: this.currentTeam });
  }

  async createTeam(name: string, description?: string): Promise<Team> {
    await this.delay(500);

    const team: Team = {
      id: `team-${Date.now()}`,
      name,
      description,
      members: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.currentTeam = team;
    globalEventBus.emit({ type: 'team:created', payload: team });

    return team;
  }

  async addMember(teamId: string, email: string, role: TeamMember['role']): Promise<TeamMember> {
    await this.delay(300);

    const member: TeamMember = {
      id: `user-${Date.now()}`,
      name: email.split('@')[0],
      email,
      role,
      joinedAt: Date.now(),
      lastActive: Date.now(),
    };

    if (this.currentTeam && this.currentTeam.id === teamId) {
      this.currentTeam.members.push(member);
      this.currentTeam.updatedAt = Date.now();
    }

    globalEventBus.emit({ type: 'team:memberAdded', payload: member });
    return member;
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    if (this.currentTeam && this.currentTeam.id === teamId) {
      this.currentTeam.members = this.currentTeam.members.filter((m) => m.id !== userId);
      this.currentTeam.updatedAt = Date.now();
    }

    globalEventBus.emit({ type: 'team:memberRemoved', payload: { teamId, userId } });
  }

  async updateMemberRole(teamId: string, userId: string, role: TeamMember['role']): Promise<void> {
    if (this.currentTeam && this.currentTeam.id === teamId) {
      const member = this.currentTeam.members.find((m) => m.id === userId);
      if (member) {
        member.role = role;
        this.currentTeam.updatedAt = Date.now();
      }
    }

    globalEventBus.emit({ type: 'team:memberRoleUpdated', payload: { teamId, userId, role } });
  }

  getPermissions(): Permission[] {
    return this.permissions;
  }

  getPermissionsByCategory(category: string): Permission[] {
    return this.permissions.filter((p) => p.category === category);
  }

  async setProjectPermissions(
    projectId: string,
    userId: string,
    permissions: string[]
  ): Promise<void> {
    const existing = this.projectPermissions.get(projectId) || [];
    const index = existing.findIndex((p) => p.userId === userId);

    if (index >= 0) {
      existing[index].permissions = permissions;
    } else {
      existing.push({ projectId, userId, permissions });
    }

    this.projectPermissions.set(projectId, existing);
    globalEventBus.emit({
      type: 'team:permissionsUpdated',
      payload: { projectId, userId, permissions },
    });
  }

  getProjectPermissions(projectId: string, userId: string): string[] {
    const permissions = this.projectPermissions.get(projectId) || [];
    const userPerm = permissions.find((p) => p.userId === userId);
    return userPerm?.permissions || [];
  }

  hasPermission(projectId: string, userId: string, permission: string): boolean {
    const userPermissions = this.getProjectPermissions(projectId, userId);
    return userPermissions.includes(permission);
  }

  async inviteMember(email: string, message?: string): Promise<void> {
    await this.delay(300);
    globalEventBus.emit({ type: 'team:invitationSent', payload: { email, message } });
  }

  private loadDefaultPermissions(): void {
    this.permissions = [
      { id: 'project-read', name: '读取项目', description: '查看项目内容', category: 'project' },
      { id: 'project-write', name: '编辑项目', description: '修改项目内容', category: 'project' },
      { id: 'project-delete', name: '删除项目', description: '删除项目', category: 'project' },
      { id: 'project-share', name: '分享项目', description: '邀请成员协作', category: 'project' },
      { id: 'build-run', name: '运行构建', description: '执行项目构建', category: 'build' },
      { id: 'build-config', name: '构建配置', description: '修改构建设置', category: 'build' },
      { id: 'debug-run', name: '调试运行', description: '启动调试会话', category: 'debug' },
      { id: 'plugin-install', name: '安装插件', description: '安装和管理插件', category: 'plugin' },
      { id: 'team-manage', name: '团队管理', description: '管理团队成员', category: 'team' },
      { id: 'team-invite', name: '邀请成员', description: '发送团队邀请', category: 'team' },
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const teamService = new TeamService();
