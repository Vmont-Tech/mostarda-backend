import { HostHardwareAdapter } from "../packages/edge-runtime/src/index.ts";

const result = await new HostHardwareAdapter(process.cwd()).discover();
console.log(JSON.stringify(result, null, 2));
