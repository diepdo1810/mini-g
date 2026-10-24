export interface RandomSource {
  next(): number;
  choose<T>(items: readonly T[]): T;
}

export class DefaultRandomSource implements RandomSource {
  public next(): number {
    return Math.random();
  }

  public choose<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    const idx = Math.floor(Math.random() * items.length);
    return items[idx];
  }
}

export class MockRandomSource implements RandomSource {
  private values: number[];
  private index = 0;

  constructor(values: number[] = [0.1]) {
    this.values = values;
  }

  public setValues(values: number[]): void {
    this.values = values;
    this.index = 0;
  }

  public next(): number {
    const val = this.values[this.index % this.values.length];
    this.index++;
    return val;
  }

  public choose<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    const idx = Math.floor(this.next() * items.length);
    return items[Math.min(idx, items.length - 1)];
  }
}
