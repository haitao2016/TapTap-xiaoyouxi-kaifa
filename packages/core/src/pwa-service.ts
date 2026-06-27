import { globalEventBus } from './event-bus';

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  backgroundColor: string;
  themeColor: string;
  icons: PWAIcon[];
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
}

export interface InstallPromptEvent {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAService {
  private deferredPrompt: InstallPromptEvent | null = null;
  private isInstalled = false;
  private config: PWAConfig = {
    name: 'TapDev Studio',
    shortName: 'TapDev',
    description: '跨平台 TapTap 小游戏集成开发环境',
    startUrl: '/',
    display: 'standalone',
    backgroundColor: '#0F172A',
    themeColor: '#5B5FFF',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };

  constructor() {
    this.setupEvents();
  }

  getConfig(): PWAConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<PWAConfig>): void {
    this.config = { ...this.config, ...config };
  }

  isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches;
  }

  isInstallable(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  async checkInstalled(): Promise<boolean> {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isPWA = (window as any).navigator?.standalone === true;
      this.isInstalled = isStandalone || isPWA;
    }
    return this.isInstalled;
  }

  async install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }

    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;

    if (result.outcome === 'accepted') {
      this.isInstalled = true;
      globalEventBus.emit({ type: 'pwa:installed' });
    }

    this.deferredPrompt = null;
    return result.outcome;
  }

  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/service-worker.js');
        globalEventBus.emit({ type: 'pwa:swRegistered' });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async unregisterServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      globalEventBus.emit({ type: 'pwa:swUnregistered' });
    }
  }

  async enableNotifications(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async sendNotification(title: string, options?: NotificationOptions): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }

  getPromptStatus(): 'available' | 'used' | 'unavailable' {
    if (this.deferredPrompt) {
      return 'available';
    }
    if (this.isInstalled) {
      return 'used';
    }
    return 'unavailable';
  }

  private setupEvents(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this.deferredPrompt = event as unknown as InstallPromptEvent;
        globalEventBus.emit({ type: 'pwa:installPrompt' });
      });

      window.addEventListener('appinstalled', () => {
        this.isInstalled = true;
        this.deferredPrompt = null;
        globalEventBus.emit({ type: 'pwa:installed' });
      });

      window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        if (e.matches) {
          this.isInstalled = true;
          globalEventBus.emit({ type: 'pwa:standalone' });
        }
      });
    }
  }
}

export const pwaService = new PWAService();
