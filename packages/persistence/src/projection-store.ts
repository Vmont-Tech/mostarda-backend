import { isDeepStrictEqual } from "node:util";

import type {
  AtomicProjectionStore,
  ProjectionRebuild,
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

export class InMemoryProjectionStore<TState>
  implements AtomicProjectionStore<TState>
{
  readonly #candidates = new Map<string, ProjectionRebuild<TState>>();
  readonly #current = new Map<string, ProjectionRebuild<TState>>();

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

  #candidateKey(
    rebuild: ProjectionRebuild<TState>,
  ): string {
    return JSON.stringify([
      rebuild.projectionName,
      rebuild.projectionVersion,
      rebuild.rebuildId,
    ]);
  }
}
