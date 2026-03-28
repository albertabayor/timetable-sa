import type { SAConfig } from '../interfaces/SAConfig.js';

export type PhaseName = 'phase1' | 'phase15' | 'phase2' | 'initial';

export interface InternalProgressState {
  acceptedMoves: number;
  rejectedMoves: number;
  stagnationCount: number;
  bestCostIteration: number;
  currentPhase: PhaseName;
  lastProgressIteration: number;
  initialCost: number;
  tabuHits: number;
}

export type ResolvedLoggingConfig = Required<NonNullable<SAConfig<unknown>['logging']>>;

export interface ResolvedSAConfig<TState> extends SAConfig<TState> {
  reheatingFactor: number;
  maxReheats: number;
  tabuSearchEnabled: boolean;
  tabuTenure: number;
  maxTabuListSize: number;
  aspirationEnabled: boolean;
  enableIntensification: boolean;
  intensificationIterations: number;
  maxIntensificationAttempts: number;
  intensificationStagnationLimit: number;
  getStateSignature?: (state: TState) => string;
  onProgressMode: 'await' | 'fire-and-forget';
  logging: Required<NonNullable<SAConfig<TState>['logging']>>;
}
