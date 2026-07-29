import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cgsUrl = new URL(
  "../../docs/architecture/CODE_GENERATION_SPECIFICATION_PART_A.md",
  import.meta.url,
);

test("CGS Parte A reconhece toda autoridade superior", async () => {
  const text = await readFile(cgsUrl, "utf8");

  for (const authority of [
    "PLATFORM_SPECIFICATION",
    "ARCHITECTURE_LOCK_REVIEW_V1",
    "IMPLEMENTATION_READINESS_REVIEW_V2",
    "TECHNICAL_BEHAVIORAL_SPECIFICATION",
  ]) {
    assert.match(text, new RegExp(authority));
  }
});

test("CGS Parte A rejeita geração de artefato bloqueado", async () => {
  const text = await readFile(cgsUrl, "utf8");

  assert.match(text, /deny-by-default/i);
  assert.match(text, /IMPLEMENTATION_(?:BLOCKED|PARTIAL|NOT_READY)/);
  assert.match(text, /não (?:gera|materializa)/i);
});

test("CGS Parte A separa domínio, aplicação, contrato e infraestrutura", async () => {
  const text = await readFile(cgsUrl, "utf8");

  for (const boundary of ["Domain", "Application", "Contracts", "Infrastructure"]) {
    assert.match(text, new RegExp(boundary));
  }
});

