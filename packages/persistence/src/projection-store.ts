import { isDeepStrictEqual } from "node:util";

import type {
  AtomicProjectionStore,
  ProjectionRebuild,
  ProjectionRebuildIdentity,
} from "../../kernel/src/projection.ts";

export class ProjectionCandidateNotFound extends Error {
  readonly rebuildId: string;

  constructor(rebuildId: string) {
    super(`No staged Projection candidate exists for rebuild ${rebuildId}.`);
    this.name = "ProjectionCandidateNotFound";
    this.rebuildId = rebuildId;
  }
}

export class ProjectionIdentityMismatch extends Error {
  readonly rebuildId: string;

  constructor(rebuildId: string) {
    super(`Staged Projection identity does not match rebuild ${rebuildId}.`);
    this.name = "ProjectionIdentityMismatch";
    this.rebuildId = rebuildId;
  }
}

export class ProjectionCandidateConflict extends Error {
  readonly projectionName: string;
  readonly projectionVersion: number;
  readonly rebuildId: string;

  constructor(
    projectionName: string,
    projectionVersion: number,
    rebuildId: string,
  ) {
    super(
      `Projection candidate ${projectionName}@${projectionVersion} ` +
        `for rebuild ${rebuildId} conflicts with the staged candidate.`,
    );
    this.name = "ProjectionCandidateConflict";
    this.projectionName = projectionName;
    this.projectionVersion = projectionVersion;
    this.rebuildId = rebuildId;
  }
}

export class ProjectionCheckpointRegression extends Error {
  readonly projectionName: string;
  readonly currentCheckpoint: bigint;
  readonly candidateCheckpoint: bigint;

  constructor(
    projectionName: string,
    currentCheckpoint: bigint,
    candidateCheckpoint: bigint,
  ) {
    super(
      `Projection ${projectionName} checkpoint cannot regress from ` +
        `${currentCheckpoint} to ${candidateCheckpoint}.`,
    );
    this.name = "ProjectionCheckpointRegression";
    this.projectionName = projectionName;
    this.currentCheckpoint = currentCheckpoint;
    this.candidateCheckpoint = candidateCheckpoint;
  }
}

export class ProjectionInvalidationConflict extends Error {
  readonly projectionName: string;
  readonly projectionVersion: number;
  readonly rebuildId: string;

  constructor(expected: ProjectionRebuildIdentity) {
    super(
      `Projection ${expected.projectionName} current generation does not match ` +
        `${expected.projectionVersion}/${expected.rebuildId} for invalidation.`,
    );
    this.name = "ProjectionInvalidationConflict";
    this.projectionName = expected.projectionName;
    this.projectionVersion = expected.projectionVersion;
    this.rebuildId = expected.rebuildId;
  }
}

export class InMemoryProjectionStore<TState>
  implements AtomicProjectionStore<TState>
{
  readonly #candidates = new Map<string, ProjectionRebuild<TState>>();
  readonly #current = new Map<string, ProjectionRebuild<TState>>();
  readonly #invalidated = new Map<string, ProjectionRebuildIdentity>();

  async stage(rebuild: ProjectionRebuild<TState>): Promise<void> {
    if (rebuild.rebuildStatus !== "COMPLETED_AWAITING_PROMOTION") {
      throw new TypeError("Only complete Projection rebuilds can be staged.");
    }

    const candidate = structuredClone(rebuild);
    const key = this.#candidateKey(candidate);
    const existing = this.#candidates.get(key);
    if (existing !== undefined) {
      if (isDeepStrictEqual(existing, candidate)) {
        return;
      }
      throw new ProjectionCandidateConflict(
        candidate.projectionName,
        candidate.projectionVersion,
        candidate.rebuildId,
      );
    }

    this.#candidates.set(key, candidate);
  }

  async current(
    projectionName: string,
  ): Promise<ProjectionRebuild<TState> | null> {
    const current = this.#current.get(projectionName);
    return current === undefined ? null : structuredClone(current);
  }

  async promote(rebuild: ProjectionRebuild<TState>): Promise<void> {
    const key = this.#candidateKey(rebuild);
    const candidate = this.#candidates.get(key);
    if (candidate === undefined) {
      if (
        [...this.#candidates.values()].some(
          (staged) => staged.rebuildId === rebuild.rebuildId,
        )
      ) {
        throw new ProjectionIdentityMismatch(rebuild.rebuildId);
      }
      throw new ProjectionCandidateNotFound(rebuild.rebuildId);
    }
    if (!isDeepStrictEqual(candidate, rebuild)) {
      throw new ProjectionCandidateConflict(
        rebuild.projectionName,
        rebuild.projectionVersion,
        rebuild.rebuildId,
      );
    }

    const current = this.#current.get(candidate.projectionName);
    if (
      current !== undefined &&
      this.#candidateKey(current) === key
    ) {
      return;
    }
    if (
      current !== undefined &&
      candidate.checkpoint < current.checkpoint
    ) {
      throw new ProjectionCheckpointRegression(
        candidate.projectionName,
        current.checkpoint,
        candidate.checkpoint,
      );
    }

    this.#current.set(candidate.projectionName, candidate);
  }

  async invalidate(expected: ProjectionRebuildIdentity): Promise<void> {
    const current = this.#current.get(expected.projectionName);
    if (current !== undefined) {
      if (!this.#hasIdentity(current, expected)) {
        throw new ProjectionInvalidationConflict(expected);
      }
      this.#current.delete(expected.projectionName);
      this.#invalidated.set(expected.projectionName, structuredClone(expected));
      return;
    }

    const invalidated = this.#invalidated.get(expected.projectionName);
    if (
      invalidated !== undefined &&
      this.#hasIdentity(invalidated, expected)
    ) {
      return;
    }
    throw new ProjectionInvalidationConflict(expected);
  }

  #candidateKey(
    rebuild: ProjectionRebuildIdentity,
  ): string {
    return JSON.stringify([
      rebuild.projectionName,
      rebuild.projectionVersion,
      rebuild.rebuildId,
    ]);
  }

  #hasIdentity(
    first: ProjectionRebuildIdentity,
    second: ProjectionRebuildIdentity,
  ): boolean {
    return this.#candidateKey(first) === this.#candidateKey(second);
  }
}
