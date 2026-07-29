export const ERROR_FAMILIES = Object.freeze([
  "AUTHORIZATION",
  "VALIDATION",
  "INVARIANT",
  "CONCURRENCY",
  "IDEMPOTENCY",
  "EXPIRATION",
  "REPLAY",
  "SCHEMA",
  "PERSISTENCE_PUBLICATION",
  "PROJECTION_REBUILD",
  "SAGA_COORDINATION",
] as const);

export type ErrorFamily = (typeof ERROR_FAMILIES)[number];

export interface ErrorDescriptor {
  readonly code: string;
  readonly family: ErrorFamily;
  readonly meaning: string;
  readonly condition: string;
  readonly retryable: boolean;
  readonly recoverable: boolean;
  readonly severity: string;
  readonly consumer: string;
  readonly relatedIdentity: string | null;
  readonly safeContext: Readonly<Record<string, unknown>>;
  readonly version: number;
}

export function defineError(descriptor: ErrorDescriptor): ErrorDescriptor {
  const valid =
    /^[A-Z][A-Z0-9_]*$/.test(descriptor.code) &&
    descriptor.meaning.trim() !== "" &&
    descriptor.condition.trim() !== "" &&
    descriptor.severity.trim() !== "" &&
    descriptor.consumer.trim() !== "" &&
    Number.isSafeInteger(descriptor.version) &&
    descriptor.version > 0;

  if (!valid) {
    throw new TypeError(
      "Error descriptor must provide every mandatory TBS field with valid values.",
    );
  }

  return Object.freeze({
    ...descriptor,
    safeContext: Object.freeze(structuredClone(descriptor.safeContext)),
  });
}
