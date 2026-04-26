export class SAError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SAError';
    this.code = code;
  }
}

export class SAConfigError extends SAError {
  constructor(message: string) {
    super('SA_CONFIG_ERROR', message);
    this.name = 'SAConfigError';
  }
}

export class ConstraintValidationError extends SAError {
  constructor(message: string) {
    super('SA_CONSTRAINT_VALIDATION_ERROR', message);
    this.name = 'ConstraintValidationError';
  }
}

export class SolveConcurrencyError extends SAError {
  constructor(message: string) {
    super('SA_SOLVE_CONCURRENCY_ERROR', message);
    this.name = 'SolveConcurrencyError';
  }
}

export class SolveCancelledError extends SAError {
  constructor(message = 'Simulated annealing solve cancelled') {
    super('SA_SOLVE_CANCELLED', message);
    this.name = 'SolveCancelledError';
  }
}
