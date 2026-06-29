import { globalEventBus } from './event-bus';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface Breakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

export class ResponsiveService {
  private breakpoints: Breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
  };

  private viewportInfo: ViewportInfo = {
    width: 0,
    height: 0,
    deviceType: 'desktop',
    orientation: 'portrait',
    pixelRatio: 1,
  };

  private resizeObserver?: ResizeObserver;

  constructor() {
    this.updateViewportInfo();
    this.setupResizeListener();
  }

  getDeviceType(): DeviceType {
    return this.viewportInfo.deviceType;
  }

  getViewportInfo(): ViewportInfo {
    return { ...this.viewportInfo };
  }

  getBreakpoints(): Breakpoints {
    return { ...this.breakpoints };
  }

  isMobile(): boolean {
    return this.viewportInfo.deviceType === 'mobile';
  }

  isTablet(): boolean {
    return this.viewportInfo.deviceType === 'tablet';
  }

  isDesktop(): boolean {
    return this.viewportInfo.deviceType === 'desktop';
  }

  isPortrait(): boolean {
    return this.viewportInfo.orientation === 'portrait';
  }

  isLandscape(): boolean {
    return this.viewportInfo.orientation === 'landscape';
  }

  setBreakpoints(breakpoints: Partial<Breakpoints>): void {
    this.breakpoints = { ...this.breakpoints, ...breakpoints };
    this.updateViewportInfo();
  }

  getBreakpointClass(): string {
    switch (this.viewportInfo.deviceType) {
      case 'mobile':
        return 'device-mobile';
      case 'tablet':
        return 'device-tablet';
      case 'desktop':
        return 'device-desktop';
      default:
        return 'device-desktop';
    }
  }

  private updateViewportInfo(): void {
    if (typeof window !== 'undefined') {
      this.viewportInfo.width = window.innerWidth;
      this.viewportInfo.height = window.innerHeight;
      this.viewportInfo.pixelRatio = window.devicePixelRatio || 1;
      this.viewportInfo.orientation =
        this.viewportInfo.width < this.viewportInfo.height ? 'portrait' : 'landscape';

      if (this.viewportInfo.width < this.breakpoints.mobile) {
        this.viewportInfo.deviceType = 'mobile';
      } else if (this.viewportInfo.width < this.breakpoints.tablet) {
        this.viewportInfo.deviceType = 'tablet';
      } else {
        this.viewportInfo.deviceType = 'desktop';
      }
    }
  }

  private setupResizeListener(): void {
    if (typeof window !== 'undefined') {
      let timeout: ReturnType<typeof setTimeout>;
      window.addEventListener('resize', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const oldDeviceType = this.viewportInfo.deviceType;
          this.updateViewportInfo();

          if (oldDeviceType !== this.viewportInfo.deviceType) {
            globalEventBus.emit({
              type: 'responsive:deviceChange',
              payload: this.viewportInfo,
            });
          }

          globalEventBus.emit({
            type: 'responsive:resize',
            payload: this.viewportInfo,
          });
        }, 150);
      });
    }
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
  }
}

export const responsiveService = new ResponsiveService();
