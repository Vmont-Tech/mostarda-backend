export type CommandStatus =
  | "Accepted"
  | "Rejected"
  | "Conflict"
  | "Duplicate"
  | "Expired"
  | "Unauthorized"
  | "InvariantViolation";

export interface AcceptedResult<T> {
  readonly status: "Accepted";
  readonly commandId: string;
  readonly aggregateId: string;
  readonly aggregateRevision: number;
  readonly eventIds: readonly string[];
  readonly value: T;
}

export interface FailedResult {
  readonly status:
    | "Rejected"
    | "Conflict"
    | "Expired"
    | "Unauthorized"
    | "InvariantViolation";
  readonly commandId: string;
  readonly code: string;
  readonly expectedRevision?: number;
  readonly actualRevision?: number;
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export interface DuplicateResult<T> {
  readonly status: "Duplicate";
  readonly commandId: string;
  readonly originalResult: Exclude<CommandResult<T>, DuplicateResult<T>>;
}

export type CommandResult<T> =
  | AcceptedResult<T>
  | FailedResult
  | DuplicateResult<T>;

export function accepted<T>(
  result: Omit<AcceptedResult<T>, "status">,
): AcceptedResult<T> {
  return Object.freeze({ status: "Accepted", ...result });
}

export function conflict(
  result: Omit<FailedResult, "status">,
): FailedResult {
  return Object.freeze({ status: "Conflict", ...result });
}

export function duplicate<T>(
  commandId: string,
  originalResult: Exclude<CommandResult<T>, DuplicateResult<T>>,
): DuplicateResult<T> {
  return Object.freeze({
    status: "Duplicate",
    commandId,
    originalResult,
  });
}
