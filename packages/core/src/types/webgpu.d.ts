/**
 * WebGPU TypeScript Type Declarations
 * Based on WebGPU W3C Specification
 * @see https://www.w3.org/TR/webgpu/
 */

// Make this file a module
export {};

// GPU-related types
declare type GPUAddressMode = 'clamp-to-edge' | 'repeat' | 'mirror-repeat';
declare type GPUFilterMode = 'nearest' | 'linear';
declare type GPUCompareFunction =
  | 'never'
  | 'less'
  | 'equal'
  | 'less-equal'
  | 'greater'
  | 'not-equal'
  | 'greater-equal'
  | 'always';
declare type GPUPrimitiveTopology =
  | 'point-list'
  | 'line-list'
  | 'line-strip'
  | 'triangle-list'
  | 'triangle-strip';
declare type GPUCullMode = 'none' | 'front' | 'back';
declare type GPUFrontFace = 'ccw' | 'cw';
declare type GPUIndexFormat = 'uint16' | 'uint32';
declare type GPUVertexFormat =
  | 'uint8x2'
  | 'uint8x4'
  | 'sint8x2'
  | 'sint8x4'
  | 'unorm8x2'
  | 'unorm8x4'
  | 'snorm8x2'
  | 'snorm8x4'
  | 'uint16x2'
  | 'uint16x4'
  | 'sint16x2'
  | 'sint16x4'
  | 'unorm16x2'
  | 'unorm16x4'
  | 'snorm16x2'
  | 'snorm16x4'
  | 'float16x2'
  | 'float16x4'
  | 'float32'
  | 'float32x2'
  | 'float32x3'
  | 'float32x4'
  | 'uint32'
  | 'uint32x2'
  | 'uint32x3'
  | 'uint32x4'
  | 'sint32'
  | 'sint32x2'
  | 'sint32x3'
  | 'sint32x4';
declare type GPUTextureFormat =
  | 'r8unorm'
  | 'r8snorm'
  | 'r8uint'
  | 'r8sint'
  | 'r16uint'
  | 'r16sint'
  | 'r16float'
  | 'rg8unorm'
  | 'rg8snorm'
  | 'rg8uint'
  | 'rg8sint'
  | 'rgba8unorm'
  | 'rgba8unorm-srgb'
  | 'rgba8snorm'
  | 'rgba8uint'
  | 'rgba8sint'
  | 'bgra8unorm'
  | 'bgra8unorm-srgb'
  | 'pcmfloat16x2'
  | 'pcmfloat16x4'
  | 'pcmfloat32'
  | 'pcmfloat32x2'
  | 'pcmfloat32x3'
  | 'pcmfloat32x4'
  | 'pcmuint16'
  | 'pcmuint16x2'
  | 'pcmuint16x3'
  | 'pcmuint16x4'
  | 'pcmuint32'
  | 'pcmuint32x2'
  | 'pcmuint32x3'
  | 'pcmuint32x4'
  | 'pcmusint16'
  | 'pcmusint16x2'
  | 'pcmusint16x3'
  | 'pcmusint16x4'
  | 'depth32float'
  | 'depth24plus'
  | 'depth24plus-stencil8'
  | 'depth32float-stencil8'
  | 'bc1-rgbaunorm'
  | 'bc1-rgbaunorm-srgb'
  | 'bc2-rgbaunorm'
  | 'bc2-rgbaunorm-srgb'
  | 'bc3-rgbaunorm'
  | 'bc3-rgbaunorm-srgb'
  | 'bc4-runorm'
  | 'bc4-rsnorm'
  | 'bc5-runorm'
  | 'bc5-rsnorm'
  | 'bc6h-rgbunorm'
  | 'bc6h-rgbfloat'
  | 'bc7-rgbaunorm'
  | 'bc7-rgbaunorm-srgb'
  | 'etc2-rgb8unorm'
  | 'etc2-rgb8unorm-srgb'
  | 'etc2-rgb8a1unorm'
  | 'etc2-rgba8unorm'
  | 'eac-r11unorm'
  | 'eac-r11snorm'
  | 'eac-rg11unorm'
  | 'eac-rg11snorm'
  | 'astc-4x4-unorm'
  | 'astc-4x4-unorm-srgb'
  | 'astc-5x4-unorm'
  | 'astc-5x4-unorm-srgb'
  | 'astc-5x5-unorm'
  | 'astc-5x5-unorm-srgb'
  | 'astc-6x5-unorm'
  | 'astc-6x5-unorm-srgb'
  | 'astc-6x6-unorm'
  | 'astc-6x6-unorm-srgb'
  | 'astc-8x5-unorm'
  | 'astc-8x5-unorm-srgb'
  | 'astc-8x6-unorm'
  | 'astc-8x6-unorm-srgb'
  | 'astc-8x8-unorm'
  | 'astc-8x8-unorm-srgb'
  | 'astc-10x5-unorm'
  | 'astc-10x5-unorm-srgb'
  | 'astc-10x6-unorm'
  | 'astc-10x6-unorm-srgb'
  | 'astc-10x8-unorm'
  | 'astc-10x8-unorm-srgb'
  | 'astc-10x10-unorm'
  | 'astc-10x10-unorm-srgb'
  | 'astc-12x10-unorm'
  | 'astc-12x10-unorm-srgb'
  | 'astc-12x12-unorm'
  | 'astc-12x12-unorm-srgb';
declare type GPUTextureViewDimension = '1d' | '2d' | '2d-array' | 'cube' | 'cube-array' | '3d';
declare type GPUTextureDimension = '1d' | '2d' | '3d';
declare type GPUBlendFactor =
  | 'zero'
  | 'one'
  | 'src'
  | 'one-minus-src'
  | 'src-alpha'
  | 'one-minus-src-alpha'
  | 'dst'
  | 'one-minus-dst'
  | 'dst-alpha'
  | 'one-minus-dst-alpha'
  | 'src-alpha-saturated'
  | 'blend'
  | 'one-minus-blend'
  | 'src1'
  | 'one-minus-src1'
  | 'src1-alpha'
  | 'one-minus-src1-alpha';
declare type GPUBlendOperation = 'add' | 'subtract' | 'reverse-subtract' | 'min' | 'max';
declare type GPUColorWriteFlags = number;
declare type GPUStencilOperation =
  | 'keep'
  | 'zero'
  | 'replace'
  | 'invert'
  | 'increment-clamp'
  | 'decrement-clamp'
  | 'increment-wrap'
  | 'decrement-wrap';
declare type GPUInputStepMode = 'vertex' | 'instance';
declare type GPULoadOp = 'load' | 'clear';
declare type GPUStoreOp = 'store' | 'discard';
declare type GPUBufferUsageFlags = number;
declare type GPUTextureUsageFlags = number;
declare type GPUMapModeFlags = number;

// Buffer usage flags
declare const GPUBufferUsage: {
  readonly MAP_READ: GPUBufferUsageFlags;
  readonly MAP_WRITE: GPUBufferUsageFlags;
  readonly COPY_SRC: GPUBufferUsageFlags;
  readonly COPY_DST: GPUBufferUsageFlags;
  readonly INDEX: GPUBufferUsageFlags;
  readonly VERTEX: GPUBufferUsageFlags;
  readonly UNIFORM: GPUBufferUsageFlags;
  readonly STORAGE: GPUBufferUsageFlags;
  readonly INDIRECT: GPUBufferUsageFlags;
  readonly QUERY_RESOLVE: GPUBufferUsageFlags;
};

// Texture usage flags
declare const GPUTextureUsage: {
  readonly COPY_SRC: GPUTextureUsageFlags;
  readonly COPY_DST: GPUTextureUsageFlags;
  readonly TEXTURE_BINDING: GPUTextureUsageFlags;
  readonly STORAGE_BINDING: GPUTextureUsageFlags;
  readonly RENDER_ATTACHMENT: GPUTextureUsageFlags;
};

// Map mode flags
declare const GPUMapMode: {
  readonly READ: GPUMapModeFlags;
  readonly WRITE: GPUMapModeFlags;
};

// Color write flags
declare const GPUColorWrite: {
  readonly RED: GPUColorWriteFlags;
  readonly GREEN: GPUColorWriteFlags;
  readonly BLUE: GPUColorWriteFlags;
  readonly ALPHA: GPUColorWriteFlags;
  readonly ALL: GPUColorWriteFlags;
};

// Interfaces
declare interface GPUVertexBufferLayout {
  arrayStride: number;
  stepMode?: GPUInputStepMode;
  attributes?: GPUVertexAttribute[];
}

declare interface GPUVertexAttribute {
  format: GPUVertexFormat;
  offset: number;
  shaderLocation: number;
}

declare interface GPUColorDict {
  r: number;
  g: number;
  b: number;
  a: number;
}

declare type GPUColor = [number, number, number, number] | GPUColorDict;

declare interface GPUExtent3DDict {
  width: number;
  height: number;
  depthOrArrayLayers: number;
}

declare type GPUExtent3D = GPUExtent3DDict | [number, number, number];

declare interface GPUOrigin3DDict {
  x: number;
  y: number;
  z: number;
}

declare type GPUOrigin3D = GPUOrigin3DDict | [number, number, number];

declare interface GPUImageCopyTexture {
  texture: GPUTexture;
  mipLevel?: number;
  origin?: GPUOrigin3D;
  aspect?: 'all' | 'stencil-only' | 'depth-only';
}

declare interface GPUImageCopyBuffer {
  buffer: GPUBuffer;
  offset?: number;
  bytesPerRow?: number;
  rowsPerImage?: number;
}

declare interface GPUImageDataLayout {
  offset?: number;
  bytesPerRow?: number;
  rowsPerImage?: number;
}

declare interface GPUCommandBufferDescriptor {
  label?: string;
}

declare interface GPUBufferDescriptor extends GPUObjectDescriptorBase {
  size: number;
  usage: GPUBufferUsageFlags;
  mappedAtCreation?: boolean;
}

declare interface GPUBufferUsage {
  MAP_READ: GPUBufferUsageFlags;
  MAP_WRITE: GPUBufferUsageFlags;
  COPY_SRC: GPUBufferUsageFlags;
  COPY_DST: GPUBufferUsageFlags;
  INDEX: GPUBufferUsageFlags;
  VERTEX: GPUBufferUsageFlags;
  UNIFORM: GPUBufferUsageFlags;
  STORAGE: GPUBufferUsageFlags;
  INDIRECT: GPUBufferUsageFlags;
  QUERY_RESOLVE: GPUBufferUsageFlags;
}

declare interface GPUTextureDescriptor extends GPUObjectDescriptorBase {
  size: GPUExtent3D;
  mipLevelCount?: number;
  sampleCount?: number;
  dimension?: GPUTextureDimension;
  format: GPUTextureFormat;
  usage: GPUTextureUsageFlags;
  viewFormats?: GPUTextureFormat[];
}

declare interface GPUTextureUsage {
  COPY_SRC: GPUTextureUsageFlags;
  COPY_DST: GPUTextureUsageFlags;
  TEXTURE_BINDING: GPUTextureUsageFlags;
  STORAGE_BINDING: GPUTextureUsageFlags;
  RENDER_ATTACHMENT: GPUTextureUsageFlags;
}

declare interface GPUShaderModuleDescriptor extends GPUObjectDescriptorBase {
  code: string;
  sourceMap?: any;
}

declare interface GPUShaderCompilationInfo {
  messages: GPUCompilationMessage[];
}

declare interface GPUCompilationMessage {
  readonly message: string;
  readonly type: 'error' | 'warning' | 'info';
  readonly lineNum: number;
  readonly linePos: number;
  readonly offset: number;
  readonly length: number;
}

declare interface GPUObjectDescriptorBase {
  label?: string;
}

declare interface GPUBindGroupEntry {
  binding: number;
  resource: GPUBindingResource;
}

declare type GPUBindingResource = GPUSampler | GPUTextureView | GPUBufferBinding;

declare interface GPUBufferBinding {
  buffer: GPUBuffer;
  offset?: number;
  size?: number;
}

declare interface GPUBindGroupDescriptor extends GPUObjectDescriptorBase {
  layout: GPUBindGroupLayout;
  entries: GPUBindGroupEntry[];
}

declare interface GPUBindGroupLayoutEntry {
  binding?: number;
  visibility?: number;
  buffer?: GPUBufferBindingLayout;
  sampler?: GPUSamplerBindingLayout;
  texture?: GPUTextureBindingLayout;
  storageTexture?: GPUStorageTextureBindingLayout;
}

declare interface GPUBufferBindingLayout {
  type?: 'uniform' | 'storage' | 'read-only-storage';
  hasDynamicOffset?: boolean;
  minBindingSize?: number;
}

declare interface GPUSamplerBindingLayout {
  type?: 'filtering' | 'non-filtering' | 'comparison';
}

declare interface GPUTextureBindingLayout {
  sampleType?: 'float' | 'unfilterable-float' | 'depth' | 'sint' | 'uint';
  viewDimension?: GPUTextureViewDimension;
  multisampled?: boolean;
}

declare interface GPUStorageTextureBindingLayout {
  access?: 'read-only' | 'read-write' | 'write-only';
  format: GPUTextureFormat;
  viewDimension?: GPUTextureViewDimension;
}

declare interface GPUBindGroupLayoutDescriptor extends GPUObjectDescriptorBase {
  entries: GPUBindGroupLayoutEntry[];
}

declare interface GPUPipelineLayoutDescriptor {
  bindGroupLayouts: GPUBindGroupLayout[];
}

declare interface GPUPipelineDescriptorBase extends GPUObjectDescriptorBase {
  layout?: GPUPipelineLayout;
}

declare interface GPUVertexState extends GPUProgrammablePassColorComponentState {
  module: GPUShaderModule;
  entryPoint: string;
  buffers?: GPUVertexBufferLayout[];
}

declare interface GPUPrimitiveState extends GPUProgrammablePassColorComponentState {
  topology?: GPUPrimitiveTopology;
  stripIndexFormat?: GPUIndexFormat;
  frontFace?: GPUFrontFace;
  cullMode?: GPUCullMode;
  unclippedDepth?: boolean;
}

declare interface GPUMultisampleState {
  count?: number;
  mask?: number;
  alphaToCoverageEnabled?: boolean;
}

declare interface GPUDepthStencilState extends GPUProgrammablePassColorComponentState {
  format: GPUTextureFormat;
  depthWriteEnabled?: boolean;
  depthCompare?: GPUCompareFunction;
  stencilFront?: GPUStencilFaceState;
  stencilBack?: GPUStencilFaceState;
  stencilReadMask?: number;
  stencilWriteMask?: number;
  depthBias?: number;
  depthBiasSlopeScale?: number;
  depthBiasClamp?: number;
}

declare interface GPUStencilFaceState {
  compare?: GPUCompareFunction;
  failOp?: GPUStencilOperation;
  depthFailOp?: GPUStencilOperation;
  passOp?: GPUStencilOperation;
}

declare interface GPUBlendComponent {
  operation?: GPUBlendOperation;
  srcFactor?: GPUBlendFactor;
  dstFactor?: GPUBlendFactor;
}

declare interface GPUBlendState {
  color: GPUBlendComponent;
  alpha: GPUBlendComponent;
}

declare interface GPUColorTargetState extends GPUProgrammablePassColorComponentState {
  format: GPUTextureFormat;
  blend?: GPUBlendState;
  writeMask?: GPUColorWriteFlags;
}

declare interface GPUProgrammablePassColorComponentState {
  nextInChain?: any;
  format?: GPUTextureFormat;
}

declare interface GPURenderPassColorAttachment {
  view: GPUTextureView;
  resolveTarget?: GPUTextureView;
  loadOp: GPULoadOp;
  storeOp: GPUStoreOp;
  clearValue?: GPUColor;
}

declare interface GPURenderPassDepthStencilAttachment {
  view: GPUTextureView;
  depthClearValue?: number;
  depthLoadOp?: GPULoadOp;
  depthStoreOp?: GPUStoreOp;
  depthReadOnly?: boolean;
  stencilClearValue?: number;
  stencilLoadOp?: GPULoadOp;
  stencilStoreOp?: GPUStoreOp;
  stencilReadOnly?: boolean;
}

declare interface GPURenderPassDescriptor extends GPUObjectDescriptorBase {
  colorAttachments: GPURenderPassColorAttachment[];
  depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
  occlusionQuerySet?: GPUQuerySet;
}

declare interface GPUComputePassDescriptor extends GPUObjectDescriptorBase {}

declare interface GPURenderPipelineDescriptor extends GPUPipelineDescriptorBase {
  vertex: GPUVertexState;
  primitive?: GPUPrimitiveState;
  depthStencil?: GPUDepthStencilState;
  multisample?: GPUMultisampleState;
  fragment?: GPUFragmentState;
}

declare interface GPUFragmentState extends GPUProgrammablePassColorComponentState {
  module: GPUShaderModule;
  entryPoint: string;
  targets: GPUColorTargetState[];
}

declare interface GPUComputePipelineDescriptor extends GPUPipelineDescriptorBase {
  compute: GPUProgrammablePassProgrammableStageDescriptor;
}

declare interface GPUProgrammablePassProgrammableStageDescriptor {
  module: GPUShaderModule;
  entryPoint: string;
  constants?: Record<string, any>;
}

declare interface GPUQueueDescriptor extends GPUObjectDescriptorBase {}

declare interface GPUCommandEncoderDescriptor extends GPUObjectDescriptorBase {}

declare interface GPUComputePassEncoder {}

declare interface GPURenderPassEncoder {}

declare interface GPUBuffer {
  label: string;
  mapAsync(mode: GPUMapModeFlags, offset?: number, size?: number): Promise<void>;
  getMappedRange(offset?: number, size?: number): ArrayBuffer;
  unmap(): void;
  destroy(): void;
}

declare interface GPUTexture {
  createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
  destroy(): void;
}

declare interface GPUTextureView {}

declare interface GPUTextureViewDescriptor extends GPUObjectDescriptorBase {
  format?: GPUTextureFormat;
  dimension?: GPUTextureViewDimension;
  aspect?: 'all' | 'stencil-only' | 'depth-only';
  baseMipLevel?: number;
  mipLevelCount?: number;
  baseArrayLayer?: number;
  arrayLayerCount?: number;
}

declare interface GPUSampler {}

declare interface GPUSamplerDescriptor extends GPUObjectDescriptorBase {
  addressModeU?: GPUAddressMode;
  addressModeV?: GPUAddressMode;
  addressModeW?: GPUAddressMode;
  magFilter?: GPUFilterMode;
  minFilter?: GPUFilterMode;
  mipmapFilter?: GPUFilterMode;
  lodMinClamp?: number;
  lodMaxClamp?: number;
  compare?: GPUCompareFunction;
  maxAnisotropy?: number;
}

declare interface GPUShaderModule {
  label: string;
  getCompilationInfo(): Promise<GPUShaderCompilationInfo>;
}

declare interface GPUBindGroupLayout {}

declare interface GPUPipelineLayout {}

declare interface GPURenderPipeline {}

declare interface GPUComputePipeline {}

declare interface GPUCommandBuffer {
  label: string;
}

declare interface GPUCommandEncoder {}

declare interface GPUQueue {
  submit(commandBuffers: GPUCommandBuffer[]): void;
  writeBuffer(
    buffer: GPUBuffer,
    bufferOffset: number,
    data: ArrayBuffer | ArrayBufferView,
    dataOffset?: number,
    size?: number
  ): void;
  writeTexture(
    destination: GPUImageCopyTexture,
    data: ArrayBuffer | ArrayBufferView,
    dataLayout: GPUImageDataLayout,
    size: GPUExtent3D
  ): void;
  copyBufferToBuffer(
    source: GPUBuffer,
    sourceOffset: number,
    destination: GPUBuffer,
    destinationOffset: number,
    size: number
  ): void;
  copyBufferToTexture(
    source: GPUImageCopyBuffer,
    destination: GPUImageCopyTexture,
    copySize: GPUExtent3D
  ): void;
  copyTextureToBuffer(
    source: GPUImageCopyTexture,
    destination: GPUImageCopyBuffer,
    copySize: GPUExtent3D
  ): void;
  copyTextureToTexture(
    source: GPUImageCopyTexture,
    destination: GPUImageCopyTexture,
    copySize: GPUExtent3D
  ): void;
  signal(queue: GPUQueue, signalValue: number): void;
  onSubmittedWorkDone(): Promise<void>;
}

declare interface GPUDevice extends EventTarget {
  label: string;
  adapterInfo: GPUAdapterInfo;
  features: ReadonlySet<string>;
  limits: GPUSupportedLimits;
  queue: GPUQueue;
  lost: GPUDeviceLostPromise;
  destroy(): void;
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler;
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
  createQuerySet(descriptor: GPUQuerySetDescriptor): GPUQuerySet;
  addEventListener(type: string, listener: (event: GPUUncapturedErrorEvent) => void): void;
  removeEventListener(type: string, listener: (event: GPUUncapturedErrorEvent) => void): void;
  dispatchEvent(event: GPUUncapturedErrorEvent): boolean;
}

declare type GPUDeviceLostPromise = {
  then<TResult1 = GPUDeviceLostInfo, TResult2 = never>(
    onfulfilled?: ((value: GPUDeviceLostInfo) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
};

declare interface GPUDeviceLostInfo {
  message: string;
}

declare interface GPUAdapterInfo {
  readonly vendor: string;
  readonly architecture: string;
  readonly device: string;
  readonly description: string;
  readonly driver: string;
}

declare interface GPUSupportedLimits {
  maxTextureDimension1D: number;
  maxTextureDimension2D: number;
  maxTextureDimension3D: number;
  maxTextureArrayLayers: number;
  maxBindGroups: number;
  maxDynamicUniformBuffersPerPipelineLayout: number;
  maxDynamicStorageBuffersPerPipelineLayout: number;
  maxSamplersPerShaderStage: number;
  maxStorageBuffersPerShaderStage: number;
  maxStorageTexturesPerShaderStage: number;
  maxUniformBuffersPerShaderStage: number;
  maxUniformBufferBindingSize: number;
  maxStorageBufferBindingSize: number;
  minUniformBufferOffsetAlignment: number;
  minStorageBufferOffsetAlignment: number;
}

declare interface GPUAdapter {
  isFallbackAdapter: boolean;
  features: ReadonlySet<string>;
  limits: GPUSupportedLimits;
  requestDevice(descriptor?: DeviceDescriptor): Promise<GPUDevice>;
}

declare interface DeviceDescriptor extends GPUObjectDescriptorBase {
  requiredFeatures?: string[];
  requiredLimits?: Record<string, number>;
  defaultQueue?: GPUQueueDescriptor;
}

declare interface GPUCanvasContext {
  configure(configuration: GPUCanvasConfiguration): void;
  getCurrentTexture(): GPUTexture;
}

declare interface GPUCanvasConfiguration {
  device: GPUDevice;
  format?: GPUTextureFormat;
  alphaMode?: 'opaque' | 'premultiplied';
  width?: number;
  height?: number;
}

declare interface GPUUncapturedErrorEvent extends Event {
  readonly error: GPUError;
}

declare type GPUError = GPUValidationError | GPUOutOfMemoryError;

declare interface GPUValidationError extends GPUErrorBase {
  readonly type: 'validation';
}

declare interface GPUOutOfMemoryError extends GPUErrorBase {
  readonly type: 'out-of-memory';
}

declare interface GPUErrorBase {
  readonly message: string;
}

declare interface GPUQuerySet {}

declare interface GPUQuerySetDescriptor extends GPUObjectDescriptorBase {
  type: 'occlusion' | 'timestamp';
  count: number;
  pipelineStatistics?: string[];
}

declare interface GPUBindGroup {}

declare interface GPUEventTypeMap {
  uncapturederror: GPUUncapturedErrorEvent;
}

// Navigator WebGPU extension
interface Navigator {
  gpu?: GPU;
}

// Window WebGPU extension
interface Window {
  GPU?: typeof GPU;
}

declare interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat?(): GPUTextureFormat;
}

declare interface GPURequestAdapterOptions {
  powerPreference?: 'low-power' | 'high-performance' | 'default';
  forceFallbackAdapter?: boolean;
}
