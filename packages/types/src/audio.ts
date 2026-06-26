// Audio types

export type AudioTrackCategory = 'bgm' | 'sfx' | 'voice' | 'ambient';

export interface AudioTrack {
  id: string;
  name: string;
  category: AudioTrackCategory;
  url: string;
  duration: number;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  loop: boolean;
  spatial: boolean;
  position?: { x: number; y: number; z: number };
  fadeIn?: { duration: number; startTime?: number };
  fadeOut?: { duration: number; startTime?: number };
  filter?: { type: 'lowpass' | 'highpass' | 'bandpass'; frequency: number; q: number };
  effects: AudioEffect[];
  metadata: {
    bpm?: number;
    key?: string;
    sampleRate: number;
    channels: number;
    bitrate: number;
  };
  status: 'stopped' | 'playing' | 'paused' | 'loading' | 'error';
  currentTime: number;
}

export type AudioEffect =
  | { type: 'reverb'; wet: number; decay: number }
  | { type: 'delay'; time: number; feedback: number }
  | { type: 'distortion'; amount: number }
  | { type: 'chorus'; rate: number; depth: number }
  | { type: 'compressor'; threshold: number; ratio: number };

export interface AudioMixerState {
  masterVolume: number;
  categoryVolumes: Record<AudioTrackCategory, number>;
  muted: boolean;
  soloedCategories: AudioTrackCategory[];
}

export interface AudioSnapshot {
  id: string;
  name: string;
  tracks: AudioTrack[];
  mixerState: AudioMixerState;
  createdAt: number;
}

export interface SpatialAudioConfig {
  listenerPosition: { x: number; y: number; z: number };
  listenerRotation: { pitch: number; yaw: number; roll: number };
  distanceModel: 'linear' | 'inverse' | 'exponential';
  refDistance: number;
  maxDistance: number;
  rolloffFactor: number;
}
