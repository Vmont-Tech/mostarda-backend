import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type DemoAsset,
  type DemoEvidence,
  type DemoManifest,
  type DemoPlayback,
  type DemoTelemetryEvent,
} from "../../e2e-slice/src/contracts.ts";

export const EDGE_RUNTIME_STATE_VERSION = 1 as const;

export interface EdgeRuntimeIdentity {
  readonly edgeId: string;
  readonly environment: "development" | "test" | "production";
  readonly createdAt: string;
}

export interface EdgeRuntimeState {
  readonly schemaVersion: typeof EDGE_RUNTIME_STATE_VERSION;
  readonly identity?: EdgeRuntimeIdentity;
  readonly manifest?: DemoManifest;
  readonly asset?: DemoAsset;
  readonly playback?: DemoPlayback;
  readonly playbackSequence: number;
  readonly telemetryQueue: readonly DemoTelemetryEvent[];
  readonly evidenceQueue: readonly DemoEvidence[];
}

function emptyState(): EdgeRuntimeState {
  return {
    schemaVersion: EDGE_RUNTIME_STATE_VERSION,
    playbackSequence: 0,
    telemetryQueue: [],
    evidenceQueue: [],
  };
}

export class JsonEdgeStorage {
  readonly #root: string;
  readonly #stateFile: string;

  constructor(root: string) {
    if (root.trim().length === 0) throw new Error("edge storage root is required");
    this.#root = path.resolve(root);
    this.#stateFile = path.join(this.#root, "edge-runtime-state.json");
  }

  async load(): Promise<EdgeRuntimeState> {
    await mkdir(this.#root, { recursive: true });
    try {
      const raw = await readFile(this.#stateFile, "utf8");
      const parsed: unknown = JSON.parse(raw);
      return this.#validate(parsed);
    } catch (error) {
      if (isMissingFile(error)) return emptyState();
      throw error;
    }
  }

  async save(state: EdgeRuntimeState): Promise<void> {
    if (state.schemaVersion !== EDGE_RUNTIME_STATE_VERSION) {
      throw new Error("unsupported Edge runtime state version");
    }
    await mkdir(this.#root, { recursive: true });
    const temporaryFile = `${this.#stateFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(state)}\n`, "utf8");
    await rename(temporaryFile, this.#stateFile);
  }

  #validate(value: unknown): EdgeRuntimeState {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("invalid Edge runtime state");
    }
    const state = value as Record<string, unknown>;
    if (state.schemaVersion !== EDGE_RUNTIME_STATE_VERSION || typeof state.playbackSequence !== "number" || !Array.isArray(state.telemetryQueue) || !Array.isArray(state.evidenceQueue)) {
      throw new Error("invalid Edge runtime state schema");
    }
    return state as unknown as EdgeRuntimeState;
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
