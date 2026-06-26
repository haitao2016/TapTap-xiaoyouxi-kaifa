// 可视化 Shader 编辑器
// 节点式 Shader 可视化编程，支持 GLSL/HLSL/WGSL

import { globalEventBus } from '../core/event-bus';

// Shader 节点类型
export type ShaderNodeType =
  | 'input'
  | 'output'
  | 'math'
  | 'texture'
  | 'color'
  | 'lighting'
  | 'noise'
  | 'utility'
  | 'template';

// Shader 节点
export interface ShaderNode {
  id: string;
  type: ShaderNodeType;
  name: string;
  category: string;
  inputs: {
    name: string;
    type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D';
    defaultValue?: any;
  }[];
  outputs: { name: string; type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D' }[];
  position: { x: number; y: number };
  parameters: {
    name: string;
    type: 'float' | 'int' | 'bool' | 'color' | 'enum';
    value: any;
    min?: number;
    max?: number;
    options?: string[];
  }[];
  code: string;
  description?: string;
}

// Shader 连接
export interface ShaderConnection {
  id: string;
  fromNode: string;
  fromOutput: string;
  toNode: string;
  toInput: string;
}

// Shader 模板
export interface ShaderTemplate {
  id: string;
  name: string;
  category:
    | 'cartoon'
    | 'watercolor'
    | 'pixel'
    | 'neon'
    | 'dissolve'
    | 'glass'
    | 'fire'
    | 'water'
    | 'hologram'
    | 'plasma';
  description: string;
  thumbnail?: string;
  uniforms: { name: string; type: string; defaultValue: any }[];
  nodes: ShaderNode[];
  connections: ShaderConnection[];
  fragmentShader: string;
  vertexShader: string;
}

class ShaderEditorService {
  private nodes = new Map<string, ShaderNode>();
  private connections: ShaderConnection[] = [];
  private currentShader: { nodes: ShaderNode[]; connections: ShaderConnection[] } | null = null;
  private templates: ShaderTemplate[] = [];
  private listeners = new Set<
    (data: { nodes: ShaderNode[]; connections: ShaderConnection[] }) => void
  >();

  constructor() {
    this.registerBuiltInNodes();
    this.registerBuiltInTemplates();
  }

  // 注册内置节点
  private registerBuiltInNodes(): void {
    const builtInNodes: Omit<ShaderNode, 'id' | 'position'>[] = [
      // 输入节点
      {
        type: 'input',
        name: 'UV',
        category: 'input',
        inputs: [],
        outputs: [{ name: 'out', type: 'vec2' }],
        parameters: [],
        code: 'vUv',
      },
      {
        type: 'input',
        name: 'Time',
        category: 'input',
        inputs: [],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [],
        code: 'uTime',
      },
      {
        type: 'input',
        name: 'Position',
        category: 'input',
        inputs: [],
        outputs: [{ name: 'out', type: 'vec3' }],
        parameters: [],
        code: 'vPosition',
      },
      {
        type: 'input',
        name: 'Normal',
        category: 'input',
        inputs: [],
        outputs: [{ name: 'out', type: 'vec3' }],
        parameters: [],
        code: 'vNormal',
      },
      // 数学节点
      {
        type: 'math',
        name: 'Add',
        category: 'math',
        inputs: [
          { name: 'a', type: 'float' },
          { name: 'b', type: 'float' },
        ],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [],
        code: '($a + $b)',
      },
      {
        type: 'math',
        name: 'Multiply',
        category: 'math',
        inputs: [
          { name: 'a', type: 'float' },
          { name: 'b', type: 'float' },
        ],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [],
        code: '($a * $b)',
      },
      {
        type: 'math',
        name: 'Sine',
        category: 'math',
        inputs: [{ name: 'value', type: 'float' }],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [],
        code: 'sin($value)',
      },
      {
        type: 'math',
        name: 'Cosine',
        category: 'math',
        inputs: [{ name: 'value', type: 'float' }],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [],
        code: 'cos($value)',
      },
      {
        type: 'math',
        name: 'Lerp',
        category: 'math',
        inputs: [
          { name: 'a', type: 'float' },
          { name: 'b', type: 'float' },
          { name: 't', type: 'float' },
        ],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [],
        code: 'mix($a, $b, $t)',
      },
      {
        type: 'math',
        name: 'Power',
        category: 'math',
        inputs: [
          { name: 'base', type: 'float' },
          { name: 'exp', type: 'float' },
        ],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [],
        code: 'pow($base, $exp)',
      },
      // 颜色节点
      {
        type: 'color',
        name: 'Color',
        category: 'color',
        inputs: [],
        outputs: [{ name: 'out', type: 'vec4' }],
        parameters: [{ name: 'color', type: 'color', value: '#ffffff' }],
        code: 'vec4($color, 1.0)',
      },
      {
        type: 'color',
        name: 'RGB to HSV',
        category: 'color',
        inputs: [{ name: 'rgb', type: 'vec3' }],
        outputs: [{ name: 'out', type: 'vec3' }],
        parameters: [],
        code: 'rgb2hsv($rgb)',
      },
      {
        type: 'color',
        name: 'HSV to RGB',
        category: 'color',
        inputs: [{ name: 'hsv', type: 'vec3' }],
        outputs: [{ name: 'out', type: 'vec3' }],
        parameters: [],
        code: 'hsv2rgb($hsv)',
      },
      // 纹理节点
      {
        type: 'texture',
        name: 'Sample Texture',
        category: 'texture',
        inputs: [{ name: 'uv', type: 'vec2' }],
        outputs: [{ name: 'rgba', type: 'vec4' }],
        parameters: [
          {
            name: 'texture',
            type: 'enum',
            value: 'mainTex',
            options: ['mainTex', 'normalMap', 'emissionMap'],
          },
        ],
        code: 'texture2D($texture, $uv)',
      },
      // 光照节点
      {
        type: 'lighting',
        name: 'Diffuse',
        category: 'lighting',
        inputs: [
          { name: 'normal', type: 'vec3' },
          { name: 'lightDir', type: 'vec3' },
        ],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [],
        code: 'max(dot($normal, $lightDir), 0.0)',
      },
      {
        type: 'lighting',
        name: 'Specular',
        category: 'lighting',
        inputs: [
          { name: 'normal', type: 'vec3' },
          { name: 'lightDir', type: 'vec3' },
          { name: 'viewDir', type: 'vec3' },
        ],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [{ name: 'shininess', type: 'float', value: 32, min: 1, max: 256 }],
        code: 'pow(max(dot(reflect(-$lightDir, $normal), $viewDir), 0.0), $shininess)',
      },
      // 噪声节点
      {
        type: 'noise',
        name: 'Perlin Noise',
        category: 'noise',
        inputs: [{ name: 'uv', type: 'vec2' }],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [{ name: 'scale', type: 'float', value: 10 }],
        code: 'perlinNoise($uv * $scale)',
      },
      {
        type: 'noise',
        name: 'Simplex Noise',
        category: 'noise',
        inputs: [{ name: 'uv', type: 'vec2' }],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [{ name: 'scale', type: 'float', value: 10 }],
        code: 'simplexNoise($uv * $scale)',
      },
      {
        type: 'noise',
        name: 'FBM',
        category: 'noise',
        inputs: [{ name: 'uv', type: 'vec2' }],
        outputs: [{ name: 'out', type: 'float' }],
        parameters: [
          { name: 'octaves', type: 'int', value: 5, min: 1, max: 8 },
          { name: 'scale', type: 'float', value: 5 },
        ],
        code: 'fbm($uv * $scale, $octaves)',
      },
      // 工具节点
      {
        type: 'utility',
        name: 'Fragment Color',
        category: 'utility',
        inputs: [{ name: 'color', type: 'vec4' }],
        outputs: [],
        parameters: [],
        code: 'gl_FragColor = $color',
      },
    ];

    for (const node of builtInNodes) {
      const id = `builtin-${node.name.toLowerCase().replace(/\s+/g, '-')}`;
      this.nodes.set(id, {
        ...node,
        id,
        position: { x: 0, y: 0 },
      });
    }
  }

  // 注册内置模板
  private registerBuiltInTemplates(): void {
    this.templates = [
      {
        id: 'cartoon',
        name: '卡通渲染',
        category: 'cartoon',
        description: '经典的卡通描边渲染效果',
        uniforms: [
          { name: 'uTime', type: 'float', defaultValue: 0 },
          { name: 'uOutlineColor', type: 'vec3', defaultValue: [0, 0, 0] },
          { name: 'uOutlineWidth', type: 'float', defaultValue: 0.02 },
        ],
        nodes: [],
        connections: [],
        fragmentShader: `precision mediump float;
uniform float uTime;
uniform vec3 uOutlineColor;
uniform float uOutlineWidth;
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  float edge = length(fwidth(vNormal));
  float outline = step(uOutlineWidth, edge);
  vec3 color = mix(vec3(1.0), uOutlineColor, outline);
  gl_FragColor = vec4(color, 1.0);
}`,
        vertexShader: `attribute vec3 position;
attribute vec3 normal;
varying vec2 vUv;
varying vec3 vNormal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
  vUv = uv;
  vNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      },
      {
        id: 'neon',
        name: '霓虹效果',
        category: 'neon',
        description: '发光的霓虹灯效果',
        uniforms: [
          { name: 'uTime', type: 'float', defaultValue: 0 },
          { name: 'uColor', type: 'vec3', defaultValue: [1.0, 0.2, 0.8] },
          { name: 'uIntensity', type: 'float', defaultValue: 2.0 },
        ],
        nodes: [],
        connections: [],
        fragmentShader: `precision mediump float;
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
  float glow = pow(1.0 - length(vUv - 0.5) * 2.0, 2.0);
  vec3 color = uColor * glow * uIntensity * pulse;
  gl_FragColor = vec4(color, 1.0);
}`,
        vertexShader: `attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      },
      {
        id: 'dissolve',
        name: '溶解效果',
        category: 'dissolve',
        description: '从边缘溶解消失的效果',
        uniforms: [
          { name: 'uTime', type: 'float', defaultValue: 0 },
          { name: 'uThreshold', type: 'float', defaultValue: 0.5 },
          { name: 'uEdgeColor', type: 'vec3', defaultValue: [1.0, 0.5, 0.0] },
        ],
        nodes: [],
        connections: [],
        fragmentShader: `precision mediump float;
uniform float uTime;
uniform float uThreshold;
uniform vec3 uEdgeColor;
varying vec2 vUv;
varying vec3 vColor;
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
void main() {
  float noise = random(vUv * 10.0);
  float threshold = uThreshold + sin(uTime) * 0.1;
  if (noise < threshold - 0.05) discard;
  float edge = smoothstep(threshold - 0.05, threshold, noise);
  vec3 color = mix(uEdgeColor, vColor, edge);
  gl_FragColor = vec4(color, 1.0);
}`,
        vertexShader: `attribute vec3 position;
attribute vec3 color;
attribute vec2 uv;
varying vec2 vUv;
varying vec3 vColor;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
  vUv = uv;
  vColor = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      },
      {
        id: 'water',
        name: '水波纹',
        category: 'water',
        description: '动态水波纹效果',
        uniforms: [
          { name: 'uTime', type: 'float', defaultValue: 0 },
          { name: 'uAmplitude', type: 'float', defaultValue: 0.05 },
        ],
        nodes: [],
        connections: [],
        fragmentShader: `precision mediump float;
uniform float uTime;
uniform float uAmplitude;
varying vec2 vUv;
void main() {
  float wave1 = sin(vUv.x * 10.0 + uTime * 2.0) * uAmplitude;
  float wave2 = sin(vUv.y * 15.0 + uTime * 1.5) * uAmplitude;
  vec2 offset = vec2(wave1, wave2);
  vec2 uv = vUv + offset;
  vec3 color = vec3(0.2, 0.5, 0.8) + 0.3 * sin(uv * 20.0 + uTime);
  gl_FragColor = vec4(color, 1.0);
}`,
        vertexShader: `attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      },
      {
        id: 'plasma',
        name: '等离子',
        category: 'plasma',
        description: '迷幻的等离子效果',
        uniforms: [{ name: 'uTime', type: 'float', defaultValue: 0 }],
        nodes: [],
        connections: [],
        fragmentShader: `precision mediump float;
uniform float uTime;
varying vec2 vUv;
void main() {
  float t = uTime * 0.5;
  vec2 uv = vUv * 2.0 - 1.0;
  float r = sin(uv.x * 10.0 + t) * 0.5 + 0.5;
  float g = sin(uv.y * 10.0 + t * 1.3) * 0.5 + 0.5;
  float b = sin((uv.x + uv.y) * 10.0 + t * 0.7) * 0.5 + 0.5;
  gl_FragColor = vec4(r, g, b, 1.0);
}`,
        vertexShader: `attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      },
    ];
  }

  // 添加节点
  addNode(node: Omit<ShaderNode, 'id'>): ShaderNode {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode: ShaderNode = { ...node, id };
    this.nodes.set(id, newNode);
    this.notify();
    return newNode;
  }

  // 移除节点
  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.connections = this.connections.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId);
    this.notify();
  }

  // 更新节点
  updateNode(nodeId: string, updates: Partial<ShaderNode>): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      Object.assign(node, updates);
      this.notify();
    }
  }

  // 添加连接
  addConnection(
    fromNode: string,
    fromOutput: string,
    toNode: string,
    toInput: string
  ): ShaderConnection {
    // 检查输入是否已连接
    this.connections = this.connections.filter(
      (c) => !(c.toNode === toNode && c.toInput === toInput)
    );
    const conn: ShaderConnection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromNode,
      fromOutput,
      toNode,
      toInput,
    };
    this.connections.push(conn);
    this.notify();
    return conn;
  }

  // 移除连接
  removeConnection(connectionId: string): void {
    this.connections = this.connections.filter((c) => c.id !== connectionId);
    this.notify();
  }

  // 编译为 GLSL
  compileToGLSL(target: 'glsl' | 'hlsl' | 'wgsl' = 'glsl'): { vertex: string; fragment: string } {
    if (target === 'glsl') {
      return this.compileGLSL();
    }
    return { vertex: '', fragment: '' };
  }

  // 编译 GLSL
  private compileGLSL(): { vertex: string; fragment: string } {
    const vertex = `attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

    // 找到 fragment color 输出节点
    const outputNode = Array.from(this.nodes.values()).find((n) => n.type === 'output');
    if (!outputNode) {
      return { vertex, fragment: 'void main() { gl_FragColor = vec4(1.0); }' };
    }

    // 反向拓扑排序
    const visited = new Set<string>();
    const order: string[] = [];
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      // 先访问所有输入
      for (const conn of this.connections.filter((c) => c.toNode === nodeId)) {
        visit(conn.fromNode);
      }
      order.push(nodeId);
    };
    visit(outputNode.id);

    // 生成变量
    const varDeclarations: string[] = [];
    const nodeOutputs = new Map<string, Map<string, string>>(); // nodeId -> outputName -> variableName

    for (const nodeId of order) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      nodeOutputs.set(nodeId, new Map());
      for (const output of node.outputs) {
        const varName = `v_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}_${output.name}`;
        nodeOutputs.get(nodeId)!.set(output.name, varName);
      }
    }

    // 生成代码
    const codeLines: string[] = ['void main() {'];
    codeLines.push('  vUv = vUv;');

    for (const nodeId of order) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      if (node.type === 'output') continue;

      // 解析输入
      const inputValues: Record<string, string> = {};
      for (const input of node.inputs) {
        const conn = this.connections.find((c) => c.toNode === nodeId && c.toInput === input.name);
        if (conn) {
          const fromVar = nodeOutputs.get(conn.fromNode)?.get(conn.fromOutput);
          if (fromVar) inputValues[input.name] = fromVar;
        } else if (input.defaultValue !== undefined) {
          inputValues[input.name] = JSON.stringify(input.defaultValue);
        } else {
          inputValues[input.name] = '0.0';
        }
      }

      // 替换代码
      let code = node.code;
      for (const [name, value] of Object.entries(inputValues)) {
        code = code.replace(new RegExp(`\\$${name}\\b`, 'g'), value);
      }

      // 替换参数
      for (const param of node.parameters) {
        code = code.replace(new RegExp(`\\$${param.name}\\b`, 'g'), JSON.stringify(param.value));
      }

      // 输出
      for (const output of node.outputs) {
        const varName = nodeOutputs.get(nodeId)!.get(output.name)!;
        const typeStr = output.type;
        codeLines.push(`  ${typeStr} ${varName} = ${code};`);
      }
    }

    // 最后一行赋值给 gl_FragColor
    if (outputNode.inputs[0]) {
      const lastConn = this.connections.find(
        (c) => c.toNode === outputNode.id && c.toInput === outputNode.inputs[0].name
      );
      if (lastConn) {
        const varName = nodeOutputs.get(lastConn.fromNode)?.get(lastConn.fromOutput);
        if (varName) {
          codeLines.push(`  gl_FragColor = ${varName};`);
        }
      }
    }

    codeLines.push('}');

    return { vertex, fragment: codeLines.join('\n') };
  }

  // 应用模板
  applyTemplate(templateId: string): ShaderTemplate | null {
    const template = this.templates.find((t) => t.id === templateId);
    if (!template) return null;

    // 清空当前
    this.nodes.clear();
    this.connections = [];

    // 应用模板
    for (const node of template.nodes) {
      this.nodes.set(node.id, { ...node });
    }
    this.connections = [...template.connections];

    this.notify();
    return template;
  }

  // 获取所有节点
  listNodes(): ShaderNode[] {
    return Array.from(this.nodes.values());
  }

  // 获取节点分类
  getNodeCategories(): { category: string; nodes: ShaderNode[] }[] {
    const map = new Map<string, ShaderNode[]>();
    for (const node of this.nodes.values()) {
      if (!map.has(node.category)) map.set(node.category, []);
      map.get(node.category)!.push(node);
    }
    return Array.from(map.entries()).map(([category, nodes]) => ({ category, nodes }));
  }

  // 获取模板
  getTemplates(category?: ShaderTemplate['category']): ShaderTemplate[] {
    if (category) return this.templates.filter((t) => t.category === category);
    return [...this.templates];
  }

  // 获取连接
  getConnections(): ShaderConnection[] {
    return [...this.connections];
  }

  // 订阅更新
  subscribe(
    listener: (data: { nodes: ShaderNode[]; connections: ShaderConnection[] }) => void
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const data = { nodes: this.listNodes(), connections: this.getConnections() };
    for (const l of this.listeners) l(data);
  }

  // 保存为自定义模板
  saveAsTemplate(
    name: string,
    category: ShaderTemplate['category'],
    description: string
  ): ShaderTemplate {
    const compiled = this.compileGLSL();
    const template: ShaderTemplate = {
      id: `custom-${Date.now()}`,
      name,
      category,
      description,
      uniforms: [],
      nodes: this.listNodes(),
      connections: this.getConnections(),
      fragmentShader: compiled.fragment,
      vertexShader: compiled.vertex,
    };
    this.templates.push(template);
    return template;
  }
}

export const shaderEditorService = new ShaderEditorService();
