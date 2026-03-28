import type { Logger } from '../telemetry/Logger.js';

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
