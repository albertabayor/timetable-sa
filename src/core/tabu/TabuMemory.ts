export class TabuMemory {
  private readonly tabuList: Map<string, number>;
  private readonly tenure: number;
  private readonly maxSize: number;

  constructor(tenure: number, maxSize: number, backingStore?: Map<string, number>) {
    this.tenure = tenure;
    this.maxSize = maxSize;
    this.tabuList = backingStore ?? new Map<string, number>();
  }

  clear(): void {
    this.tabuList.clear();
  }

  get size(): number {
    return this.tabuList.size;
  }

  contains(signature: string, currentIteration: number): boolean {
    const addedAt = this.tabuList.get(signature);
    if (addedAt === undefined) return false;
    return currentIteration - addedAt < this.tenure;
  }

  shouldSkip(
    signature: string,
    currentIteration: number,
    newFitness: number,
    globalBestFitness: number,
    aspirationEnabled: boolean
  ): boolean {
    if (!this.contains(signature, currentIteration)) {
      return false;
    }

    if (aspirationEnabled && newFitness < globalBestFitness) {
      return false;
    }

    return true;
  }

  add(signature: string, iteration: number): void {
    this.tabuList.set(signature, iteration);

    if (this.tabuList.size > this.maxSize || iteration % 100 === 0) {
      this.cleanup(iteration);
    }
  }

  cleanup(currentIteration: number): void {
    const expiredKeys: string[] = [];

    for (const [key, addedAt] of this.tabuList.entries()) {
      if (currentIteration - addedAt >= this.tenure) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.tabuList.delete(key);
    }

    if (this.tabuList.size > this.maxSize * 0.8) {
      const entries = [...this.tabuList.entries()].sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, Math.floor(entries.length * 0.3));
      for (const [key] of toRemove) {
        this.tabuList.delete(key);
      }
    }
  }
}
