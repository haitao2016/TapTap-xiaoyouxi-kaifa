/**
 * TypeScript / Shader 语言增强
 * - TypeScript 项目配置（tsconfig.json 智能提示）
 * - GLSL / WGSL Shader 语法高亮
 * - TapTap SDK 类型定义补全
 */
import * as fs from 'fs';
import * as path from 'path';

export interface ShaderLanguageConfig {
  /** GLSL 版本 */
  glslVersion: '100' | '300' | '310' | '320' | '330';
  /** 是否启用 WGSL 支持 */
  wgslEnabled: boolean;
  /** 精度修饰符 */
  precision: 'highp' | 'mediump' | 'lowp';
}

export interface TSProjectConfig {
  /** 严格模式 */
  strict: boolean;
  /** 目标 ES 版本 */
  target: 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022';
  /** TapTap SDK 类型 */
  tapdevSdk: boolean;
  /** JSX 支持 */
  jsx: boolean;
  /** 路径别名 */
  paths: Record<string, string[]>;
}

const DEFAULT_SHADER_CONFIG: ShaderLanguageConfig = {
  glslVersion: '300',
  wgslEnabled: true,
  precision: 'highp',
};

const DEFAULT_TS_CONFIG: TSProjectConfig = {
  strict: true,
  target: 'ES2020',
  tapdevSdk: true,
  jsx: true,
  paths: {
    '@tapdev/*': ['./node_modules/@tapdev/*'],
    '@/*': ['./src/*'],
  },
};

/**
 * 生成 TypeScript 项目的 tsconfig.json
 */
export function generateTSConfig(config: Partial<TSProjectConfig> = {}): string {
  const cfg = { ...DEFAULT_TS_CONFIG, ...config };
  return JSON.stringify(
    {
      compilerOptions: {
        target: cfg.target,
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: cfg.strict,
        jsx: cfg.jsx ? 'react-jsx' : undefined,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        baseUrl: '.',
        paths: cfg.paths,
        types: cfg.tapdevSdk ? ['@tapdev/types'] : [],
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      },
      include: ['src/**/*', 'game.ts', 'game.js', 'main.ts'],
      exclude: ['node_modules', 'build', 'dist'],
    },
    null,
    2
  );
}

/**
 * 生成 GLSL Shader 模板
 */
export function generateGLSLTemplate(kind: 'vertex' | 'fragment' | 'compute'): string {
  const cfg = DEFAULT_SHADER_CONFIG;
  const header = `#version ${cfg.glslVersion} es
precision ${cfg.precision} float;
`;
  if (kind === 'vertex') {
    return `${header}
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec3 a_normal;
uniform mat4 u_mvp;
uniform mat4 u_model;
out vec2 v_uv;
out vec3 v_normal;
void main() {
  v_uv = a_uv;
  v_normal = mat3(u_model) * a_normal;
  gl_Position = u_mvp * vec4(a_position, 1.0);
}
`;
  }
  if (kind === 'fragment') {
    return `${header}
in vec2 v_uv;
in vec3 v_normal;
uniform sampler2D u_texture;
uniform vec3 u_lightDir;
out vec4 fragColor;
void main() {
  vec3 n = normalize(v_normal);
  float diff = max(dot(n, normalize(u_lightDir)), 0.0);
  vec3 color = texture(u_texture, v_uv).rgb * (0.3 + 0.7 * diff);
  fragColor = vec4(color, 1.0);
}
`;
  }
  return `${header}
layout(local_size_x = 8, local_size_y = 8, local_size_z = 1) in;
layout(rgba8, binding = 0) uniform image2D u_output;
void main() {
  ivec2 id = ivec2(gl_GlobalInvocationID.xy);
  imageStore(u_output, id, vec4(1.0, 0.0, 0.0, 1.0));
}
`;
}

/**
 * 生成 WGSL Shader 模板
 */
export function generateWGSLTemplate(kind: 'vertex' | 'fragment' | 'compute'): string {
  if (kind === 'vertex') {
    return `struct Uniforms {
  mvp: mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) uv: vec2<f32>,
}
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.position = u.mvp * vec4<f32>(input.position, 1.0);
  out.uv = input.uv;
  return out;
}
`;
  }
  if (kind === 'fragment') {
    return `@group(0) @binding(1) var t_diffuse: texture_2d<f32>;
@group(0) @binding(2) var s_diffuse: sampler;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(t_diffuse, s_diffuse, uv);
}
`;
  }
  return `@group(0) @binding(0) var<storage, read_write> data: array<f32>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i < arrayLength(&data)) {
    data[i] = data[i] * 2.0;
  }
}
`;
}

/**
 * 生成 TapTap SDK 类型定义
 */
export function generateTapTapSDKTypes(): string {
  return `// TapTap 小游戏 SDK 类型定义 (自动生成)
declare namespace TapTap {
  interface SDK {
    login(): Promise<LoginResult>;
    share(options: ShareOptions): Promise<void>;
    pay(options: PayOptions): Promise<PayResult>;
    storage: {
      getItem(key: string): Promise<string | null>;
      setItem(key: string, value: string): Promise<void>;
      removeItem(key: string): Promise<void>;
    };
    systemInfo: SystemInfo;
  }
  interface LoginResult {
    token: string;
    profile: { id: string; name: string; avatar: string };
  }
  interface ShareOptions {
    title: string;
    imageUrl?: string;
    query?: string;
  }
  interface PayOptions {
    productId: string;
    amount: number;
    orderId: string;
  }
  interface PayResult {
    success: boolean;
    orderId: string;
    error?: string;
  }
  interface SystemInfo {
    platform: 'ios' | 'android' | 'devtool';
    model: string;
    screenWidth: number;
    screenHeight: number;
    pixelRatio: number;
  }
  const sdk: SDK;
}
`;
}

/**
 * 检测文件是否为 Shader 文件并返回语言类型
 */
export function detectShaderLanguage(filePath: string): 'glsl' | 'wgsl' | null {
  const ext = path.extname(filePath).toLowerCase();
  if (['.glsl', '.vert', '.frag', '.vs', '.fs', '.tesc', '.tese', '.geom', '.comp'].includes(ext)) {
    return 'glsl';
  }
  if (ext === '.wgsl') return 'wgsl';
  return null;
}

/**
 * 创建 TypeScript / Shader 项目的脚手架
 */
export function createEnhancedProject(options: { projectPath: string; withShader: boolean }): {
  files: { path: string; content: string }[];
} {
  const files: { path: string; content: string }[] = [
    { path: 'tsconfig.json', content: generateTSConfig() },
    { path: 'src/types/taptap-sdk.d.ts', content: generateTapTapSDKTypes() },
  ];
  if (options.withShader) {
    files.push(
      { path: 'shaders/basic.vert', content: generateGLSLTemplate('vertex') },
      { path: 'shaders/basic.frag', content: generateGLSLTemplate('fragment') },
      { path: 'shaders/compute.wgsl', content: generateWGSLTemplate('compute') }
    );
  }
  return { files };
}
