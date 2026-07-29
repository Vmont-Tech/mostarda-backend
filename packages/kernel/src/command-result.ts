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
  readonly observedRevision: bigint | null;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly errors: readonly ErrorDescriptor[];
  readonly eventIds: readonly string[];
}

export interface AcceptedResult<T> extends CommandResultBase {
  readonly status: "Accepted";
  readonly newRevision: bigint | null;
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
  readonly expectedRevision?: bigint;
  readonly actualRevision?: bigint;
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
  validateBase(result);
  if (result.eventIds.length > 0 && result.newRevision === null) {
    throw new TypeError("Accepted mutation requires newRevision.");
  }
  return Object.freeze({
    ...result,
    errors: Object.freeze([...result.errors]),
    eventIds: Object.freeze([...result.eventIds]),
    status: "Accepted",
  });
}

export function conflict(
  result: Omit<FailedResult, "status">,
): FailedResult {
  return failed("Conflict", result);
}

type FailureStatus = FailedResult["status"];

function failed(
  status: FailureStatus,
  result: Omit<FailedResult, "status">,
): FailedResult {
  validateBase(result);
  if (result.eventIds.length !== 0) {
    throw new TypeError("Failed CommandResult cannot publish Events.");
  }
  return Object.freeze({
    ...result,
    errors: Object.freeze([...result.errors]),
    eventIds: Object.freeze([...result.eventIds]),
    status,
  });
}

function validateBase(result: CommandResultBase): void {
  for (const value of [result.commandId, result.correlationId]) {
    if (value.trim() === "") {
      throw new TypeError("CommandResult identity cannot be empty.");
    }
  }
}

export const rejected = (
  result: Omit<FailedResult, "status">,
): FailedResult => failed("Rejected", result);

export const expired = (
  result: Omit<FailedResult, "status">,
): FailedResult => failed("Expired", result);

export const unauthorized = (
  result: Omit<FailedResult, "status">,
): FailedResult => failed("Unauthorized", result);

export const invariantViolation = (
  result: Omit<FailedResult, "status">,
): FailedResult => failed("InvariantViolation", result);

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
