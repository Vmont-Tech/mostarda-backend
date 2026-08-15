import { HostHardwareAdapter } from "../packages/edge-runtime/src/index.ts";
import { runMxqEvidenceDiscovery } from "./mxq-discovery-real.ts";

const discovery = await new HostHardwareAdapter(process.cwd()).discover();
const mxq = runMxqEvidenceDiscovery({
  discoveryId: "disc-mxq-software-validation",
  startedAt: "2026-08-11T00:00:00.000Z",
  capturedAt: "2026-08-11T00:00:01.000Z",
  sealedAt: "2026-08-11T00:00:02.000Z",
  evaluatedAt: "2026-08-11T00:00:03.000Z",
  evaluationId: "compat-mxq-software-validation",
  evidenceReference: "software-validation:no-physical-session",
});
console.log(JSON.stringify({
  artifactKind: "SOFTWARE_HARDWARE_VALIDATION",
  hostDiscovery: discovery,
  mxqDiscovery: mxq.discovery,
  compatibility: mxq.compatibility,
  provisioning: "BLOCKED",
  physicalMxqValidation: "NOT_PERFORMED",
}, null, 2));
