export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  placeholder?: string;
  loadingClass?: string;
  loadedClass?: string;
  errorClass?: string;
}

export interface ModuleLoadResult {
  success: boolean;
  module?: any;
  error?: Error;
  loadTime: number;
}

export class LazyLoadService {
  private observer?: IntersectionObserver;
  private modules = new Map<string, Promise<ModuleLoadResult>>();

  initialize(options: LazyLoadOptions = {}): void {
    const { threshold = 0.1, rootMargin = '100px' } = options;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            this.loadElement(element, options);
            this.observer?.unobserve(element);
          }
        });
      },
      { threshold, rootMargin }
    );
  }

  observe(element: HTMLElement): void {
    this.observer?.observe(element);
  }

  unobserve(element: HTMLElement): void {
    this.observer?.unobserve(element);
  }

  disconnect(): void {
    this.observer?.disconnect();
  }

  async loadElement(element: HTMLElement, options: LazyLoadOptions): Promise<void> {
    const { loadingClass = 'lazy-loading', loadedClass = 'lazy-loaded', errorClass = 'lazy-error' } = options;

    const src = element.getAttribute('data-src');
    const srcset = element.getAttribute('data-srcset') ?? undefined;

    if (!src) return;

    element.classList.add(loadingClass);

    try {
      if (element instanceof HTMLImageElement) {
        await this.loadImage(element, src, srcset);
      } else if (element instanceof HTMLIFrameElement) {
        await this.loadIframe(element, src);
      } else {
        await this.loadBackground(element, src);
      }

      element.classList.remove(loadingClass);
      element.classList.add(loadedClass);
    } catch {
      element.classList.remove(loadingClass);
      element.classList.add(errorClass);
    }
  }

  private async loadImage(img: HTMLImageElement, src: string, srcset?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();

      if (srcset) {
        image.srcset = srcset;
      }
      image.src = src;

      image.onload = () => {
        img.src = image.src;
        if (srcset) img.srcset = image.srcset;
        resolve();
      };

      image.onerror = reject;
    });
  }

  private async loadIframe(iframe: HTMLIFrameElement, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to load iframe'));
      iframe.src = src;
    });
  }

  private async loadBackground(element: HTMLElement, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        element.style.backgroundImage = `url(${src})`;
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  async loadModule<T>(moduleId: string, loader: () => Promise<T>): Promise<ModuleLoadResult> {
    const existing = this.modules.get(moduleId);
    if (existing) {
      return existing;
    }

    const startTime = performance.now();
    const promise = loader()
      .then((module) => {
        const loadTime = performance.now() - startTime;
        return { success: true, module, loadTime } as ModuleLoadResult;
      })
      .catch((error) => {
        const loadTime = performance.now() - startTime;
        return { success: false, error, loadTime } as ModuleLoadResult;
      });

    this.modules.set(moduleId, promise);
    return promise;
  }

  preloadModule(moduleId: string, loader: () => Promise<any>): void {
    this.loadModule(moduleId, loader).catch(() => {});
  }

  getModuleLoadTime(moduleId: string): Promise<number | undefined> | undefined {
    const result = this.modules.get(moduleId);
    if (result) {
      return result.then(r => r.loadTime).catch(() => undefined);
    }
    return undefined;
  }

  clearModuleCache(moduleId?: string): void {
    if (moduleId) {
      this.modules.delete(moduleId);
    } else {
      this.modules.clear();
    }
  }

  getLoadedModules(): string[] {
    return Array.from(this.modules.keys());
  }
}

export const lazyLoadService = new LazyLoadService();
