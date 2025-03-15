export interface IStorage<T> {
  get(): T | null;
  set(data: T): void;
  clear(): void;
}

export class Storage<T> implements IStorage<T> {
  private key: string;

  constructor(key: string) {
    this.key = `jbat_${key}`;
  }

  get(): T | null {
    if (typeof window === "undefined") {
      return null;
    }

    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : null;
  }

  set(data: T): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(this.key, JSON.stringify(data));
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}
