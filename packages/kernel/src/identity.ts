declare const opaqueIdBrand: unique symbol;

export type OpaqueId<Name extends string> = string & {
  readonly [opaqueIdBrand]: Name;
};

export type AggregateId = OpaqueId<"AggregateId">;
export type CommandId = OpaqueId<"CommandId">;
export type CorrelationId = OpaqueId<"CorrelationId">;
export type EventId = OpaqueId<"EventId">;
export type IdempotencyKey = OpaqueId<"IdempotencyKey">;

export function createOpaqueId<T extends string>(value: string): OpaqueId<T> {
  if (value.length === 0) {
    throw new TypeError("Opaque identity must be non-empty.");
  }

  if (value.trim() !== value) {
    throw new TypeError("Opaque identity must use its canonical value.");
  }

  return value as OpaqueId<T>;
}

export function sameLogicalIdentity<T extends string>(
  left: OpaqueId<T>,
  right: OpaqueId<T>,
): boolean {
  return left === right;
}
