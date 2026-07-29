import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory()
        ? sourceFiles(target)
        : entry.name.endsWith(".ts")
          ? [target]
          : [];
    }),
  );
  return nested.flat();
}

test("Governance domain remains independent from infrastructure and frameworks", async () => {
  const files = await sourceFiles("packages/governance/src");

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*(?:persistence|fastify|pg|apps\/)/,
      `${file} crosses the domain boundary`,
    );
  }
});

test("transversal kernel does not know any bounded context", async () => {
  const files = await sourceFiles("packages/kernel/src");

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /governance|campaign|financial|settlement|pricing|telemetry/i,
      `${file} contains bounded-context knowledge`,
    );
  }
});

test("PostgreSQL remains behind the persistence adapter", async () => {
  const allowed = new Set(["packages/persistence-postgres"]);
  const packageDirectories = await readdir("packages", { withFileTypes: true });

  for (const entry of packageDirectories) {
    if (!entry.isDirectory() || allowed.has(`packages/${entry.name}`)) continue;
    const files = await sourceFiles(`packages/${entry.name}/src`);
    for (const file of files) {
      const source = await readFile(file, "utf8");
      assert.doesNotMatch(source, /from\s+["']pg["']/, `${file} imports pg`);
    }
  }
});
