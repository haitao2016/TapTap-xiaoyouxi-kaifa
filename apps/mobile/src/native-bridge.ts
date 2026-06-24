import { Capacitor } from '@capacitor/core';

// 插件类型定义
interface StatusBarPlugin {
  setStyle(options: { style: 'DARK' | 'LIGHT' }): Promise<void>;
  setBackgroundColor(options: { color: string }): Promise<void>;
}

interface SplashScreenPlugin {
  hide(options?: { fadeOutDuration?: number }): Promise<void>;
}

interface KeyboardPlugin {
  hide(): Promise<void>;
  show(): Promise<void>;
  setResizeMode(options: { mode: 'body' | 'none' | 'ionic' | 'native' }): Promise<void>;
}

interface HapticsPlugin {
  impact(options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
}

// 动态导入插件，只在原生环境中加载
const isNativePlatform = Capacitor.isNativePlatform();

let StatusBar: StatusBarPlugin | null = null;
let SplashScreen: SplashScreenPlugin | null = null;
let Keyboard: KeyboardPlugin | null = null;
let Haptics: HapticsPlugin | null = null;

async function loadPlugins(): Promise<void> {
  if (!isNativePlatform) return;

  try {
    // 使用 require 动态加载，避免 TypeScript 静态分析问题
    const statusBarModule = await loadModule('@capacitor/status-bar');
    const splashScreenModule = await loadModule('@capacitor/splash-screen');
    const keyboardModule = await loadModule('@capacitor/keyboard');
    const hapticsModule = await loadModule('@capacitor/haptics');

    StatusBar = statusBarModule?.StatusBar ?? null;
    SplashScreen = splashScreenModule?.SplashScreen ?? null;
    Keyboard = keyboardModule?.Keyboard ?? null;
    Haptics = hapticsModule?.Haptics ?? null;
  } catch (error) {
    console.warn('[Mobile] Failed to load native plugins:', error);
  }
}

async function loadModule(moduleName: string): Promise<any> {
  try {
    // 使用 Function constructor 避免 TypeScript 静态分析
    const requireFunc = new Function('return require(arguments[0])');
    return requireFunc(moduleName);
  } catch {
    return null;
  }
}

export class MobileNativeBridge {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await loadPlugins();
    this.initialized = true;

    if (!isNativePlatform) {
      console.log('[Mobile] Running in web mode, native plugins not available');
      return;
    }

    try {
      await StatusBar?.setStyle({ style: 'DARK' });
      await StatusBar?.setBackgroundColor({ color: '#0d0d0f' });
      await SplashScreen?.hide({ fadeOutDuration: 300 });
      await Keyboard?.setResizeMode({ mode: 'body' });
    } catch (error) {
      console.warn('[Mobile] Failed to initialize native plugins:', error);
    }
  }

  isNativeAvailable(): boolean {
    return isNativePlatform;
  }

  async vibrate(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    if (!isNativePlatform || !Haptics) {
      console.log('[Mobile] Vibration:', style);
      return;
    }

    try {
      const styleMap = {
        light: 'LIGHT' as const,
        medium: 'MEDIUM' as const,
        heavy: 'HEAVY' as const,
      };
      await Haptics.impact({ style: styleMap[style] });
    } catch (error) {
      console.warn('[Mobile] Haptics not available:', error);
    }
  }

  async showToast(_message: string, _duration: 'short' | 'long' = 'short'): Promise<void> {
    if (!isNativePlatform) {
      console.log('[Mobile] Toast would be shown:', _message);
    }
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      console.log('[Mobile] Copy to clipboard:', text);
    }
  }

  async getDeviceInfo(): Promise<{ platform: string; version: string }> {
    return {
      platform: isNativePlatform ? Capacitor.getPlatform() : 'web',
      version: '1.0.0',
    };
  }

  async openUrl(url: string): Promise<void> {
    window.open(url, '_blank');
  }

  async hideKeyboard(): Promise<void> {
    if (!isNativePlatform || !Keyboard) return;
    try {
      await Keyboard.hide();
    } catch (error) {
      console.warn('[Mobile] Failed to hide keyboard:', error);
    }
  }

  async showKeyboard(): Promise<void> {
    if (!isNativePlatform || !Keyboard) return;
    try {
      await Keyboard.show();
    } catch (error) {
      console.warn('[Mobile] Failed to show keyboard:', error);
    }
  }
}

export const mobileNativeBridge = new MobileNativeBridge();
