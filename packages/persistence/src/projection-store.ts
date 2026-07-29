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

    const existing = this.#candidates.get(rebuild.rebuildId);
    if (existing !== undefined) {
      this.#assertIdentity(existing, rebuild);
      return;
    }

    this.#candidates.set(rebuild.rebuildId, structuredClone(rebuild));
  }

  async current(
    projectionName: string,
  ): Promise<ProjectionRebuild<TState> | null> {
    const current = this.#current.get(projectionName);
    return current === undefined ? null : structuredClone(current);
  }

  async promote(rebuild: ProjectionRebuild<TState>): Promise<void> {
    const candidate = this.#candidates.get(rebuild.rebuildId);
    if (candidate === undefined) {
      throw new ProjectionCandidateNotFound(rebuild.rebuildId);
    }
    this.#assertIdentity(candidate, rebuild);

    const current = this.#current.get(candidate.projectionName);
    if (current?.rebuildId === candidate.rebuildId) {
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

  #assertIdentity(
    candidate: ProjectionRebuild<TState>,
    rebuild: ProjectionRebuild<TState>,
  ): void {
    if (
      candidate.projectionName !== rebuild.projectionName ||
      candidate.projectionVersion !== rebuild.projectionVersion
    ) {
      throw new ProjectionIdentityMismatch(rebuild.rebuildId);
    }
  }
}
