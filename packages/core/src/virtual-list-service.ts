export interface VirtualListOptions {
  container: HTMLElement;
  itemHeight: number;
  itemCount: number;
  renderItem: (index: number) => HTMLElement;
  estimateSize?: (index: number) => number;
  overscanCount?: number;
}

export interface VirtualListItem {
  index: number;
  element: HTMLElement;
  top: number;
  height: number;
}

export class VirtualListService {
  private container: HTMLElement;
  private itemHeight: number;
  private itemCount: number;
  private renderItem: (index: number) => HTMLElement;
  private estimateSize?: (index: number) => number;
  private overscanCount: number;
  
  private scrollTop = 0;
  private visibleStartIndex = 0;
  private visibleEndIndex = 0;
  private items = new Map<number, VirtualListItem>();
  
  private scrollContainer!: HTMLElement;
  private contentElement!: HTMLElement;
  
  private rafId?: number;

  constructor(options: VirtualListOptions) {
    this.container = options.container;
    this.itemHeight = options.itemHeight;
    this.itemCount = options.itemCount;
    this.renderItem = options.renderItem;
    this.estimateSize = options.estimateSize;
    this.overscanCount = options.overscanCount || 3;

    this.setupElements();
    this.setupScrollListener();
    this.update();
  }

  private setupElements(): void {
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';

    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.position = 'absolute';
    this.scrollContainer.style.top = '0';
    this.scrollContainer.style.left = '0';
    this.scrollContainer.style.width = '100%';
    this.scrollContainer.style.height = this.getTotalHeight().toString() + 'px';
    this.container.appendChild(this.scrollContainer);

    this.contentElement = document.createElement('div');
    this.contentElement.style.position = 'absolute';
    this.contentElement.style.top = '0';
    this.contentElement.style.left = '0';
    this.contentElement.style.width = '100%';
    this.container.appendChild(this.contentElement);
  }

  private setupScrollListener(): void {
    this.container.addEventListener('scroll', () => {
      this.onScroll();
    });
  }

  private onScroll(): void {
    this.scrollTop = this.container.scrollTop;
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.update();
        this.rafId = undefined;
      });
    }
  }

  private getTotalHeight(): number {
    if (this.estimateSize) {
      let total = 0;
      for (let i = 0; i < this.itemCount; i++) {
        total += this.estimateSize(i);
      }
      return total;
    }
    return this.itemCount * this.itemHeight;
  }

  private getItemHeight(index: number): number {
    return this.estimateSize?.(index) ?? this.itemHeight;
  }

  private getItemTop(index: number): number {
    if (this.estimateSize) {
      let top = 0;
      for (let i = 0; i < index; i++) {
        top += this.estimateSize(i);
      }
      return top;
    }
    return index * this.itemHeight;
  }

  private update(): void {
    const containerHeight = this.container.clientHeight;
    
    this.visibleStartIndex = Math.max(
      0,
      Math.floor(this.scrollTop / this.itemHeight) - this.overscanCount
    );
    
    this.visibleEndIndex = Math.min(
      this.itemCount - 1,
      Math.floor((this.scrollTop + containerHeight) / this.itemHeight) + this.overscanCount
    );

    this.scrollContainer.style.height = this.getTotalHeight().toString() + 'px';

    const newItems = new Set<number>();
    
    for (let i = this.visibleStartIndex; i <= this.visibleEndIndex; i++) {
      newItems.add(i);
    }

    this.items.forEach((item, index) => {
      if (!newItems.has(index)) {
        item.element.remove();
        this.items.delete(index);
      }
    });

    const contentTop = this.getItemTop(this.visibleStartIndex);
    this.contentElement.style.transform = `translateY(${contentTop}px)`;

    for (let i = this.visibleStartIndex; i <= this.visibleEndIndex; i++) {
      if (!this.items.has(i)) {
        const element = this.renderItem(i);
        element.style.position = 'absolute';
        element.style.top = this.getItemTop(i) - contentTop + 'px';
        element.style.left = '0';
        element.style.width = '100%';
        
        this.contentElement.appendChild(element);
        
        this.items.set(i, {
          index: i,
          element,
          top: this.getItemTop(i),
          height: this.getItemHeight(i),
        });
      }
    }
  }

  updateItemCount(count: number): void {
    this.itemCount = count;
    this.update();
  }

  updateItemHeight(index: number, height: number): void {
    const item = this.items.get(index);
    if (item) {
      item.height = height;
      item.element.style.height = height + 'px';
      this.update();
    }
  }

  scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'): void {
    const itemTop = this.getItemTop(index);
    const containerHeight = this.container.clientHeight;
    const itemHeight = this.getItemHeight(index);
    
    let scrollPosition = itemTop;
    
    if (align === 'center') {
      scrollPosition = itemTop - (containerHeight - itemHeight) / 2;
    } else if (align === 'end') {
      scrollPosition = itemTop - containerHeight + itemHeight;
    }
    
    this.container.scrollTo({
      top: Math.max(0, scrollPosition),
      behavior: 'smooth',
    });
  }

  getVisibleIndices(): [number, number] {
    return [this.visibleStartIndex, this.visibleEndIndex];
  }

  getItemElement(index: number): HTMLElement | undefined {
    return this.items.get(index)?.element;
  }

  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.items.forEach((item) => {
      item.element.remove();
    });
    this.items.clear();
    this.container.removeEventListener('scroll', this.onScroll.bind(this));
  }
}

export const virtualListService = new (VirtualListService as any)();