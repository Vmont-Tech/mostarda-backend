import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("Real Edge Runtime source has no Demo contract or demo-route dependency", async () => {
  const sourceRoot = path.resolve("packages/edge-runtime/src");
  const files = ["runtime.ts", "storage.ts", "cloud-client.ts", "bootstrap.ts", "cloud-contracts.ts"];
  const source = (await Promise.all(files.map((file) => readFile(path.join(sourceRoot, file), "utf8")))).join("\n");
  assert.doesNotMatch(source, /DemoCloud|DEMO_|\/v1\/demo|campaign-demo-001/);
});
