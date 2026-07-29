export type ErrorFamily =
  | "Validation"
  | "Authorization"
  | "Invariant"
  | "Concurrency"
  | "Idempotency"
  | "Compatibility"
  | "Infrastructure";

export interface ErrorDescriptor {
  readonly code: string;
  readonly family: ErrorFamily;
  readonly retryable: boolean;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export function defineError(descriptor: ErrorDescriptor): ErrorDescriptor {
  if (!/^[A-Z][A-Z0-9_]*$/.test(descriptor.code)) {
    throw new TypeError("Error code must be a stable machine identifier.");
  }

  return Object.freeze({
    ...descriptor,
    parameters: Object.freeze({ ...descriptor.parameters }),
  });
}
