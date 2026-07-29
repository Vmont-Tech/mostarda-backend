import type { ErrorDescriptor } from "./errors.ts";

export type CommandStatus =
  | "Accepted"
  | "Rejected"
  | "Conflict"
  | "Duplicate"
  | "Expired"
  | "Unauthorized"
  | "InvariantViolation";

export interface CommandResultBase {
  readonly commandId: string;
  readonly aggregateId: string | null;
  readonly observedRevision: number | null;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly errors: readonly ErrorDescriptor[];
  readonly eventIds: readonly string[];
}

export interface AcceptedResult<T> extends CommandResultBase {
  readonly status: "Accepted";
  readonly newRevision: number | null;
  readonly value: T;
}

export interface FailedResult extends CommandResultBase {
  readonly status:
    | "Rejected"
    | "Conflict"
    | "Expired"
    | "Unauthorized"
    | "InvariantViolation";
  readonly code: string;
  readonly expectedRevision?: number;
  readonly actualRevision?: number;
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export interface DuplicateResult<T> extends CommandResultBase {
  readonly status: "Duplicate";
  readonly originalResult: Exclude<CommandResult<T>, DuplicateResult<T>>;
}

export type CommandResult<T> =
  | AcceptedResult<T>
  | FailedResult
  | DuplicateResult<T>;

export function accepted<T>(
  result: Omit<AcceptedResult<T>, "status">,
): AcceptedResult<T> {
  return Object.freeze({
    status: "Accepted",
    ...result,
    errors: Object.freeze([...result.errors]),
    eventIds: Object.freeze([...result.eventIds]),
  });
}

export function conflict(
  result: Omit<FailedResult, "status">,
): FailedResult {
  return Object.freeze({
    status: "Conflict",
    ...result,
    errors: Object.freeze([...result.errors]),
    eventIds: Object.freeze([...result.eventIds]),
  });
}

export function duplicate<T>(
  originalResult: Exclude<CommandResult<T>, DuplicateResult<T>>,
): DuplicateResult<T> {
  return Object.freeze({
    status: "Duplicate",
    commandId: originalResult.commandId,
    aggregateId: originalResult.aggregateId,
    observedRevision: originalResult.observedRevision,
    correlationId: originalResult.correlationId,
    causationId: originalResult.causationId,
    errors: originalResult.errors,
    eventIds: originalResult.eventIds,
    originalResult,
  });
}
