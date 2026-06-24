/**
 * 团队工作空间服务
 * - 团队成员管理
 * - 项目所有权和共享
 * - 角色权限（owner / developer / viewer）
 * - 工作空间设置
 * - 项目共享
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type TeamRole = 'owner' | 'admin' | 'developer' | 'viewer';

export type Permission =
  | 'project.create'
  | 'project.delete'
  | 'project.edit'
  | 'project.view'
  | 'project.share'
  | 'member.invite'
  | 'member.remove'
  | 'member.role-change'
  | 'billing.manage'
  | 'build.run'
  | 'build.publish'
  | 'workspace.settings'
  | 'workspace.view';

const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    'project.create',
    'project.delete',
    'project.edit',
    'project.view',
    'project.share',
    'member.invite',
    'member.remove',
    'member.role-change',
    'billing.manage',
    'build.run',
    'build.publish',
    'workspace.settings',
    'workspace.view',
  ],
  admin: [
    'project.create',
    'project.delete',
    'project.edit',
    'project.view',
    'project.share',
    'member.invite',
    'member.remove',
    'build.run',
    'build.publish',
    'workspace.settings',
    'workspace.view',
  ],
  developer: [
    'project.create',
    'project.edit',
    'project.view',
    'build.run',
    'workspace.view',
  ],
  viewer: ['project.view', 'workspace.view'],
};

export interface TeamMember {
  userId: string;
  userName: string;
  email: string;
  avatar?: string;
  role: TeamRole;
  joinedAt: number;
  lastActiveAt?: number;
  status: 'active' | 'pending' | 'suspended';
}

export interface TeamProject {
  projectId: string;
  name: string;
  ownerId: string;
  permissions: Map<string, TeamRole>;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceSettings {
  name: string;
  description?: string;
  avatar?: string;
  defaultRole: TeamRole;
  allowPublicProjects: boolean;
  maxMembers: number;
  allowedDomains?: string[];
  theme?: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    mentionsOnly: boolean;
  };
}

export interface Invitation {
  id: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  invitedAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: Map<string, TeamMember>;
  projects: Map<string, TeamProject>;
  invitations: Map<string, Invitation>;
  createdAt: number;
  plan: 'free' | 'pro' | 'enterprise';
  settings: WorkspaceSettings;
}

const DEFAULT_SETTINGS: WorkspaceSettings = {
  name: '',
  defaultRole: 'viewer',
  allowPublicProjects: true,
  maxMembers: 10,
  notifications: {
    email: true,
    push: true,
    mentionsOnly: false,
  },
};

export class TeamService {
  private teams = new Map<string, Team>();
  private activeTeamId: string | null = null;
  private currentUserId: string | null = null;

  createTeam(name: string, ownerName: string, ownerEmail: string): Team {
    const teamId = randomUUID();
    const ownerId = randomUUID();
    const settings: WorkspaceSettings = {
      ...DEFAULT_SETTINGS,
      name,
    };
    const team: Team = {
      id: teamId,
      name,
      members: new Map([
        [
          ownerId,
          {
            userId: ownerId,
            userName: ownerName,
            email: ownerEmail,
            role: 'owner',
            joinedAt: Date.now(),
            lastActiveAt: Date.now(),
            status: 'active',
          },
        ],
      ]),
      projects: new Map(),
      invitations: new Map(),
      createdAt: Date.now(),
      plan: 'free',
      settings,
    };
    this.teams.set(teamId, team);
    this.activeTeamId = teamId;
    this.currentUserId = ownerId;
    globalEventBus.emit({ type: 'team:created', payload: { teamId, name } });
    return team;
  }

  getActiveTeam(): Team | null {
    return this.activeTeamId ? this.teams.get(this.activeTeamId) ?? null : null;
  }

  getActiveTeamId(): string | null {
    return this.activeTeamId;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  switchTeam(id: string): boolean {
    if (this.teams.has(id)) {
      this.activeTeamId = id;
      globalEventBus.emit({ type: 'team:switched', payload: { teamId: id } });
      return true;
    }
    return false;
  }

  listTeams(): Team[] {
    return Array.from(this.teams.values());
  }

  updateTeam(teamId: string, updates: { name?: string; description?: string }): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    if (updates.name) {
      team.name = updates.name;
      team.settings.name = updates.name;
    }
    if (updates.description !== undefined) {
      team.description = updates.description;
    }
    globalEventBus.emit({ type: 'team:updated', payload: { teamId, updates } });
    return true;
  }

  getSettings(teamId: string): WorkspaceSettings | null {
    const team = this.teams.get(teamId);
    return team ? { ...team.settings } : null;
  }

  updateSettings(teamId: string, settings: Partial<WorkspaceSettings>): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    team.settings = {
      ...team.settings,
      ...settings,
      notifications: {
        ...team.settings.notifications,
        ...settings.notifications,
      },
    };
    globalEventBus.emit({ type: 'team:settings-updated', payload: { teamId, settings } });
    return true;
  }

  getPlan(teamId: string): Team['plan'] | null {
    const team = this.teams.get(teamId);
    return team ? team.plan : null;
  }

  upgradePlan(teamId: string, plan: Team['plan']): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    team.plan = plan;
    if (plan === 'pro') {
      team.settings.maxMembers = 50;
    } else if (plan === 'enterprise') {
      team.settings.maxMembers = 9999;
    }
    globalEventBus.emit({ type: 'team:plan-upgraded', payload: { teamId, plan } });
    return true;
  }

  inviteMember(
    teamId: string,
    email: string,
    role: TeamRole,
    options?: { invitedBy?: string; expiresInHours?: number },
  ): { invitationId: string; inviteToken: string; url: string } {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('团队不存在');
    if (team.members.size >= team.settings.maxMembers) {
      throw new Error('已达到团队成员上限');
    }
    const memberId = randomUUID();
    team.members.set(memberId, {
      userId: memberId,
      userName: email.split('@')[0],
      email,
      role,
      joinedAt: Date.now(),
      status: 'pending',
    });
    const invitationId = randomUUID();
    const expiresAt = Date.now() + (options?.expiresInHours ?? 72) * 3600_000;
    const invitation: Invitation = {
      id: invitationId,
      email,
      role,
      invitedBy: options?.invitedBy ?? this.currentUserId ?? '',
      invitedAt: Date.now(),
      expiresAt,
      status: 'pending',
    };
    team.invitations.set(invitationId, invitation);
    const inviteToken = randomUUID();
    globalEventBus.emit({
      type: 'team:invitation-sent',
      payload: { teamId, email, role, invitationId },
    });
    return {
      invitationId,
      inviteToken,
      url: `https://studio.tapdev.cn/invite/${inviteToken}`,
    };
  }

  acceptInvite(invitationId: string, userName: string, email: string): TeamMember | null {
    for (const team of this.teams.values()) {
      const invitation = team.invitations.get(invitationId);
      if (invitation && invitation.status === 'pending') {
        if (invitation.expiresAt < Date.now()) {
          invitation.status = 'expired';
          return null;
        }
        const userId = randomUUID();
        const member: TeamMember = {
          userId,
          userName,
          email,
          role: invitation.role,
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          status: 'active',
        };
        team.members.set(userId, member);
        invitation.status = 'accepted';
        this.activeTeamId = team.id;
        this.currentUserId = userId;
        globalEventBus.emit({ type: 'team:member-joined', payload: { teamId: team.id, member } });
        return member;
      }
    }
    return null;
  }

  declineInvite(invitationId: string): boolean {
    for (const team of this.teams.values()) {
      const invitation = team.invitations.get(invitationId);
      if (invitation && invitation.status === 'pending') {
        invitation.status = 'declined';
        globalEventBus.emit({
          type: 'team:invitation-declined',
          payload: { teamId: team.id, invitationId },
        });
        return true;
      }
    }
    return false;
  }

  listInvitations(teamId: string, status?: Invitation['status']): Invitation[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    let invitations = Array.from(team.invitations.values());
    if (status) {
      invitations = invitations.filter((i) => i.status === status);
    }
    return invitations;
  }

  cancelInvitation(teamId: string, invitationId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const invitation = team.invitations.get(invitationId);
    if (!invitation || invitation.status !== 'pending') return false;
    team.invitations.delete(invitationId);
    globalEventBus.emit({
      type: 'team:invitation-cancelled',
      payload: { teamId, invitationId },
    });
    return true;
  }

  removeMember(teamId: string, userId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const member = team.members.get(userId);
    if (!member || member.role === 'owner') return false;
    team.members.delete(userId);
    for (const project of team.projects.values()) {
      project.permissions.delete(userId);
    }
    globalEventBus.emit({ type: 'team:member-removed', payload: { teamId, userId } });
    return true;
  }

  changeRole(teamId: string, userId: string, newRole: TeamRole): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const member = team.members.get(userId);
    if (!member) return false;
    if (member.role === 'owner') return false;
    member.role = newRole;
    globalEventBus.emit({ type: 'team:role-changed', payload: { teamId, userId, newRole } });
    return true;
  }

  suspendMember(teamId: string, userId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const member = team.members.get(userId);
    if (!member || member.role === 'owner') return false;
    member.status = 'suspended';
    globalEventBus.emit({ type: 'team:member-suspended', payload: { teamId, userId } });
    return true;
  }

  reactivateMember(teamId: string, userId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const member = team.members.get(userId);
    if (!member) return false;
    member.status = 'active';
    globalEventBus.emit({ type: 'team:member-reactivated', payload: { teamId, userId } });
    return true;
  }

  checkPermission(teamId: string, userId: string, perm: Permission): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const member = team.members.get(userId);
    if (!member) return false;
    return ROLE_PERMISSIONS[member.role].includes(perm);
  }

  getRolePermissions(role: TeamRole): Permission[] {
    return [...ROLE_PERMISSIONS[role]];
  }

  listMembers(teamId: string, options?: { status?: TeamMember['status']; role?: TeamRole }): TeamMember[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    let members = Array.from(team.members.values());
    if (options?.status) {
      members = members.filter((m) => m.status === options.status);
    }
    if (options?.role) {
      members = members.filter((m) => m.role === options.role);
    }
    return members.sort((a, b) => a.joinedAt - b.joinedAt);
  }

  getMember(teamId: string, userId: string): TeamMember | null {
    const team = this.teams.get(teamId);
    return team ? team.members.get(userId) ?? null : null;
  }

  addProject(
    teamId: string,
    projectInfo: { projectId?: string; name: string; ownerId?: string; isPublic?: boolean },
  ): TeamProject | null {
    const team = this.teams.get(teamId);
    if (!team) return null;
    const projectId = projectInfo.projectId ?? randomUUID();
    const ownerId = projectInfo.ownerId ?? this.currentUserId ?? '';
    const permissions = new Map<string, TeamRole>();
    if (ownerId) {
      permissions.set(ownerId, 'owner');
    }
    const project: TeamProject = {
      projectId,
      name: projectInfo.name,
      ownerId,
      permissions,
      isPublic: projectInfo.isPublic ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    team.projects.set(projectId, project);
    globalEventBus.emit({ type: 'team:project-added', payload: { teamId, project } });
    return project;
  }

  removeProject(teamId: string, projectId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const deleted = team.projects.delete(projectId);
    if (deleted) {
      globalEventBus.emit({ type: 'team:project-removed', payload: { teamId, projectId } });
    }
    return deleted;
  }

  listProjects(teamId: string, userId?: string): TeamProject[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    let projects = Array.from(team.projects.values());
    if (userId) {
      projects = projects.filter((p) => p.isPublic || p.permissions.has(userId) || p.ownerId === userId);
    }
    return projects;
  }

  getProject(teamId: string, projectId: string): TeamProject | null {
    const team = this.teams.get(teamId);
    return team ? team.projects.get(projectId) ?? null : null;
  }

  updateProject(
    teamId: string,
    projectId: string,
    updates: { name?: string; isPublic?: boolean },
  ): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const project = team.projects.get(projectId);
    if (!project) return false;
    if (updates.name) project.name = updates.name;
    if (updates.isPublic !== undefined) project.isPublic = updates.isPublic;
    project.updatedAt = Date.now();
    globalEventBus.emit({
      type: 'team:project-updated',
      payload: { teamId, projectId, updates },
    });
    return true;
  }

  shareProject(
    teamId: string,
    projectId: string,
    userId: string,
    role: TeamRole,
  ): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const project = team.projects.get(projectId);
    if (!project) return false;
    if (!team.members.has(userId)) return false;
    project.permissions.set(userId, role);
    project.updatedAt = Date.now();
    globalEventBus.emit({
      type: 'team:project-shared',
      payload: { teamId, projectId, userId, role },
    });
    return true;
  }

  unshareProject(teamId: string, projectId: string, userId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const project = team.projects.get(projectId);
    if (!project) return false;
    const removed = project.permissions.delete(userId);
    if (removed) {
      project.updatedAt = Date.now();
      globalEventBus.emit({
        type: 'team:project-unshared',
        payload: { teamId, projectId, userId },
      });
    }
    return removed;
  }

  getProjectRole(teamId: string, projectId: string, userId: string): TeamRole | null {
    const team = this.teams.get(teamId);
    if (!team) return null;
    const project = team.projects.get(projectId);
    if (!project) return null;
    if (project.ownerId === userId) return 'owner';
    return project.permissions.get(userId) ?? null;
  }

  checkProjectPermission(
    teamId: string,
    projectId: string,
    userId: string,
    perm: Permission,
  ): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const project = team.projects.get(projectId);
    if (!project) return false;
    const member = team.members.get(userId);
    if (!member || member.status !== 'active') return false;
    if (project.isPublic && perm === 'project.view') return true;
    if (project.ownerId === userId) return true;
    const projectRole = project.permissions.get(userId);
    if (projectRole && ROLE_PERMISSIONS[projectRole].includes(perm)) {
      return true;
    }
    if (ROLE_PERMISSIONS[member.role].includes(perm)) {
      return true;
    }
    return false;
  }

  getProjectMembers(teamId: string, projectId: string): { member: TeamMember; role: TeamRole }[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    const project = team.projects.get(projectId);
    if (!project) return [];
    const result: { member: TeamMember; role: TeamRole }[] = [];
    for (const [userId, role] of project.permissions) {
      const member = team.members.get(userId);
      if (member) {
        result.push({ member, role });
      }
    }
    return result;
  }

  getOwner(teamId: string): TeamMember | null {
    const team = this.teams.get(teamId);
    if (!team) return null;
    for (const member of team.members.values()) {
      if (member.role === 'owner') return member;
    }
    return null;
  }

  transferOwnership(teamId: string, fromUserId: string, toUserId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const fromMember = team.members.get(fromUserId);
    const toMember = team.members.get(toUserId);
    if (!fromMember || !toMember || fromMember.role !== 'owner') return false;
    fromMember.role = 'admin';
    toMember.role = 'owner';
    globalEventBus.emit({
      type: 'team:ownership-transferred',
      payload: { teamId, fromUserId, toUserId },
    });
    return true;
  }

  deleteTeam(teamId: string): boolean {
    const deleted = this.teams.delete(teamId);
    if (deleted && this.activeTeamId === teamId) {
      this.activeTeamId = this.teams.keys().next().value ?? null;
    }
    globalEventBus.emit({ type: 'team:deleted', payload: { teamId } });
    return deleted;
  }

  getMemberCount(teamId: string): number {
    const team = this.teams.get(teamId);
    return team ? team.members.size : 0;
  }

  getActiveMemberCount(teamId: string): number {
    const team = this.teams.get(teamId);
    if (!team) return 0;
    let count = 0;
    for (const member of team.members.values()) {
      if (member.status === 'active') count++;
    }
    return count;
  }
}

export const teamService = new TeamService();
