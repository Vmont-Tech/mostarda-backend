import fs from "node:fs";
import path from "node:path";
import { createHardwareValidationRecord } from "../packages/edge-hardware-validation/src/index.ts";

const root = process.cwd();
const discoveryPath = path.join(root, "artifacts/edge-discovery/mxq-pro-4k-5g/discovery-2026-08-10.json");
const profilePath = path.join(root, "artifacts/edge-hardware-profiles/mxq-pro-4k-5g/hardware-profile-candidate-2026-08-10.json");
const outputPath = path.join(root, "artifacts/edge-hardware-validation/mxq-pro-4k-5g/hardware-validation-2026-08-10.json");

const { discovery } = JSON.parse(fs.readFileSync(discoveryPath, "utf8"));
const { profile } = JSON.parse(fs.readFileSync(profilePath, "utf8"));
const validation = createHardwareValidationRecord({
  discovery,
  profile,
  validatedAt: "2026-08-10T20:45:54.567Z",
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ validation }, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(root, outputPath)}`);
