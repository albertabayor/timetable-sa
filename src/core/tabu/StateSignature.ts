import type { Logger } from '../telemetry/Logger.js';

/**
 * Serializes an unknown value into a deterministic string.
 *
 * Unlike `JSON.stringify`, this function sorts object keys so equivalent
 * objects produce the same output regardless of property insertion order.
 * It also handles values that JSON cannot represent directly, such as
 * `bigint`, `undefined`, functions, symbols, and circular references.
 *
 * This is primarily used as a generic fallback for generating stable
 * state signatures when a domain-specific `getStateSignature` is not
 * provided.
 *
 * @param value - Any value to serialize into a stable string form
 * @param seen - Internal WeakSet used to detect circular references during recursion
 * @returns A deterministic string representation of the input value
 *
 * @example
 * ```typescript
 * stableStringify({ b: 2, a: 1 });
 * // => '{"a":1,"b":2}'
 * ```
 *
 * @example
 * ```typescript
 * const state = {
 *   schedule: [{ classId: 'IF101' }],
 *   helper: () => 'ignored',
 * };
 *
 * stableStringify(state);
 * // => '{"helper":[Function],"schedule":[{"classId":"IF101"}]}'
 * ```
 *
 * @example
 * ```typescript
 * const node: { self?: unknown } = {};
 * node.self = node;
 *
 * stableStringify(node);
 * // => '{"self":[Circular]}'
 * ```
 */
export function stableStringify(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return 'null';

  const valueType = typeof value;
  if (valueType === 'number' || valueType === 'boolean') {
    return String(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'bigint') {
    return `${value.toString()}n`;
  }

  if (valueType === 'undefined') {
    return 'undefined';
  }

  if (valueType === 'function') {
    return '[Function]';
  }

  if (valueType === 'symbol') {
    return '[Symbol]';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item, seen)).join(',')}]`;
  }

  if (valueType === 'object') {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) {
      return '[Circular]';
    }

    seen.add(obj);
    const keys = Object.keys(obj).sort();
    const content = keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key], seen)}`)
      .join(',');
    seen.delete(obj);

    return `{${content}}`;
  }

  return String(value);
}

/**
 * Generates a stable signature for a solver state.
 *
 * Resolution order:
 * 1. Use `customSignature` if provided
 * 2. If the state has a `schedule` array, derive a timetable-oriented signature
 * 3. Otherwise, fall back to `stableStringify(state)`
 *
 * For timetable states, only the core assignment identity is used:
 * `classId:day:startTime:room`
 *
 * The resulting assignment strings are sorted before joining so two schedules
 * with identical placements but different array order still produce the same
 * signature.
 *
 * @template TState - State type used by the solver
 * @param state - Current solver state
 * @param logger - Logger used to report custom signature fallback warnings
 * @param customSignature - Optional user-supplied signature generator
 * @returns A deterministic signature string suitable for tabu memory and caching
 *
 * @throws {Error}
 * Thrown when the state has no usable `schedule` array and cannot be
 * deterministically serialized by `stableStringify`.
 *
 * @example
 * ```typescript
 * const state = {
 *   schedule: [
 *     {
 *       classId: 'IF202',
 *       room: 'LAB1',
 *       timeSlot: { day: 'Tuesday', startTime: '10:15' },
 *     },
 *     {
 *       classId: 'IF101',
 *       room: 'R101',
 *       timeSlot: { day: 'Monday', startTime: '07:30' },
 *     },
 *   ],
 * };
 *
 * getDefaultStateSignature(state, logger);
 * // => 'IF101:Monday:07:30:R101|IF202:Tuesday:10:15:LAB1'
 * ```
 *
 * @example
 * ```typescript
 * const state = { foo: 1, bar: true };
 *
 * getDefaultStateSignature(state, logger);
 * // => '{"bar":true,"foo":1}'
 * ```
 *
 * @example
 * ```typescript
 * const customSignature = (state: { schedule: unknown[] }) => `classes=${state.schedule.length}`;
 *
 * getDefaultStateSignature({ schedule: [1, 2, 3] }, logger, customSignature);
 * // => 'classes=3'
 * ```
 */
export function getDefaultStateSignature<TState>(
  state: TState,
  logger: Logger,
  customSignature?: (state: TState) => string
): string {
  if (customSignature) {
    try {
      return customSignature(state);
    } catch (error) {
      logger.log('warn', 'Custom getStateSignature failed, falling back to default', { error });
    }
  }

  const schedule = (state as { schedule?: unknown }).schedule;
  if (!schedule || !Array.isArray(schedule)) {
    try {
      return stableStringify(state);
    } catch {
      throw new Error(
        'Unable to generate deterministic state signature. Please provide config.getStateSignature for your state type.'
      );
    }
  }

  const assignments: string[] = [];
  for (const entry of schedule as Array<{ classId?: string; timeSlot?: { day?: string; startTime?: string }; room?: string }>) {
    if (entry.classId && entry.timeSlot && entry.room) {
      assignments.push(`${entry.classId}:${entry.timeSlot.day}:${entry.timeSlot.startTime}:${entry.room}`);
    }
  }

  return assignments.sort().join('|');
}
