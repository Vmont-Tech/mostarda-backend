import type { ProjectionRebuild } from "../../kernel/src/projection.ts";

export type JsonbValue =
  | null
  | string
  | boolean
  | number
  | readonly JsonbValue[]
  | { readonly [key: string]: JsonbValue };

export function canonicalizeProjectionCandidate(
  candidate: ProjectionRebuild<unknown>,
): ProjectionRebuild<JsonbValue> {
  const asOf = canonicalInstant(candidate.asOf, "candidate.asOf", true);
  const state = canonicalJsonbValue(
    candidate.state,
    "candidate.state",
    new Set(),
  );
  const stalenessValue = canonicalJsonbValue(
    candidate.staleness,
    "candidate.staleness",
    new Set(),
  );
  if (
    stalenessValue === null ||
    Array.isArray(stalenessValue) ||
    typeof stalenessValue !== "object"
  ) {
    throw new TypeError("candidate.staleness must be a plain object.");
  }

  const staleness = stalenessValue as Record<string, JsonbValue>;
  const stalenessAsOf = canonicalInstant(
    staleness.asOf,
    "candidate.staleness.asOf",
    true,
  );
  const evaluatedAt = canonicalInstant(
    staleness.evaluatedAt,
    "candidate.staleness.evaluatedAt",
    false,
  );
  if (stalenessAsOf !== asOf) {
    throw new TypeError(
      "candidate.staleness.asOf must match candidate.asOf.",
    );
  }
  if (
    staleness.lagMilliseconds !== null &&
    typeof staleness.lagMilliseconds !== "number"
  ) {
    throw new TypeError(
      "candidate.staleness.lagMilliseconds must be a finite number or null.",
    );
  }

  return {
    projectionName: candidate.projectionName,
    projectionVersion: candidate.projectionVersion,
    state,
    checkpoint: candidate.checkpoint,
    asOf,
    staleness: {
      ...staleness,
      asOf: stalenessAsOf,
      evaluatedAt,
      lagMilliseconds: staleness.lagMilliseconds,
    },
    rebuildId: candidate.rebuildId,
    rebuildStatus: candidate.rebuildStatus,
  };
}

function canonicalInstant(
  value: JsonbValue | undefined,
  field: string,
  nullable: true,
): string | null;
function canonicalInstant(
  value: JsonbValue | undefined,
  field: string,
  nullable: false,
): string;
function canonicalInstant(
  value: JsonbValue | undefined,
  field: string,
  nullable: boolean,
): string | null {
  if (nullable && value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new TypeError(
      `${field} must be a canonical ISO-8601 instant${nullable ? " or null" : ""}.`,
    );
  }
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString() !== value) {
    throw new TypeError(`${field} must be a canonical ISO-8601 instant.`);
  }
  return value;
}

function canonicalJsonbValue(
  value: unknown,
  path: string,
  ancestors: Set<object>,
): JsonbValue {
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    assertJsonbString(value, path);
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} contains a non-finite number.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} contains unsupported ${typeof value}.`);
  }
  if (ancestors.has(value)) {
    throw new TypeError(`${path} contains a cycle.`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return canonicalArray(value, path, ancestors);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} contains a non-plain object.`);
    }
    return canonicalObject(value, path, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function canonicalArray(
  value: readonly unknown[],
  path: string,
  ancestors: Set<object>,
): JsonbValue[] {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === "symbol")) {
    throw new TypeError(`${path} contains a symbol key.`);
  }

  const result: JsonbValue[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      throw new TypeError(`${path} contains a sparse array.`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !("value" in descriptor)) {
      throw new TypeError(`${path}[${index}] must be a data property.`);
    }
    result.push(
      canonicalJsonbValue(descriptor.value, `${path}[${index}]`, ancestors),
    );
  }

  const expectedKeys = new Set([
    "length",
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  if (keys.some((key) => !expectedKeys.has(key as string))) {
    throw new TypeError(`${path} contains an array property JSONB would drop.`);
  }
  return result;
}

function canonicalObject(
  value: object,
  path: string,
  ancestors: Set<object>,
): { [key: string]: JsonbValue } {
  const result: { [key: string]: JsonbValue } = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      throw new TypeError(`${path} contains a symbol key.`);
    }
    assertJsonbString(key, `${path} property name`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new TypeError(
        `${path}.${key} is a property JSONB would drop or evaluate.`,
      );
    }
    result[key] = canonicalJsonbValue(
      descriptor.value,
      `${path}.${key}`,
      ancestors,
    );
  }
  return result;
}

function assertJsonbString(value: string, path: string): void {
  if (value.includes("\u0000")) {
    throw new TypeError(`${path} contains a null character unsupported by JSONB.`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        throw new TypeError(`${path} contains an unpaired surrogate.`);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError(`${path} contains an unpaired surrogate.`);
    }
  }
}
