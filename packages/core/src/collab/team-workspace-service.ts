/**
 * 团队工作空间服务
 * - 团队成员管理
 * - 项目所有权和共享
 * - 角色权限（owner / developer / viewer）
 */
import { globalEventBus } from '../event-bus';
import { randomUUID } from 'node:crypto';

export type TeamRole = 'owner' | 'admin' | 'developer' | 'viewer';

export type Permission =
  | 'project.create'
  | 'project.delete'
  | 'project.edit'
  | 'project.view'
  | 'member.invite'
  | 'member.remove'
  | 'member.role-change'
  | 'billing.manage'
  | 'build.run'
  | 'build.publish';

const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    'project.create', 'project.delete', 'project.edit', 'project.view',
    'member.invite', 'member.remove', 'member.role-change',
    'billing.manage', 'build.run', 'build.publish',
  ],
  admin: [
    'project.create', 'project.delete', 'project.edit', 'project.view',
    'member.invite', 'member.remove', 'build.run', 'build.publish',
  ],
  developer: ['project.create', 'project.edit', 'project.view', 'build.run'],
  viewer: ['project.view'],
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

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: Map<string, TeamMember>;
  projects: string[];
  createdAt: number;
  plan: 'free' | 'pro' | 'enterprise';
}

export class TeamService {
  private teams = new Map<string, Team>();
  private activeTeamId: string | null = null;

  createTeam(name: string, ownerName: string, ownerEmail: string): Team {
    const teamId = randomUUID();
    const ownerId = randomUUID();
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
            status: 'active',
          },
        ],
      ]),
      projects: [],
      createdAt: Date.now(),
      plan: 'free',
    };
    this.teams.set(teamId, team);
    this.activeTeamId = teamId;
    globalEventBus.emit({ type: 'team:created', payload: team });
    return team;
  }

  getActiveTeam(): Team | null {
    return this.activeTeamId ? this.teams.get(this.activeTeamId) ?? null : null;
  }

  switchTeam(id: string): void {
    if (this.teams.has(id)) this.activeTeamId = id;
  }

  inviteMember(teamId: string, email: string, role: TeamRole): { inviteToken: string; url: string } {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('团队不存在');
    const memberId = randomUUID();
    team.members.set(memberId, {
      userId: memberId,
      userName: email.split('@')[0],
      email,
      role,
      joinedAt: Date.now(),
      status: 'pending',
    });
    const inviteToken = randomUUID();
    return {
      inviteToken,
      url: `https://studio.tapdev.cn/invite/${inviteToken}`,
    };
  }

  acceptInvite(inviteToken: string, userName: string): boolean {
    // 实际应从后端验证
    const team = this.getActiveTeam();
    if (!team) return false;
    for (const m of team.members.values()) {
      if (m.status === 'pending' && m.userName === userName) {
        m.status = 'active';
        globalEventBus.emit({ type: 'team:member-joined', payload: m });
        return true;
      }
    }
    return false;
  }

  removeMember(teamId: string, userId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const member = team.members.get(userId);
    if (!member || member.role === 'owner') return false;
    team.members.delete(userId);
    globalEventBus.emit({ type: 'team:member-removed', payload: { teamId, userId } });
    return true;
  }

  changeRole(teamId: string, userId: string, newRole: TeamRole): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    const member = team.members.get(userId);
    if (!member) return false;
    if (member.role === 'owner') return false; // 不可修改 owner 角色
    member.role = newRole;
    globalEventBus.emit({ type: 'team:role-changed', payload: { teamId, userId, newRole } });
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

  listMembers(teamId: string): TeamMember[] {
    const team = this.teams.get(teamId);
    return team ? Array.from(team.members.values()) : [];
  }
}

export const teamService = new TeamService();
