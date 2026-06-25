import { useState, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Icon, Input, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@tapdev/ui';
import { collabService, cloudStorageService, teamService as _teamService } from '@tapdev/core';
import type { Collaborator, CloudProject, ShareLink } from '@tapdev/core';
import { useAppStore } from '../store/app-store';

const teamService = _teamService as any;

type TeamRole = 'owner' | 'admin' | 'developer' | 'viewer';

interface TeamMember {
  userId: string;
  userName: string;
  email: string;
  avatar?: string;
  role: TeamRole;
  joinedAt: number;
  lastActiveAt?: number;
  status: 'active' | 'pending' | 'suspended';
}

interface Team {
  id: string;
  name: string;
  description?: string;
  members: Map<string, TeamMember>;
  projects: string[];
  createdAt: number;
  plan: 'free' | 'pro' | 'enterprise';
}

export function CollabPage() {
  const { currentProject } = useAppStore();
  const [activeTab, setActiveTab] = useState('collaborators');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('developer');
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('开发者');

  useEffect(() => {
    if (currentProject) {
      const me = collabService.joinProject(currentProject.config.id, userName, 'owner');
      refreshCollaborators();
      refreshCloudProjects();
      refreshTeams();
    }
  }, [currentProject]);

  const refreshCollaborators = () => {
    const collabs = (collabService as any).project?.collaborators;
    setCollaborators(collabs ? Array.from(collabs.values()) : []);
  };

  const refreshCloudProjects = async () => {
    const projects = await cloudStorageService.listProjects();
    setCloudProjects(projects as any);
  };

  const refreshTeams = () => {
    const team = teamService.getActiveTeam();
    if (team) {
      setActiveTeam(team);
    }
  };

  const handleGenerateInvite = () => {
    const result = collabService.generateInviteLink('editor', 24);
    setShareLink(result as any);
  };

  const handleRegisterCloudProject = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const project = (cloudStorageService as any).registerProject({
        name: currentProject.config.name,
        localPath: currentProject.path,
        files: [],
      });
      await refreshCloudProjects();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = () => {
    const team = teamService.createTeam('我的团队', userName, 'dev@example.com');
    setActiveTeam(team);
  };

  const handleInviteMember = () => {
    if (!activeTeam || !inviteEmail) return;
    const result = teamService.inviteMember(activeTeam.id, inviteEmail, inviteRole);
    setInviteEmail('');
    refreshTeams();
  };

  const handleChangeRole = (userId: string, newRole: TeamRole) => {
    if (!activeTeam) return;
    teamService.changeRole(activeTeam.id, userId, newRole);
    refreshTeams();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-500';
      case 'pending-upload': return 'text-yellow-500';
      case 'pending-download': return 'text-blue-500';
      case 'conflict': return 'text-red-500';
      default: return 'text-text-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'synced': return '已同步';
      case 'pending-upload': return '待上传';
      case 'pending-download': return '待下载';
      case 'conflict': return '冲突';
      default: return status;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return <Badge variant="success">所有者</Badge>;
      case 'admin': return <Badge variant="default">管理员</Badge>;
      case 'developer': return <Badge variant="default">开发者</Badge>;
      case 'viewer': return <Badge variant="default">查看者</Badge>;
      default: return <Badge variant="default">{role}</Badge>;
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border px-4">
          <TabsList className="mt-2">
            <TabsTrigger value="collaborators">协作者</TabsTrigger>
            <TabsTrigger value="cloud">云端存储</TabsTrigger>
            <TabsTrigger value="team">团队空间</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="collaborators" className="mt-0">
          <div className="p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">协作者列表</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{collaborators.length} 人在线</Badge>
                      <Button size="sm" onClick={handleGenerateInvite}>
                        <Icon name="user-plus" size={14} /> 邀请协作
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {collaborators.map((collab) => (
                      <div
                        key={collab.userId}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: collab.color }}
                          >
                            {collab.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{collab.userName}</div>
                            <div className="text-xs text-text-muted">
                              {collab.email || '本地用户'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(collab.role)}
                          <div className={`w-2 h-2 rounded-full ${collab.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>
                      </div>
                    ))}
                    {collaborators.length === 0 && (
                      <div className="text-center text-text-muted py-8">
                        暂无协作者，点击上方按钮邀请
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {shareLink && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">邀请链接</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs break-all">
                      {shareLink.url}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">
                        有效期至: {formatDate(shareLink.expiresAt)}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(shareLink.url)}>
                          <Icon name="copy" size={14} /> 复制
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">协作设置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-text-secondary">您的昵称</label>
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="输入您的昵称"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-2 rounded-lg p-3">
                      <div className="text-sm font-medium">实时光标</div>
                      <div className="text-xs text-text-muted mt-1">显示其他协作者的光标位置</div>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3">
                      <div className="text-sm font-medium">自动同步</div>
                      <div className="text-xs text-text-muted mt-1">自动保存并同步更改</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cloud" className="mt-0">
          <div className="p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">云端项目</h2>
                <Button onClick={handleRegisterCloudProject} disabled={isLoading || !currentProject}>
                  <Icon name="cloud-upload" size={14} /> 同步到云端
                </Button>
              </div>

              {cloudProjects.length > 0 ? (
                <div className="space-y-3">
                  {cloudProjects.map((project) => (
                    <Card key={project.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon name="cloud" size={20} className="text-tap-orange" />
                            <div>
                              <div className="font-medium">{project.name}</div>
                              <div className="text-xs text-text-muted">
                                更新于 {formatDate(project.remoteUpdatedAt || Date.now())}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm ${getStatusColor(project.syncStatus || 'synced')}`}>
                              <Icon name="check-circle" size={14} className="inline mr-1" />
                              {getStatusText(project.syncStatus || 'synced')}
                            </span>
                            <Button size="sm" variant="ghost">
                              <Icon name="refresh" size={14} /> 同步
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Icon name="cloud" size={48} className="mx-auto mb-4 text-text-muted" />
                    <p className="text-text-secondary mb-4">还没有云端项目</p>
                    <Button onClick={handleRegisterCloudProject} disabled={!currentProject}>
                      同步当前项目到云端
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">存储空间</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>已使用</span>
                      <span>0 MB / 1 GB</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-tap-orange w-0" />
                    </div>
                    <p className="text-xs text-text-muted">
                      免费版提供 1GB 存储空间，升级专业版可获得更多空间
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-0">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {activeTeam ? (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{activeTeam.name}</CardTitle>
                          <div className="text-xs text-text-muted mt-1">
                            创建于 {formatDate(activeTeam.createdAt)}
                          </div>
                        </div>
                        <Badge variant="default">{activeTeam.plan === 'free' ? '免费版' : activeTeam.plan}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-surface-2 rounded-lg">
                          <div className="text-2xl font-bold">{activeTeam.members.size}</div>
                          <div className="text-xs text-text-muted">团队成员</div>
                        </div>
                        <div className="text-center p-4 bg-surface-2 rounded-lg">
                          <div className="text-2xl font-bold">{activeTeam.projects.length}</div>
                          <div className="text-xs text-text-muted">项目数量</div>
                        </div>
                        <div className="text-center p-4 bg-surface-2 rounded-lg">
                          <div className="text-2xl font-bold">∞</div>
                          <div className="text-xs text-text-muted">构建次数</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">团队成员</CardTitle>
                        <div className="flex gap-2">
                          <Input
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="输入邮箱邀请成员"
                            className="w-48"
                          />
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                            className="rounded-lg border border-border bg-surface-1 px-3 text-sm"
                          >
                            <option value="viewer">查看者</option>
                            <option value="developer">开发者</option>
                            <option value="admin">管理员</option>
                          </select>
                          <Button size="sm" onClick={handleInviteMember} disabled={!inviteEmail}>
                            邀请
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(activeTeam.members.values()).map((member) => (
                          <div
                            key={member.userId}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-tap-orange/20 flex items-center justify-center text-tap-orange text-sm font-medium">
                                {member.userName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {member.userName}
                                  {member.status === 'pending' && (
                                    <Badge variant="default" className="ml-2">待接受</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-text-muted">{member.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.role !== 'owner' && (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleChangeRole(member.userId, e.target.value as TeamRole)}
                                  className="rounded border border-border bg-surface-1 px-2 py-1 text-xs"
                                >
                                  <option value="viewer">查看者</option>
                                  <option value="developer">开发者</option>
                                  <option value="admin">管理员</option>
                                </select>
                              )}
                              {getRoleBadge(member.role)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">权限说明</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-text-muted border-b border-border">
                              <th className="pb-2 font-normal">权限</th>
                              <th className="pb-2 font-normal text-center">所有者</th>
                              <th className="pb-2 font-normal text-center">管理员</th>
                              <th className="pb-2 font-normal text-center">开发者</th>
                              <th className="pb-2 font-normal text-center">查看者</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: '查看项目', owner: true, admin: true, developer: true, viewer: true },
                              { label: '编辑项目', owner: true, admin: true, developer: true, viewer: false },
                              { label: '创建/删除项目', owner: true, admin: true, developer: true, viewer: false },
                              { label: '运行构建', owner: true, admin: true, developer: true, viewer: false },
                              { label: '发布应用', owner: true, admin: true, developer: false, viewer: false },
                              { label: '邀请/移除成员', owner: true, admin: true, developer: false, viewer: false },
                              { label: '账单管理', owner: true, admin: false, developer: false, viewer: false },
                            ].map((row, idx) => (
                              <tr key={idx} className="border-b border-border last:border-b-0">
                                <td className="py-2">{row.label}</td>
                                <td className="py-2 text-center">{row.owner && <Icon name="check" size={14} className="inline text-green-500" />}</td>
                                <td className="py-2 text-center">{row.admin && <Icon name="check" size={14} className="inline text-green-500" />}</td>
                                <td className="py-2 text-center">{row.developer && <Icon name="check" size={14} className="inline text-green-500" />}</td>
                                <td className="py-2 text-center">{row.viewer && <Icon name="check" size={14} className="inline text-green-500" />}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Icon name="users" size={48} className="mx-auto mb-4 text-text-muted" />
                    <p className="text-text-secondary mb-4">还没有团队</p>
                    <Button onClick={handleCreateTeam}>
                      创建团队
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
