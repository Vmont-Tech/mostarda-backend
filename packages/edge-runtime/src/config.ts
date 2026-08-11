import { readFile } from "node:fs/promises";

export const EDGE_RUNTIME_SETTINGS_VERSION = 1 as const;

export type EdgeRuntimeEnvironment = "development" | "test" | "production";

export interface EdgeRuntimeSettings {
  readonly schemaVersion: typeof EDGE_RUNTIME_SETTINGS_VERSION;
  readonly edgeId: string;
  readonly environment: EdgeRuntimeEnvironment;
  readonly cloudEndpoint: string;
  readonly syncIntervalSeconds: number;
  readonly cacheDirectory: string;
  readonly telemetryRetry: {
    readonly maxAttempts: number;
    readonly backoffMs: number;
  };
  readonly player: {
    readonly mode: "browser";
    readonly enabled: boolean;
  };
}

export async function loadEdgeRuntimeSettings(filePath: string): Promise<EdgeRuntimeSettings> {
  if (filePath.trim().length === 0) throw new Error("invalid Edge Runtime settings: file path is required");
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error("invalid Edge Runtime settings: file cannot be read", { cause: error });
  }
  if (!isSettings(parsed)) throw new Error("invalid Edge Runtime settings");
  return parsed;
}

function isSettings(value: unknown): value is EdgeRuntimeSettings {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;
  if (
    settings.schemaVersion !== EDGE_RUNTIME_SETTINGS_VERSION ||
    typeof settings.edgeId !== "string" ||
    settings.edgeId.trim().length === 0 ||
    !isEnvironment(settings.environment) ||
    typeof settings.cloudEndpoint !== "string" ||
    !isHttpUrl(settings.cloudEndpoint) ||
    !isPositiveFiniteNumber(settings.syncIntervalSeconds) ||
    typeof settings.cacheDirectory !== "string" ||
    settings.cacheDirectory.trim().length === 0 ||
    !isRetry(settings.telemetryRetry) ||
    !isPlayer(settings.player)
  ) return false;
  return true;
}

function isEnvironment(value: unknown): value is EdgeRuntimeEnvironment {
  return value === "development" || value === "test" || value === "production";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRetry(value: unknown): value is EdgeRuntimeSettings["telemetryRetry"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const retry = value as Record<string, unknown>;
  return Number.isInteger(retry.maxAttempts) && Number(retry.maxAttempts) > 0 && isFiniteNonNegative(retry.backoffMs);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPlayer(value: unknown): value is EdgeRuntimeSettings["player"] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const player = value as Record<string, unknown>;
  return player.mode === "browser" && typeof player.enabled === "boolean";
}
