import { useState, useRef, useEffect } from 'react';
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

export function GameDevToolsPage() {
  const [activeTab, setActiveTab] = useState('behavior-tree');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Icon name="gamepad" size={20} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">游戏开发工具</h2>
            <p className="text-xs text-text-muted">行为树、动画状态机、瓦片地图、Shader 编辑器</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-2 border-b border-border">
          <TabsList>
            <TabsTrigger value="behavior-tree">🌳 行为树</TabsTrigger>
            <TabsTrigger value="animation">🎬 动画状态机</TabsTrigger>
            <TabsTrigger value="tilemap">🗺️ 瓦片地图</TabsTrigger>
            <TabsTrigger value="shader">✨ Shader</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="behavior-tree" className="h-full pt-0">
            <BehaviorTreePanel />
          </TabsContent>
          <TabsContent value="animation" className="h-full pt-0">
            <AnimationPanel />
          </TabsContent>
          <TabsContent value="tilemap" className="h-full pt-0">
            <TileMapPanel />
          </TabsContent>
          <TabsContent value="shader" className="h-full pt-0">
            <ShaderPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

interface TreeNode {
  id: string;
  name: string;
  type: 'selector' | 'sequence' | 'action' | 'condition' | 'decorator';
}

function BehaviorTreePanel() {
  const [trees, setTrees] = useState([
    { id: '1', name: '敌人 AI', nodeCount: 12 },
    { id: '2', name: '玩家行为', nodeCount: 8 },
    { id: '3', name: 'Boss 战', nodeCount: 15 },
  ]);
  const [selectedTreeId, setSelectedTreeId] = useState('1');
  const [newTreeName, setNewTreeName] = useState('');

  const createTree = () => {
    if (!newTreeName.trim()) return;
    const newTree = { id: String(Date.now()), name: newTreeName, nodeCount: 1 };
    setTrees([...trees, newTree]);
    setSelectedTreeId(newTree.id);
    setNewTreeName('');
  };

  const nodeTypes = [
    {
      type: 'selector',
      label: '选择器',
      color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    },
    { type: 'sequence', label: '序列', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
    { type: 'action', label: '动作', color: 'bg-green-500/20 text-green-500 border-green-500/30' },
    {
      type: 'condition',
      label: '条件',
      color: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
    },
    {
      type: 'decorator',
      label: '装饰器',
      color: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
    },
  ];

  const rootNode: TreeNode = { id: 'root', name: '根节点', type: 'selector' };
  const childNodes: TreeNode[] = [
    { id: 'c1', name: '巡逻', type: 'sequence' },
    { id: 'c2', name: '追击', type: 'sequence' },
    { id: 'c3', name: '攻击', type: 'sequence' },
  ];
  const leafNodes: TreeNode[] = [
    { id: 'l1', name: '检测敌人', type: 'condition' },
    { id: 'l2', name: '移动到目标', type: 'action' },
    { id: 'l3', name: '播放攻击动画', type: 'action' },
    { id: 'l4', name: '造成伤害', type: 'action' },
  ];

  const selectedTree = trees.find((t) => t.id === selectedTreeId);

  return (
    <div className="h-full flex">
      <div className="w-60 border-r border-border bg-surface-0 flex flex-col">
        <div className="p-3 border-b border-border">
          <Input
            value={newTreeName}
            onChange={(e) => setNewTreeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTree()}
            placeholder="新建行为树..."
            className="mb-2"
          />
          <Button size="sm" className="w-full" onClick={createTree}>
            <Icon name="plus" size={14} />
            创建
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {trees.map((tree) => (
            <button
              key={tree.id}
              onClick={() => setSelectedTreeId(tree.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedTreeId === tree.id
                  ? 'bg-green-500/10 text-green-500'
                  : 'text-text-secondary hover:bg-surface-2'
              }`}
            >
              <div className="truncate font-medium">{tree.name}</div>
              <div className="text-xs text-text-muted mt-0.5">{tree.nodeCount} 个节点</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{selectedTree?.name}</span>
            <Badge variant="default">运行中</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              <Icon name="play" size={14} />
              运行
            </Button>
            <Button size="sm" variant="secondary">
              <Icon name="save" size={14} />
              保存
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 overflow-auto p-8 bg-[#0f0f1a]">
            <div className="relative min-w-[600px] min-h-[400px]">
              <div className="absolute left-1/2 -translate-x-1/2 top-0">
                <BTNode node={rootNode} />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-24 flex gap-12">
                {childNodes.map((node) => (
                  <BTNode key={node.id} node={node} />
                ))}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-48 flex gap-6">
                {leafNodes.map((node) => (
                  <BTNode key={node.id} node={node} small />
                ))}
              </div>
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1="50%"
                  y1="48"
                  x2="30%"
                  y2="96"
                  stroke="#6b7280"
                  strokeOpacity="0.3"
                  strokeWidth="2"
                />
                <line
                  x1="50%"
                  y1="48"
                  x2="50%"
                  y2="96"
                  stroke="#6b7280"
                  strokeOpacity="0.3"
                  strokeWidth="2"
                />
                <line
                  x1="50%"
                  y1="48"
                  x2="70%"
                  y2="96"
                  stroke="#6b7280"
                  strokeOpacity="0.3"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          <div className="w-48 border-l border-border bg-surface-0 p-3 space-y-4">
            <div>
              <div className="text-xs font-medium text-text-muted mb-2">节点类型</div>
              <div className="space-y-1">
                {nodeTypes.map((nt) => (
                  <div
                    key={nt.type}
                    className={`px-3 py-2 rounded-lg text-xs font-medium cursor-grab border ${nt.color}`}
                  >
                    {nt.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-xs font-medium text-text-muted mb-2">属性面板</div>
              <div className="text-sm text-text-secondary">选择节点以编辑</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BTNode({ node, small = false }: { node: TreeNode; small?: boolean }) {
  const colors: Record<string, string> = {
    selector: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    sequence: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    action: 'bg-green-500/20 border-green-500/50 text-green-400',
    condition: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
    decorator: 'bg-pink-500/20 border-pink-500/50 text-pink-400',
  };

  return (
    <div
      className={`px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:scale-105 transition-transform ${
        colors[node.type] || 'bg-surface-2 border-border text-text-primary'
      } ${small ? 'px-2 py-1 text-[10px]' : ''}`}
    >
      {node.name}
    </div>
  );
}

function AnimationPanel() {
  const [machines, setMachines] = useState([
    { id: '1', name: '玩家动画', stateCount: 6 },
    { id: '2', name: '敌人动画', stateCount: 4 },
  ]);
  const [selectedId, setSelectedId] = useState('1');

  const states = [
    { id: 'idle', name: '待机', x: 40, y: 60 },
    { id: 'walk', name: '行走', x: 180, y: 60 },
    { id: 'run', name: '奔跑', x: 320, y: 60 },
    { id: 'jump', name: '跳跃', x: 180, y: 160 },
    { id: 'attack', name: '攻击', x: 320, y: 160 },
  ];

  const selected = machines.find((m) => m.id === selectedId);

  return (
    <div className="h-full flex">
      <div className="w-60 border-r border-border bg-surface-0 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full">
            <Icon name="plus" size={14} />
            新建状态机
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {machines.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedId === m.id
                  ? 'bg-green-500/10 text-green-500'
                  : 'text-text-secondary hover:bg-surface-2'
              }`}
            >
              <div className="truncate font-medium">{m.name}</div>
              <div className="text-xs text-text-muted mt-0.5">{m.stateCount} 个状态</div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <div className="text-xs font-medium text-text-muted mb-2">参数</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">speed</span>
              <Badge variant="info">float</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">isGrounded</span>
              <Badge variant="warning">bool</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">attack</span>
              <Badge variant="success">trigger</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-0">
          <span className="text-sm font-medium text-text-primary">{selected?.name}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              <Icon name="play" size={14} />
              预览
            </Button>
            <Button size="sm" variant="secondary">
              <Icon name="save" size={14} />
              保存
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-[#0f0f1a]">
          <div className="relative w-[500px] h-[300px]">
            {states.map((state) => (
              <div
                key={state.id}
                className="absolute px-4 py-3 rounded-xl border-2 border-green-500/50 bg-green-500/10 text-sm font-medium text-green-400 cursor-move hover:border-green-400 transition-colors"
                style={{ left: state.x, top: state.y }}
              >
                {state.name}
              </div>
            ))}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="anim-arrow"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#22c55e" fillOpacity="0.5" />
                </marker>
              </defs>
              <line
                x1="88"
                y1="78"
                x2="180"
                y2="78"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                markerEnd="url(#anim-arrow)"
              />
              <line
                x1="228"
                y1="78"
                x2="320"
                y2="78"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                markerEnd="url(#anim-arrow)"
              />
              <path
                d="M 208 96 Q 208 140 208 160"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#anim-arrow)"
              />
              <line
                x1="248"
                y1="178"
                x2="320"
                y2="178"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                markerEnd="url(#anim-arrow)"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function TileMapPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(0);

  useEffect(() => {
    drawMap();
  }, []);

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tw = 32,
      th = 32,
      w = 25,
      h = 18;
    canvas.width = w * tw;
    canvas.height = h * th;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = Math.floor(Math.sin(x * 0.5) * 2 + Math.cos(y * 0.3) * 3) + 3;
        const hue = 100 + n * 8;
        ctx.fillStyle = `hsl(${hue}, 35%, ${18 + n * 3}%)`;
        ctx.fillRect(x * tw, y * th, tw, th);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(x * tw, y * th, tw, th);
      }
    }
  };

  const tiles = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="h-full flex">
      <div className="w-56 border-r border-border bg-surface-0 flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="text-sm font-medium text-text-primary mb-2">草地地图</div>
          <div className="text-xs text-text-muted">25 x 18 · 32px</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1.5 rounded text-sm text-text-secondary bg-surface-2 flex justify-between items-center">
            <span>背景层</span>
            <Icon name="eye" size={14} />
          </div>
          <div className="px-2 py-1.5 rounded text-sm text-text-primary bg-surface-1 flex justify-between items-center">
            <span>地形层</span>
            <Icon name="eye" size={14} />
          </div>
          <div className="px-2 py-1.5 rounded text-sm text-text-secondary bg-surface-2 flex justify-between items-center">
            <span>装饰层</span>
            <Icon name="eye" size={14} />
          </div>
          <div className="px-2 py-1.5 rounded text-sm text-text-secondary bg-surface-2 flex justify-between items-center">
            <span>碰撞层</span>
            <Icon name="eye-off" size={14} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-0">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              <Icon name="brush" size={14} />
              画笔
            </Button>
            <Button size="sm" variant="secondary">
              <Icon name="eraser" size={14} />
              橡皮
            </Button>
            <Button size="sm" variant="secondary">
              <Icon name="grid" size={14} />
              网格
            </Button>
          </div>
          <Button size="sm" variant="secondary">
            <Icon name="save" size={14} />
            保存
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-[#0a0a14] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="border border-border rounded cursor-crosshair"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              console.log(
                'Tile:',
                Math.floor((e.clientX - rect.left) / 32),
                Math.floor((e.clientY - rect.top) / 32)
              );
            }}
          />
        </div>
      </div>

      <div className="w-48 border-l border-border bg-surface-0 p-3">
        <div className="text-xs font-medium text-text-muted mb-2">图块</div>
        <div className="grid grid-cols-4 gap-1">
          {tiles.map((i) => (
            <button
              key={i}
              onClick={() => setSelectedTile(i)}
              className={`aspect-square rounded border transition-all ${
                selectedTile === i
                  ? 'border-green-500 scale-110 ring-2 ring-green-500/30'
                  : 'border-border hover:border-surface-3'
              }`}
              style={{ background: `hsl(${100 + (i % 6) * 10}, 35%, ${18 + (i % 4) * 5}%)` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShaderPanel() {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const animate = () => {
      drawPreview();
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  const drawPreview = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width,
      h = canvas.height;
    const t = Date.now() / 1000;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w,
          v = y / h;
        const r = Math.floor((Math.sin(u * 8 + t) * 0.5 + 0.5) * 200 + 55);
        const g = Math.floor((Math.cos(v * 6 + t * 0.7) * 0.5 + 0.5) * 180 + 75);
        const b = Math.floor((Math.sin((u + v) * 5 + t * 0.5) * 0.5 + 0.5) * 220 + 35);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  };

  const nodes = [
    { id: 'uv', name: 'UV 坐标', type: 'input', x: 20, y: 30 },
    { id: 'time', name: '时间', type: 'input', x: 20, y: 120 },
    { id: 'sin', name: '正弦', type: 'function', x: 130, y: 30 },
    { id: 'cos', name: '余弦', type: 'function', x: 130, y: 120 },
    { id: 'multiply', name: '相乘', type: 'math', x: 240, y: 75 },
    { id: 'output', name: '输出颜色', type: 'output', x: 350, y: 75 },
  ];

  return (
    <div className="h-full flex">
      <div className="w-56 border-r border-border bg-surface-0 flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="text-sm font-medium text-text-primary mb-2">动态流光</div>
          <div className="text-xs text-text-muted">Unlit · 12 个节点</div>
        </div>
        <div className="p-3 border-b border-border">
          <div className="text-xs font-medium text-text-muted mb-2">实时预览</div>
          <canvas
            ref={previewCanvasRef}
            width={176}
            height={176}
            className="w-full aspect-square rounded-lg border border-border"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs font-medium text-text-muted mb-2">节点库</div>
          <div className="space-y-1 text-sm">
            {['输入节点', '输出节点', '数学运算', '函数', '纹理采样', '颜色操作', 'UV 操作'].map(
              (cat) => (
                <div
                  key={cat}
                  className="px-2 py-1.5 rounded bg-surface-1 text-text-secondary hover:bg-surface-2 cursor-pointer"
                >
                  {cat}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-0">
          <div className="flex gap-2">
            <Badge variant="success">已编译</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              <Icon name="play" size={14} />
              编译
            </Button>
            <Button size="sm" variant="secondary">
              <Icon name="save" size={14} />
              保存
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-[#0f0f1a]">
          <div className="relative w-[500px] h-[250px]">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="absolute px-3 py-2 rounded-lg border border-surface-3 bg-surface-1 text-xs font-medium text-text-primary cursor-move hover:border-green-500/50 transition-colors min-w-[80px]"
                style={{ left: node.x, top: node.y }}
              >
                <div className="text-[10px] text-text-muted uppercase tracking-wide">
                  {node.type}
                </div>
                <div className="text-sm">{node.name}</div>
              </div>
            ))}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="sh-arrow"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#22c55e" fillOpacity="0.5" />
                </marker>
              </defs>
              <path
                d="M 76 48 Q 103 48 130 45"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#sh-arrow)"
              />
              <path
                d="M 76 138 Q 103 138 130 135"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#sh-arrow)"
              />
              <path
                d="M 186 55 Q 213 70 240 85"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#sh-arrow)"
              />
              <path
                d="M 186 135 Q 213 110 240 95"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#sh-arrow)"
              />
              <path
                d="M 296 93 Q 323 93 350 93"
                stroke="#22c55e"
                strokeOpacity="0.4"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#sh-arrow)"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="w-48 border-l border-border bg-surface-0 p-3">
        <div className="text-xs font-medium text-text-muted mb-2">属性</div>
        <div className="text-sm text-text-secondary">选择节点以编辑属性</div>
      </div>
    </div>
  );
}
