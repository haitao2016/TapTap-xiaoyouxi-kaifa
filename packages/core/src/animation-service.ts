export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce';
  delay?: number;
}

export interface AnimationKeyframes {
  from: Record<string, string | number>;
  to: Record<string, string | number>;
}

export class AnimationService {
  private animations = new Map<string, number>();

  animate(
    element: HTMLElement,
    keyframes: AnimationKeyframes,
    config: AnimationConfig
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const id = `${element.id || Math.random().toString(36).substr(2, 9)}-${start}`;

      const animateFrame = (currentTime: number) => {
        const elapsed = currentTime - start - (config.delay || 0);
        
        if (elapsed < 0) {
          this.animations.set(id, requestAnimationFrame(animateFrame));
          return;
        }

        const progress = Math.min(elapsed / config.duration, 1);
        const easedProgress = this.applyEasing(progress, config.easing);

        Object.entries(keyframes.from).forEach(([prop, fromValue]) => {
          const toValue = keyframes.to[prop];
          if (toValue !== undefined) {
            const interpolated = this.interpolate(fromValue, toValue, easedProgress);
            (element.style as any)[prop] = interpolated;
          }
        });

        if (progress < 1) {
          this.animations.set(id, requestAnimationFrame(animateFrame));
        } else {
          this.animations.delete(id);
          resolve();
        }
      };

      this.animations.set(id, requestAnimationFrame(animateFrame));
    });
  }

  fadeIn(element: HTMLElement, duration: number = 300): Promise<void> {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    return this.animate(element, {
      from: { opacity: 0 },
      to: { opacity: 1 },
    }, { duration, easing: 'easeOut' });
  }

  fadeOut(element: HTMLElement, duration: number = 300): Promise<void> {
    return this.animate(element, {
      from: { opacity: 1 },
      to: { opacity: 0 },
    }, { duration, easing: 'easeIn' }).then(() => {
      element.style.display = 'none';
    });
  }

  slideIn(element: HTMLElement, direction: 'left' | 'right' | 'top' | 'bottom' = 'left', duration: number = 300): Promise<void> {
    const translations: Record<string, { from: string; to: string }> = {
      left: { from: '-100%', to: '0' },
      right: { from: '100%', to: '0' },
      top: { from: '-100%', to: '0' },
      bottom: { from: '100%', to: '0' },
    };

    const axis = direction === 'left' || direction === 'right' ? 'X' : 'Y';
    const { from, to } = translations[direction];

    element.style.transform = `translate${axis}(${from})`;
    element.style.opacity = '0';
    element.style.display = 'block';

    return this.animate(element, {
      from: { transform: `translate${axis}(${from})`, opacity: 0 },
      to: { transform: `translate${axis}(${to})`, opacity: 1 },
    }, { duration, easing: 'easeOut' });
  }

  slideOut(element: HTMLElement, direction: 'left' | 'right' | 'top' | 'bottom' = 'right', duration: number = 300): Promise<void> {
    const translations: Record<string, string> = {
      left: '-100%',
      right: '100%',
      top: '-100%',
      bottom: '100%',
    };

    const axis = direction === 'left' || direction === 'right' ? 'X' : 'Y';
    const to = translations[direction];

    return this.animate(element, {
      from: { transform: `translate${axis}(0)`, opacity: 1 },
      to: { transform: `translate${axis}(${to})`, opacity: 0 },
    }, { duration, easing: 'easeIn' }).then(() => {
      element.style.display = 'none';
    });
  }

  scaleIn(element: HTMLElement, duration: number = 300): Promise<void> {
    element.style.transform = 'scale(0.9)';
    element.style.opacity = '0';
    element.style.display = 'block';

    return this.animate(element, {
      from: { transform: 'scale(0.9)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    }, { duration, easing: 'easeOut' });
  }

  scaleOut(element: HTMLElement, duration: number = 300): Promise<void> {
    return this.animate(element, {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.9)', opacity: 0 },
    }, { duration, easing: 'easeIn' }).then(() => {
      element.style.display = 'none';
    });
  }

  bounce(element: HTMLElement): Promise<void> {
    return this.animate(element, {
      from: { transform: 'scale(0.3)' },
      to: { transform: 'scale(1)' },
    }, { duration: 700, easing: 'bounce' });
  }

  shake(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const duration = 500;
      const start = performance.now();

      const shakeFrame = (currentTime: number) => {
        const elapsed = currentTime - start;
        const progress = elapsed / duration;

        if (progress < 1) {
          const shake = Math.sin(progress * Math.PI * 10) * (1 - progress) * 10;
          element.style.transform = `translateX(${shake}px)`;
          requestAnimationFrame(shakeFrame);
        } else {
          element.style.transform = 'translateX(0)';
          resolve();
        }
      };

      requestAnimationFrame(shakeFrame);
    });
  }

  pulse(element: HTMLElement, times: number = 2): Promise<void> {
    return new Promise((resolve) => {
      let count = 0;
      let isGrowing = true;
      const duration = 300;
      let start = performance.now();

      const pulseFrame = (currentTime: number) => {
        const elapsed = currentTime - start;
        const progress = elapsed / duration;

        if (progress >= 1) {
          count++;
          isGrowing = !isGrowing;
          start = currentTime;

          if (count >= times * 2) {
            element.style.transform = 'scale(1)';
            resolve();
            return;
          }
        }

        const scale = isGrowing ? 1 + progress * 0.1 : 1.1 - progress * 0.1;
        element.style.transform = `scale(${scale})`;

        requestAnimationFrame(pulseFrame);
      };

      requestAnimationFrame(pulseFrame);
    });
  }

  cancelAnimation(elementId: string): void {
    const animationFrame = this.animations.get(elementId);
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      this.animations.delete(elementId);
    }
  }

  cancelAllAnimations(): void {
    this.animations.forEach((frame) => {
      cancelAnimationFrame(frame);
    });
    this.animations.clear();
  }

  private applyEasing(progress: number, easing: AnimationConfig['easing']): number {
    switch (easing) {
      case 'easeIn':
        return progress * progress;
      case 'easeOut':
        return 1 - Math.pow(1 - progress, 3);
      case 'easeInOut':
        return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      case 'bounce':
        const n1 = 7.5625;
        const d1 = 2.75;
        if (progress < 1 / d1) {
          return n1 * progress * progress;
        } else if (progress < 2 / d1) {
          return n1 * (progress -= 1.5 / d1) * progress + 0.75;
        } else if (progress < 2.5 / d1) {
          return n1 * (progress -= 2.25 / d1) * progress + 0.9375;
        } else {
          return n1 * (progress -= 2.625 / d1) * progress + 0.984375;
        }
      default:
        return progress;
    }
  }

  private interpolate(from: string | number, to: string | number, progress: number): string | number {
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * progress;
    }

    if (typeof from === 'string' && typeof to === 'string') {
      const fromMatch = from.match(/^([.]+)(.*)$/);
      const toMatch = to.match(/^([.]+)(.*)$/);

      if (fromMatch && toMatch && fromMatch[2] === toMatch[2]) {
        const fromValue = parseFloat(fromMatch[1]);
        const toValue = parseFloat(toMatch[1]);
        const unit = fromMatch[2];
        return `${fromValue + (toValue - fromValue) * progress}${unit}`;
      }
    }

    return to;
  }
}

export const animationService = new AnimationService();
