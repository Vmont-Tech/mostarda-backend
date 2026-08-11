import path from "node:path";

import type { DemoCloudClient } from "../../e2e-slice/src/edge.ts";
import { createHttpEdgeCloudClient } from "./cloud-client.ts";
import { loadEdgeRuntimeSettings } from "./config.ts";
import { RealEdgeRuntime, type EdgeRuntimeClock } from "./runtime.ts";
import { JsonEdgeStorage } from "./storage.ts";

export async function createEdgeRuntimeFromSettings(
  settingsFile: string,
  dependencies: { readonly cloud?: DemoCloudClient; readonly clock?: EdgeRuntimeClock } = {},
): Promise<RealEdgeRuntime> {
  const settings = await loadEdgeRuntimeSettings(settingsFile);
  const storageRoot = path.resolve(path.dirname(settingsFile), settings.cacheDirectory);
  return new RealEdgeRuntime({
    edgeId: settings.edgeId,
    environment: settings.environment,
    storage: new JsonEdgeStorage(storageRoot),
    cloud: dependencies.cloud ?? createHttpEdgeCloudClient(settings.cloudEndpoint),
    settings,
    clock: dependencies.clock,
    maxAttempts: settings.telemetryRetry.maxAttempts,
  });
}
