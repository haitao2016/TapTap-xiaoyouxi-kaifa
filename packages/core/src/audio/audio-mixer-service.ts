// 游戏音频混音器
// 音轨管理、音量调节、淡入淡出、空间音效、音频事件

import { globalEventBus } from '../core/event-bus';

// 音轨类别
export type AudioTrackCategory = 'bgm' | 'sfx' | 'voice' | 'ambient';

// 音轨
export interface AudioTrack {
  id: string;
  name: string;
  category: AudioTrackCategory;
  url: string;
  duration: number;
  volume: number; // 0-1
  pan: number; // -1 (左) 到 1 (右)
  muted: boolean;
  soloed: boolean;
  loop: boolean;
  // 3D 位置
  spatial: boolean;
  position?: { x: number; y: number; z: number };
  // 淡入淡出
  fadeIn?: { duration: number; startTime?: number };
  fadeOut?: { duration: number; startTime?: number };
  // 滤波器
  filter?: { type: 'lowpass' | 'highpass' | 'bandpass'; frequency: number; q: number };
  // 实时效果
  effects: AudioEffect[];
  // 元数据
  metadata: {
    bpm?: number;
    key?: string;
    sampleRate: number;
    channels: number;
    bitrate: number;
  };
  // 状态
  status: 'stopped' | 'playing' | 'paused' | 'loading' | 'error';
  currentTime: number;
}

// 音频效果
export type AudioEffect =
  | { type: 'reverb'; wet: number; decay: number }
  | { type: 'delay'; time: number; feedback: number }
  | { type: 'distortion'; amount: number }
  | { type: 'chorus'; rate: number; depth: number }
  | { type: 'compressor'; threshold: number; ratio: number };

// 音频事件
export interface AudioEvent {
  id: string;
  name: string;
  trigger: 'on-load' | 'on-click' | 'on-collision' | 'on-score' | 'on-state' | 'on-time' | 'custom';
  customTrigger?: string;
  trackId: string;
  parameters?: { volume?: number; pitch?: number; position?: { x: number; y: number; z: number } };
  conditions?: { param: string; op: '==' | '!=' | '>' | '<' | '>=' | '<='; value: any }[];
  cooldown?: number; // ms
  lastTriggered?: number;
}

// 音频监听器（3D 空间）
export interface AudioListener {
  position: { x: number; y: number; z: number };
  orientation: {
    forward: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
  };
  velocity: { x: number; y: number; z: number };
}

// 主混音器
export interface MasterMixer {
  masterVolume: number;
  bpmMasterVolume: number;
  sfxMasterVolume: number;
  voiceMasterVolume: number;
  ambientMasterVolume: number;
  // 总线效果
  masterEffects: AudioEffect[];
  // 输出设置
  output: 'stereo' | 'surround-5.1' | 'surround-7.1';
  sampleRate: 44100 | 48000;
  bitDepth: 16 | 24 | 32;
}

class AudioMixerService {
  private tracks = new Map<string, AudioTrack>();
  private events: AudioEvent[] = [];
  private masterMixer: MasterMixer;
  private listener: AudioListener;
  private activeAudio: { [trackId: string]: HTMLAudioElement | null } = {};
  private listeners = new Set<(event: string, data: any) => void>();
  private currentTime = 0;

  constructor() {
    this.masterMixer = {
      masterVolume: 1.0,
      bpmMasterVolume: 0.8,
      sfxMasterVolume: 1.0,
      voiceMasterVolume: 1.0,
      ambientMasterVolume: 0.6,
      masterEffects: [],
      output: 'stereo',
      sampleRate: 44100,
      bitDepth: 16,
    };

    this.listener = {
      position: { x: 0, y: 0, z: 0 },
      orientation: {
        forward: { x: 0, y: 0, z: -1 },
        up: { x: 0, y: 1, z: 0 },
      },
      velocity: { x: 0, y: 0, z: 0 },
    };
  }

  // 创建音轨
  createTrack(
    config: Omit<AudioTrack, 'id' | 'effects' | 'metadata' | 'status' | 'currentTime'> &
      Partial<Pick<AudioTrack, 'effects' | 'metadata'>>
  ): AudioTrack {
    const track: AudioTrack = {
      ...config,
      id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      effects: config.effects || [],
      metadata: config.metadata || {
        sampleRate: 44100,
        channels: 2,
        bitrate: 128,
      },
      status: 'stopped',
      currentTime: 0,
    };
    this.tracks.set(track.id, track);
    this.notify('track:created', track);
    return track;
  }

  // 播放
  play(
    trackId: string,
    options?: { volume?: number; pitch?: number; position?: { x: number; y: number; z: number } }
  ): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    if (track.status === 'playing') return;

    track.status = 'playing';
    track.currentTime = 0;

    if (track.fadeIn) {
      track.volume = 0;
      this.startFadeIn(track);
    }

    // 触发音频播放
    this.notify('track:play', { trackId, options });
  }

  // 暂停
  pause(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.status = 'paused';
    this.notify('track:pause', { trackId });
  }

  // 停止
  stop(trackId: string, fadeOut: boolean = false): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    if (fadeOut && track.fadeOut) {
      this.startFadeOut(track, () => {
        track.status = 'stopped';
        track.currentTime = 0;
        this.notify('track:stop', { trackId });
      });
    } else {
      track.status = 'stopped';
      track.currentTime = 0;
      this.notify('track:stop', { trackId });
    }
  }

  // 设置音量
  setVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.volume = Math.max(0, Math.min(1, volume));
    this.notify('track:volume-changed', { trackId, volume: track.volume });
  }

  // 设置主混音音量
  setMasterVolume(category: AudioTrackCategory | 'all', volume: number): void {
    const v = Math.max(0, Math.min(1, volume));
    if (category === 'all') {
      this.masterMixer.masterVolume = v;
    } else if (category === 'bgm') {
      this.masterMixer.bpmMasterVolume = v;
    } else if (category === 'sfx') {
      this.masterMixer.sfxMasterVolume = v;
    } else if (category === 'voice') {
      this.masterMixer.voiceMasterVolume = v;
    } else if (category === 'ambient') {
      this.masterMixer.ambientMasterVolume = v;
    }
    this.applyMasterMixer();
    this.notify('master:volume-changed', { category, volume: v });
  }

  // 应用主混音
  private applyMasterMixer(): void {
    for (const track of this.tracks.values()) {
      const categoryVolume = this.getCategoryVolume(track.category);
      const effectiveVolume = track.muted
        ? 0
        : track.volume * this.masterMixer.masterVolume * categoryVolume;
      this.notify('track:effective-volume', { trackId: track.id, volume: effectiveVolume });
    }
  }

  private getCategoryVolume(category: AudioTrackCategory): number {
    switch (category) {
      case 'bgm':
        return this.masterMixer.bpmMasterVolume;
      case 'sfx':
        return this.masterMixer.sfxMasterVolume;
      case 'voice':
        return this.masterMixer.voiceMasterVolume;
      case 'ambient':
        return this.masterMixer.ambientMasterVolume;
    }
  }

  // 淡入
  private startFadeIn(track: AudioTrack): void {
    if (!track.fadeIn) return;
    const startVolume = 0;
    const targetVolume = track.volume;
    const duration = track.fadeIn.duration;
    const steps = 60;
    const stepTime = duration / steps;
    const stepVolume = (targetVolume - startVolume) / steps;
    let current = 0;

    const fadeInterval = setInterval(() => {
      current++;
      track.volume = Math.min(targetVolume, startVolume + current * stepVolume);
      if (current >= steps) {
        clearInterval(fadeInterval);
        track.volume = targetVolume;
      }
    }, stepTime);
  }

  // 淡出
  private startFadeOut(track: AudioTrack, onComplete?: () => void): void {
    const startVolume = track.volume;
    const targetVolume = 0;
    const duration = track.fadeOut?.duration || 1000;
    const steps = 60;
    const stepTime = duration / steps;
    const stepVolume = (startVolume - targetVolume) / steps;
    let current = 0;

    const fadeInterval = setInterval(() => {
      current++;
      track.volume = Math.max(targetVolume, startVolume - current * stepVolume);
      if (current >= steps) {
        clearInterval(fadeInterval);
        track.volume = 0;
        onComplete?.();
      }
    }, stepTime);
  }

  // 交叉淡入淡出
  crossFade(outId: string, inId: string, duration: number): void {
    const outTrack = this.tracks.get(outId);
    const inTrack = this.tracks.get(inId);
    if (!outTrack || !inTrack) return;

    if (outTrack.fadeOut) outTrack.fadeOut.duration = duration;
    else outTrack.fadeOut = { duration };

    if (inTrack.fadeIn) inTrack.fadeIn.duration = duration;
    else inTrack.fadeIn = { duration };

    this.play(inId);
    this.stop(outId, true);
  }

  // 设置 3D 位置
  setSpatialPosition(trackId: string, x: number, y: number, z: number): void {
    const track = this.tracks.get(trackId);
    if (!track || !track.spatial) return;
    track.position = { x, y, z };
    this.applySpatialAudio(track);
  }

  // 应用空间音频
  private applySpatialAudio(track: AudioTrack): void {
    if (!track.position) return;

    // 计算与监听器的距离
    const dx = track.position.x - this.listener.position.x;
    const dy = track.position.y - this.listener.position.y;
    const dz = track.position.z - this.listener.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // 距离衰减
    const maxDistance = 100;
    const volumeFactor = Math.max(0, 1 - distance / maxDistance);
    track.volume = (track.volume || 1) * volumeFactor;

    // 简单的立体声平移（基于 X 轴）
    const angle = Math.atan2(dx, -dz);
    track.pan = Math.max(-1, Math.min(1, Math.sin(angle)));

    this.notify('track:spatial-updated', {
      trackId: track.id,
      volume: track.volume,
      pan: track.pan,
    });
  }

  // 移动监听器
  moveListener(x: number, y: number, z: number): void {
    this.listener.position = { x, y, z };
    // 更新所有空间音轨
    for (const track of this.tracks.values()) {
      if (track.spatial) this.applySpatialAudio(track);
    }
  }

  // 添加音频事件
  addEvent(event: Omit<AudioEvent, 'id'>): AudioEvent {
    const newEvent: AudioEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.events.push(newEvent);
    return newEvent;
  }

  // 触发事件
  triggerEvent(eventName: string, context?: Record<string, any>): void {
    const event = this.events.find((e) => e.name === eventName);
    if (!event) return;

    // 检查冷却
    if (event.cooldown && event.lastTriggered) {
      if (Date.now() - event.lastTriggered < event.cooldown) return;
    }

    // 检查条件
    if (event.conditions && context) {
      const allMatch = event.conditions.every((c) => {
        const value = context[c.param];
        switch (c.op) {
          case '==':
            return value === c.value;
          case '!=':
            return value !== c.value;
          case '>':
            return value > c.value;
          case '<':
            return value < c.value;
          case '>=':
            return value >= c.value;
          case '<=':
            return value <= c.value;
        }
        return false;
      });
      if (!allMatch) return;
    }

    event.lastTriggered = Date.now();

    // 播放
    this.play(event.trackId, event.parameters);
    this.notify('event:triggered', { event, context });
  }

  // 添加效果
  addEffect(trackId: string, effect: AudioEffect): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.effects.push(effect);
    this.notify('effect:added', { trackId, effect });
  }

  // 移除效果
  removeEffect(trackId: string, index: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.effects.splice(index, 1);
    this.notify('effect:removed', { trackId, index });
  }

  // 静音/取消静音
  toggleMute(trackId: string): boolean {
    const track = this.tracks.get(trackId);
    if (!track) return false;
    track.muted = !track.muted;
    this.applyMasterMixer();
    return track.muted;
  }

  // 独奏
  toggleSolo(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.soloed = !track.soloed;
    // 取消其他独奏
    if (track.soloed) {
      for (const t of this.tracks.values()) {
        if (t.id !== trackId) t.soloed = false;
      }
    }
    this.applyMasterMixer();
  }

  // 导出混音
  exportMix(): MasterMixer {
    return { ...this.masterMixer };
  }

  // 导入混音
  importMix(mixer: MasterMixer): void {
    this.masterMixer = mixer;
    this.applyMasterMixer();
  }

  // 获取音轨
  getTrack(trackId: string): AudioTrack | undefined {
    return this.tracks.get(trackId);
  }

  // 列出音轨
  listTracks(filter?: { category?: AudioTrackCategory }): AudioTrack[] {
    const tracks = Array.from(this.tracks.values());
    if (filter?.category) return tracks.filter((t) => t.category === filter.category);
    return tracks;
  }

  // 获取主混音
  getMasterMixer(): MasterMixer {
    return { ...this.masterMixer };
  }

  // 订阅
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: string, data: any): void {
    for (const l of this.listeners) l(event, data);
  }
}

export const audioMixerService = new AudioMixerService();
