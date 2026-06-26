// 企业版工作空间
// 组织架构、RBAC、SSO、审计日志、私有化部署

import { globalEventBus } from '../core/event-bus';

// 组织
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'team' | 'enterprise' | 'custom';
  ssoEnabled: boolean;
  ssoConfig?: {
    type: 'saml' | 'oidc' | 'ldap';
    metadata?: string;
    clientId?: string;
    issuer?: string;
  };
  auditLogEnabled: boolean;
  dataRetention: number; // 天
  privateDeployment: boolean;
  createdAt: number;
  // 计费
  billing: {
    seats: number;
    storageGB: number;
    bandwidthGB: number;
    renewalDate: number;
  };
  // SLA
  sla: {
    uptime: number; // 百分比
    supportResponse: number; // 小时
    dedicatedManager: boolean;
  };
  settings: {
    allowedDomains: string[];
    passwordPolicy: {
      minLength: number;
      requireUpper: boolean;
      requireNumber: boolean;
      requireSpecial: boolean;
    };
    twoFactorRequired: boolean;
    ipWhitelist?: string[];
  };
}

// 部门
export interface Department {
  id: string;
  orgId: string;
  name: string;
  parentId?: string;
  managerId: string;
  memberIds: string[];
}

// 用户
export interface EnterpriseUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  departmentIds: string[];
  roleIds: string[];
  status: 'active' | 'invited' | 'suspended' | 'deactivated';
  twoFactorEnabled: boolean;
  ssoLinked: boolean;
  joinedAt: number;
  lastActiveAt?: number;
  // 个人配额
  quota: {
    projects: number;
    storageGB: number;
    bandwidthGB: number;
  };
}

// 角色
export interface EnterpriseRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  // 继承
  inheritsFrom?: string[];
}

// 权限
export type Permission =
  | 'project:create' | 'project:delete' | 'project:read' | 'project:update'
  | 'project:build' | 'project:deploy' | 'project:share'
  | 'asset:upload' | 'asset:delete' | 'asset:share'
  | 'team:invite' | 'team:remove' | 'team:manage'
  | 'org:settings' | 'org:billing' | 'org:audit'
  | 'plugin:install' | 'plugin:publish'
  | 'analytics:view' | 'analytics:export';

// 审计日志
export interface AuditLog {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  resource: { type: string; id: string; name: string };
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  result: 'success' | 'failure';
  riskLevel: 'low' | 'medium' | 'high';
}

class EnterpriseWorkspaceService {
  private orgs = new Map<string, Organization>();
  private departments = new Map<string, Department>();
  private users = new Map<string, EnterpriseUser>();
  private roles = new Map<string, EnterpriseRole>();
  private auditLogs: AuditLog[] = [];
  private currentOrgId: string | null = null;
  private currentUserId: string | null = null;
  private listeners = new Set<(event: string, data: any) => void>();

  constructor() {
    this.registerSystemRoles();
  }

  // 注册系统角色
  private registerSystemRoles(): void {
    const systemRoles: EnterpriseRole[] = [
      {
        id: 'org-admin',
        name: '组织管理员',
        description: '拥有组织的所有权限',
        permissions: [
          'project:create', 'project:delete', 'project:read', 'project:update',
          'project:build', 'project:deploy', 'project:share',
          'asset:upload', 'asset:delete', 'asset:share',
          'team:invite', 'team:remove', 'team:manage',
          'org:settings', 'org:billing', 'org:audit',
          'plugin:install', 'plugin:publish',
          'analytics:view', 'analytics:export'
        ],
        isSystem: true
      },
      {
        id: 'project-manager',
        name: '项目经理',
        description: '管理项目和团队',
        permissions: [
          'project:create', 'project:read', 'project:update',
          'project:build', 'project:deploy', 'project:share',
          'asset:upload', 'asset:share',
          'team:invite', 'team:remove',
          'analytics:view', 'analytics:export'
        ],
        isSystem: true,
        inheritsFrom: []
      },
      {
        id: 'developer',
        name: '开发者',
        description: '标准开发权限',
        permissions: [
          'project:create', 'project:read', 'project:update',
          'project:build',
          'asset:upload',
          'plugin:install',
          'analytics:view'
        ],
        isSystem: true
      },
      {
        id: 'viewer',
        name: '访客',
        description: '只读访问',
        permissions: ['project:read', 'analytics:view'],
        isSystem: true
      }
    ];

    for (const role of systemRoles) {
      this.roles.set(role.id, role);
    }
  }

  // 创建组织
  createOrg(config: Omit<Organization, 'id' | 'createdAt' | 'auditLogEnabled' | 'privateDeployment' | 'sla' | 'settings'> & Partial<Pick<Organization, 'auditLogEnabled' | 'privateDeployment' | 'sla' | 'settings'>>): Organization {
    const org: Organization = {
      ...config,
      id: `org-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      auditLogEnabled: config.auditLogEnabled ?? true,
      privateDeployment: config.privateDeployment ?? false,
      sla: config.sla || { uptime: 99.9, supportResponse: 24, dedicatedManager: false },
      settings: config.settings || {
        allowedDomains: [],
        passwordPolicy: { minLength: 8, requireUpper: true, requireNumber: true, requireSpecial: false },
        twoFactorRequired: false
      }
    };
    this.orgs.set(org.id, org);
    this.currentOrgId = org.id;
    this.notify('org:created', org);
    return org;
  }

  // 邀请用户
  inviteUser(orgId: string, email: string, roleIds: string[]): EnterpriseUser {
    const user: EnterpriseUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email,
      name: email.split('@')[0],
      orgId,
      departmentIds: [],
      roleIds,
      status: 'invited',
      twoFactorEnabled: false,
      ssoLinked: false,
      joinedAt: Date.now(),
      quota: { projects: 10, storageGB: 10, bandwidthGB: 50 }
    };
    this.users.set(user.id, user);
    this.logAction(orgId, user.id, 'invite_user', { type: 'user', id: user.id, name: email }, { roleIds });
    this.notify('user:invited', user);
    return user;
  }

  // 分配角色
  assignRole(userId: string, roleId: string): void {
    const user = this.users.get(userId);
    if (!user) return;
    if (!user.roleIds.includes(roleId)) user.roleIds.push(roleId);
    this.logAction(user.orgId, this.currentUserId || userId, 'assign_role', { type: 'user', id: userId, name: user.email }, { roleId });
    this.notify('role:assigned', { userId, roleId });
  }

  // 移除角色
  removeRole(userId: string, roleId: string): void {
    const user = this.users.get(userId);
    if (!user) return;
    user.roleIds = user.roleIds.filter(r => r !== roleId);
    this.logAction(user.orgId, this.currentUserId || userId, 'remove_role', { type: 'user', id: userId, name: user.email }, { roleId });
  }

  // 检查权限
  hasPermission(userId: string, permission: Permission): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    for (const roleId of user.roleIds) {
      const role = this.roles.get(roleId);
      if (!role) continue;
      if (role.permissions.includes(permission)) return true;
      // 检查继承
      if (role.inheritsFrom) {
        for (const parentId of role.inheritsFrom) {
          const parent = this.roles.get(parentId);
          if (parent?.permissions.includes(permission)) return true;
        }
      }
    }
    return false;
  }

  // 创建部门
  createDepartment(orgId: string, name: string, parentId?: string, managerId?: string): Department {
    const dept: Department = {
      id: `dept-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orgId,
      name,
      parentId,
      managerId: managerId || '',
      memberIds: []
    };
    this.departments.set(dept.id, dept);
    this.notify('dept:created', dept);
    return dept;
  }

  // 添加部门成员
  addDepartmentMember(deptId: string, userId: string): void {
    const dept = this.departments.get(deptId);
    if (!dept) return;
    if (!dept.memberIds.includes(userId)) dept.memberIds.push(userId);
    const user = this.users.get(userId);
    if (user && !user.departmentIds.includes(deptId)) user.departmentIds.push(deptId);
  }

  // 启用 SSO
  enableSSO(orgId: string, config: Organization['ssoConfig']): void {
    const org = this.orgs.get(orgId);
    if (!org) return;
    org.ssoEnabled = true;
    org.ssoConfig = config;
    this.logAction(orgId, this.currentUserId || '', 'enable_sso', { type: 'org', id: orgId, name: org.name }, { type: config?.type });
  }

  // 审计日志
  logAction(
    orgId: string,
    userId: string,
    action: string,
    resource: AuditLog['resource'],
    details: Record<string, any> = {},
    result: 'success' | 'failure' = 'success',
    riskLevel: 'low' | 'medium' | 'high' = 'low'
  ): void {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orgId,
      userId,
      action,
      resource,
      details,
      ipAddress: '0.0.0.0', // 实际应从请求获取
      userAgent: navigator?.userAgent || '',
      timestamp: Date.now(),
      result,
      riskLevel
    };
    this.auditLogs.push(log);
    this.notify('audit:logged', log);
  }

  // 查询审计日志
  queryAuditLogs(filter: { orgId?: string; userId?: string; action?: string; startTime?: number; endTime?: number; limit?: number }): AuditLog[] {
    let logs = this.auditLogs;
    if (filter.orgId) logs = logs.filter(l => l.orgId === filter.orgId);
    if (filter.userId) logs = logs.filter(l => l.userId === filter.userId);
    if (filter.action) logs = logs.filter(l => l.action === filter.action);
    if (filter.startTime) logs = logs.filter(l => l.timestamp >= filter.startTime!);
    if (filter.endTime) logs = logs.filter(l => l.timestamp <= filter.endTime!);
    if (filter.limit) logs = logs.slice(-filter.limit);
    return logs;
  }

  // 导出审计报告
  exportAuditReport(orgId: string, timeRange: { start: number; end: number }): string {
    const logs = this.queryAuditLogs({ orgId, startTime: timeRange.start, endTime: timeRange.end });
    const csv = ['时间,用户,操作,资源,结果,风险级别'];
    for (const log of logs) {
      const user = this.users.get(log.userId);
      csv.push(`${new Date(log.timestamp).toISOString()},${user?.email || log.userId},${log.action},${log.resource.name},${log.result},${log.riskLevel}`);
    }
    return csv.join('\n');
  }

  // 创建自定义角色
  createCustomRole(name: string, description: string, permissions: Permission[], inheritsFrom?: string[]): EnterpriseRole {
    const role: EnterpriseRole = {
      id: `role-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      description,
      permissions,
      isSystem: false,
      inheritsFrom
    };
    this.roles.set(role.id, role);
    return role;
  }

  // 配置私有化部署
  configurePrivateDeployment(orgId: string, config: { region: string; endpoint: string; ssl: boolean }): void {
    const org = this.orgs.get(orgId);
    if (!org) return;
    org.privateDeployment = true;
    this.logAction(orgId, this.currentUserId || '', 'configure_private_deployment', { type: 'org', id: orgId, name: org.name }, config);
  }

  // 升级计划
  upgradePlan(orgId: string, plan: Organization['plan']): void {
    const org = this.orgs.get(orgId);
    if (!org) return;
    const oldPlan = org.plan;
    org.plan = plan;
    if (plan === 'enterprise') {
      org.sla = { uptime: 99.99, supportResponse: 1, dedicatedManager: true };
    }
    this.logAction(orgId, this.currentUserId || '', 'upgrade_plan', { type: 'org', id: orgId, name: org.name }, { from: oldPlan, to: plan });
  }

  // 列出用户
  listUsers(orgId: string, filter?: { status?: EnterpriseUser['status']; departmentId?: string }): EnterpriseUser[] {
    let users = Array.from(this.users.values()).filter(u => u.orgId === orgId);
    if (filter?.status) users = users.filter(u => u.status === filter.status);
    if (filter?.departmentId) users = users.filter(u => u.departmentIds.includes(filter.departmentId!));
    return users;
  }

  // 列出角色
  listRoles(): EnterpriseRole[] {
    return Array.from(this.roles.values());
  }

  // 列出部门
  listDepartments(orgId: string): Department[] {
    return Array.from(this.departments.values()).filter(d => d.orgId === orgId);
  }

  // 获取组织
  getOrg(orgId: string): Organization | undefined {
    return this.orgs.get(orgId);
  }

  // 获取用户
  getUser(userId: string): EnterpriseUser | undefined {
    return this.users.get(userId);
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const enterpriseWorkspaceService = new EnterpriseWorkspaceService();
