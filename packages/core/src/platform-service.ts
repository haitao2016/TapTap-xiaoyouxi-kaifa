import type { Platform, PlatformCapabilities } from '@tapdev/types';

export class PlatformService {
  detectPlatform(): Platform {
    if (typeof window === 'undefined') return 'pc';

    const ua = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;

    if (/mobile|android|iphone|ipod/.test(ua) && width < 768) {
      return 'mobile';
    }
    if (/ipad|tablet|android/.test(ua) || (width >= 768 && width < 1024)) {
      return 'tablet';
    }
    return 'pc';
  }

  getCapabilities(): PlatformCapabilities {
    const platform = this.detectPlatform();
    const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

    return {
      platform,
      hasFileSystem: isElectron || platform === 'pc',
      hasNativeMenu: isElectron,
      hasNotifications: 'Notification' in (typeof window !== 'undefined' ? window : globalThis),
      hasDevTools: isElectron || platform === 'pc',
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
      screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    };
  }

  isMobileLayout(): boolean {
    return this.detectPlatform() === 'mobile';
  }

  isTabletLayout(): boolean {
    return this.detectPlatform() === 'tablet';
  }

  isDesktopLayout(): boolean {
    return this.detectPlatform() === 'pc';
  }
}

export const platformService = new PlatformService();
