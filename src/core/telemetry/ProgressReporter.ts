import type { ProgressStats } from '../types/ProgressStats.js';
import type { InternalProgressState, PhaseName } from '../engine/EngineTypes.js';

export class ProgressReporter<TState> {
  private state: InternalProgressState = {
    acceptedMoves: 0,
    rejectedMoves: 0,
    stagnationCount: 0,
    bestCostIteration: 0,
    currentPhase: 'initial',
    lastProgressIteration: -1,
    initialCost: 0,
    tabuHits: 0,
  };

  reset(): void {
    this.state = {
      acceptedMoves: 0,
      rejectedMoves: 0,
      stagnationCount: 0,
      bestCostIteration: 0,
      currentPhase: 'initial',
      lastProgressIteration: -1,
      initialCost: 0,
      tabuHits: 0,
    };
  }

  snapshot(): InternalProgressState {
    return { ...this.state };
  }

  setInitialCost(cost: number): void {
    this.state.initialCost = cost;
  }

  setPhase(phase: PhaseName): boolean {
    if (this.state.currentPhase === phase) return false;
    this.state.currentPhase = phase;
    return true;
  }

  addTabuHit(): void {
    this.state.tabuHits++;
  }

  updateMoveStats(accepted: boolean, improved: boolean, bestCostIteration?: number): void {
    if (accepted) {
      this.state.acceptedMoves++;
      this.state.stagnationCount = improved ? 0 : this.state.stagnationCount + 1;
    } else {
      this.state.rejectedMoves++;
      this.state.stagnationCount++;
    }

    if (bestCostIteration !== undefined) {
      this.state.bestCostIteration = bestCostIteration;
    }
  }

  shouldTriggerProgress(
    iteration: number,
    onProgress: unknown,
    logInterval: number,
    force = false
  ): boolean {
    if (!onProgress) return false;
    if (force) return true;
    if (iteration === 0) return true;
    if (iteration === this.state.lastProgressIteration) return false;
    return iteration % logInterval === 0;
  }

  async triggerProgressCallback(
    iteration: number,
    currentCost: number,
    bestCost: number,
    temperature: number,
    hardViolations: number,
    softViolations: number,
    reheats: number,
    maxIterations: number,
    tabuSize: number,
    onProgress: ((
      iteration: number,
      currentCost: number,
      temperature: number,
      state: TState | null,
      stats: ProgressStats
    ) => void | Promise<void>) | undefined,
    mode: 'await' | 'fire-and-forget',
    onError: (error: unknown) => void
  ): Promise<void> {
    if (!onProgress) return;
    if (iteration === this.state.lastProgressIteration) return;

    this.state.lastProgressIteration = iteration;

    const stats: ProgressStats = {
      iteration,
      currentCost,
      bestCost,
      temperature,
      hardViolations,
      softViolations,
      tabuHits: this.state.tabuHits,
      tabuSize,
      phase: this.state.currentPhase,
      reheatingCount: reheats,
      acceptedMoves: this.state.acceptedMoves,
      rejectedMoves: this.state.rejectedMoves,
      stagnationCount: this.state.stagnationCount,
      bestCostIteration: this.state.bestCostIteration,
      progressPercent: Math.min(100, (iteration / maxIterations) * 100),
      initialCost: this.state.initialCost,
      improvement:
        this.state.initialCost > 0
          ? ((this.state.initialCost - bestCost) / this.state.initialCost) * 100
          : 0,
      timestamp: Date.now(),
    };

    const invoke = async (): Promise<void> => {
      try {
        const result = onProgress(iteration, currentCost, temperature, null, stats);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        onError(error);
      }
    };

    if (mode === 'fire-and-forget') {
      void invoke();
      return;
    }

    await invoke();
  }
}
