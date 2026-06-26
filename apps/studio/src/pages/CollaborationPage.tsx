import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Icon,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from '@tapdev/ui';
import { teamService, cloudSyncService, collabService } from '@tapdev/core';
import type { Team, TeamMember } from '@tapdev/core';

export function CollaborationPage() {
  const [activeTab, setActiveTab] = useState('team');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Icon name="users" size={20} className="text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">协作与团队</h2>
            <p className="text-xs text-text-muted">团队管理、云同步、实时协作</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-2 border-b border-border">
          <TabsList>
            <TabsTrigger value="team">👥 团队管理</TabsTrigger>
            <TabsTrigger value="cloud">☁️ 云同步</TabsTrigger>
            <TabsTrigger value="collab">📝 实时协作</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="team" className="h-full pt-0">
            <TeamPanel />
          </TabsContent>
          <TabsContent value="cloud" className="h-full pt-0">
            <CloudSyncPanel />
          </TabsContent>
          <TabsContent value="collab" className="h-full pt-0">
            <CollabPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function TeamPanel() {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamMember['role']>('member');

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    const team = teamService.getCurrentTeam();
    if (team) {
      setCurrentTeam(team);
      setMembers(team.members);
    } else {
      await teamService.setCurrentTeam('default-team');
      const t = teamService.getCurrentTeam();
      setCurrentTeam(t);
      if (t) setMembers(t.members);
    }
  };

  const inviteMember = async () => {
    if (!newMemberEmail.trim()) return;
    try {
      await teamService.inviteMember(newMemberEmail, '欢迎加入团队！');
      await teamService.addMember(currentTeam?.id || 'default', newMemberEmail, newMemberRole);
      const t = teamService.getCurrentTeam();
      if (t) {
        setMembers(t.members);
      }
      setNewMemberEmail('');
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-tap-orange/10 text-tap-orange',
    admin: 'bg-purple-500/10 text-purple-500',
    member: 'bg-blue-500/10 text-blue-500',
    viewer: 'bg-gray-500/10 text-gray-500',
  };

  const roleLabels: Record<string, string> = {
    owner: '所有者',
    admin: '管理员',
    member: '成员',
    viewer: '访客',
  };

  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentTeam?.name || '我的团队'}</CardTitle>
                <Button size="sm" variant="secondary">
                  <Icon name="edit" size={14} />
                  编辑
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                {currentTeam?.description || '暂无描述'}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-surface-0 rounded-lg text-center">
                  <div className="text-2xl font-bold text-text-primary">{members.length}</div>
                  <div className="text-xs text-text-muted">成员数</div>
                </div>
                <div className="p-3 bg-surface-0 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-500">3</div>
                  <div className="text-xs text-text-muted">项目数</div>
                </div>
                <div className="p-3 bg-surface-0 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-500">12</div>
                  <div className="text-xs text-text-muted">本周提交</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>成员列表</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && inviteMember()}
                  placeholder="输入邮箱邀请成员..."
                  className="flex-1"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as TeamMember['role'])}
                  className="px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm"
                >
                  <option value="member">成员</option>
                  <option value="admin">管理员</option>
                  <option value="viewer">访客</option>
                </select>
                <Button onClick={inviteMember}>
                  <Icon name="user-plus" size={14} />
                  邀请
                </Button>
              </div>

              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-surface-0 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-text-secondary">
                        {member.name?.[0] || member.email?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {member.name || member.email}
                      </div>
                      <div className="text-xs text-text-muted truncate">{member.email}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${roleColors[member.role] || ''}`}>
                      {roleLabels[member.role] || member.role}
                    </span>
                    <Button size="sm" variant="ghost">
                      <Icon name="more-horizontal" size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>权限管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teamService
                  .getPermissions()
                  .slice(0, 8)
                  .map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-sm text-text-primary">{perm.name}</div>
                        <div className="text-xs text-text-muted">{perm.description}</div>
                      </div>
                      <Badge variant="info">{perm.category}</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>团队设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-text-muted block mb-1">团队名称</label>
                  <Input value={currentTeam?.name || ''} />
                </div>
                <div>
                  <label className="text-sm text-text-muted block mb-1">团队描述</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg bg-surface-0 border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    rows={3}
                    value={currentTeam?.description || ''}
                  />
                </div>
                <Button className="w-full">保存设置</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CloudSyncPanel() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('success');
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const triggerSync = async () => {
    setSyncStatus('syncing');
    try {
      await cloudSyncService.syncAll();
      setSyncStatus('success');
      setLastSyncTime(new Date());
    } catch {
      setSyncStatus('error');
    }
  };

  const statusConfig = {
    idle: { label: '未同步', color: 'text-text-muted', icon: 'cloud' },
    syncing: { label: '同步中', color: 'text-blue-500', icon: 'refresh-cw' },
    success: { label: '已同步', color: 'text-green-500', icon: 'check-circle' },
    error: { label: '同步失败', color: 'text-red-500', icon: 'alert-circle' },
  };

  const status = statusConfig[syncStatus];

  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>云同步状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-surface-0 rounded-xl">
              <div
                className={`w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center ${status.color}`}
              >
                <Icon
                  name={status.icon}
                  size={24}
                  className={syncStatus === 'syncing' ? 'animate-spin' : ''}
                />
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-text-primary">{status.label}</div>
                <div className="text-sm text-text-muted">
                  上次同步：{lastSyncTime.toLocaleString()}
                </div>
              </div>
              <Button onClick={triggerSync} disabled={syncStatus === 'syncing'}>
                {syncStatus === 'syncing' ? (
                  <Icon name="loading" size={16} className="animate-spin" />
                ) : (
                  <Icon name="refresh-cw" size={16} />
                )}
                {syncStatus === 'syncing' ? '同步中...' : '立即同步'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>存储空间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">已用空间</span>
              <span className="text-sm font-medium text-text-primary">2.3 GB / 10 GB</span>
            </div>
            <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-tap-orange rounded-full"
                style={{ width: '23%' }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="text-center p-2 bg-surface-0 rounded-lg">
                <div className="text-lg font-semibold text-text-primary">156</div>
                <div className="text-xs text-text-muted">项目</div>
              </div>
              <div className="text-center p-2 bg-surface-0 rounded-lg">
                <div className="text-lg font-semibold text-text-primary">1.2k</div>
                <div className="text-xs text-text-muted">文件</div>
              </div>
              <div className="text-center p-2 bg-surface-0 rounded-lg">
                <div className="text-lg font-semibold text-text-primary">89</div>
                <div className="text-xs text-text-muted">资源</div>
              </div>
              <div className="text-center p-2 bg-surface-0 rounded-lg">
                <div className="text-lg font-semibold text-text-primary">12</div>
                <div className="text-xs text-text-muted">插件</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>同步设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-text-primary">自动同步</div>
                  <div className="text-xs text-text-muted">文件变更时自动上传</div>
                </div>
                <div className="w-10 h-6 bg-tap-orange rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-text-primary">冲突自动合并</div>
                  <div className="text-xs text-text-muted">自动解决简单冲突</div>
                </div>
                <div className="w-10 h-6 bg-tap-orange rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-text-primary">仅 Wi-Fi 同步</div>
                  <div className="text-xs text-text-muted">节省移动数据流量</div>
                </div>
                <div className="w-10 h-6 bg-surface-2 rounded-full relative cursor-pointer">
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近同步记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { file: 'Assets/Scripts/GameManager.cs', time: '2 分钟前', action: '上传' },
                { file: 'Assets/Scenes/Main.unity', time: '5 分钟前', action: '下载' },
                { file: 'tapdev.config.json', time: '15 分钟前', action: '上传' },
                { file: 'Packages/manifest.json', time: '1 小时前', action: '冲突合并' },
                { file: 'Assets/Art/player.png', time: '2 小时前', action: '上传' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="file" size={16} className="text-text-muted" />
                    <span className="text-sm text-text-primary">{item.file}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.action === '上传'
                          ? 'success'
                          : item.action === '下载'
                            ? 'info'
                            : 'warning'
                      }
                    >
                      {item.action}
                    </Badge>
                    <span className="text-xs text-text-muted">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CollabPanel() {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isCollabActive, setIsCollabActive] = useState(false);

  useEffect(() => {
    loadCollaborators();
  }, []);

  const loadCollaborators = async () => {
    try {
      const result = await collabService.getCollaborators();
      setCollaborators(result);
    } catch {
      setCollaborators([
        { id: '1', name: '我', color: '#f97316', isLocal: true },
        { id: '2', name: '张策划', color: '#8b5cf6', isLocal: false },
        { id: '3', name: '李程序', color: '#3b82f6', isLocal: false },
      ]);
    }
  };

  const toggleCollab = async () => {
    if (isCollabActive) {
      collabService.leaveProject();
    } else {
      try {
        collabService.joinProject('test-project', '我', 'editor');
        collabService.addMockCollaborators(2);
      } catch {
        // mock
      }
    }
    setIsCollabActive(!isCollabActive);
  };

  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>实时协作</CardTitle>
              <Button onClick={toggleCollab} variant={isCollabActive ? 'secondary' : 'primary'}>
                <Icon name={isCollabActive ? 'pause' : 'play'} size={14} />
                {isCollabActive ? '停止协作' : '开启协作'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-4 bg-surface-0 rounded-xl mb-4">
              <div
                className={`w-3 h-3 rounded-full ${isCollabActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
              />
              <span className="text-sm text-text-primary">
                {isCollabActive ? '协作已开启，其他人可以实时编辑' : '协作未开启'}
              </span>
            </div>

            <div>
              <div className="text-sm font-medium text-text-primary mb-3">协作者</div>
              <div className="flex -space-x-2">
                {collaborators.map((c) => (
                  <div
                    key={c.id}
                    className="w-10 h-10 rounded-full border-2 border-surface-1 flex items-center justify-center text-sm font-medium text-white"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {c.name[0]}
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-surface-1 bg-surface-2 flex items-center justify-center text-xs text-text-secondary">
                  +3
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>协作历史</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { user: '张策划', action: '修改了文档标题', time: '刚刚', color: '#8b5cf6' },
                { user: '李程序', action: '添加了代码示例', time: '3 分钟前', color: '#3b82f6' },
                { user: '我', action: '创建了协作会话', time: '10 分钟前', color: '#f97316' },
                { user: '王美术', action: '上传了设计稿', time: '30 分钟前', color: '#10b981' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.user[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{item.user}</span>
                      <span className="text-xs text-text-muted">{item.time}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>协作设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-text-primary">显示光标位置</div>
                  <div className="text-xs text-text-muted">显示其他协作者的光标</div>
                </div>
                <div className="w-10 h-6 bg-tap-orange rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-text-primary">实时同步</div>
                  <div className="text-xs text-text-muted">每输入一个字符就同步</div>
                </div>
                <div className="w-10 h-6 bg-tap-orange rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
