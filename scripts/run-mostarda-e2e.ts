import { runMostardaE2E } from "../packages/e2e-slice/src/e2e.ts";

const result = await runMostardaE2E();
console.log(JSON.stringify(result, null, 2));
