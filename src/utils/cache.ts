// In your cache.ts file:
import * as fs from 'fs';
import * as path from 'path';

export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;
  private persist: boolean;
  private persistDir: string;

  constructor(options: { maxSize: number; persist: boolean; persistDir: string }) {
    this.maxSize = options.maxSize;
    this.persist = options.persist;
    this.persistDir = options.persistDir;
    
    if (this.persist && !fs.existsSync(this.persistDir)) {
      fs.mkdirSync(this.persistDir, { recursive: true });
    }
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, value: V): void {
    this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  get size(): number {
    return this.cache.size;
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }

  saveToDisk(): void {
    if (!this.persist) return;
    
    try {
      const cachePath = path.join(this.persistDir, 'cache.json');
      const serializable: Record<string, any> = {};
      for (const [key, value] of this.cache.entries()) {
        if (typeof key === 'string') {
          serializable[key] = value;
        }
      }
      fs.writeFileSync(cachePath, JSON.stringify(serializable, null, 2));
    } catch (error) {
      console.error('Failed to save cache to disk');
    }
  }

  loadFromDisk(): void {
    if (!this.persist) return;
    try {
      const cachePath = path.join(this.persistDir, 'cache.json');
      if (!fs.existsSync(cachePath)) return;
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      this.cache.clear();
      for (const [key, value] of Object.entries(data)) {
        if (typeof key === 'string') {
          this.cache.set(key as unknown as K, value as V);
        }
      }
    } catch (error) {
      console.error('Failed to load cache from disk');
    }
  }
}
