import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("ADR-010 remains a proposed hardware/provisioning decision", () => {
  const adr = read("docs/adr/ADR-010-Edge-Hardware-and-Provisioning.md");

  assert.match(adr, /^# ADR-010/m);
  assert.match(adr, /- \*\*Status:\*\* Proposed/);
  assert.match(adr, /Supersedes:.*ADR-002.*hardware padronizado em Mini PC/i);
  assert.match(adr, /Mostarda Edge OS/);
  assert.match(adr, /Hardware Profiles.*Installation Profiles.*Installation Adapters/s);
  assert.match(adr, /## Status/);
  assert.match(adr, /permanece `PROPOSED`/i);
  assert.doesNotMatch(adr, /- \*\*Status:\*\* Aceito/i);
});

test("provisioning specification complements runtime without creating a new business context", () => {
  const spec = read("docs/tv-network/EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md");

  assert.match(spec, /^# Mostarda Edge/m);
  assert.match(spec, /- \*\*Status:\*\* `DRAFT — aguardando decisão arquitetural`/);
  assert.match(spec, /complementa `docs\/tv-network\/EDGE_RUNTIME\.md`/);
  assert.match(spec, /TV Network permanece owner de:/);
  assert.match(spec, /Eles NÃO criam um novo Bounded Context de negócio/i);
  assert.match(spec, /## 30\. Decisões abertas/);
  assert.match(spec, /método universal de instalação Android/);
  assert.match(spec, /capacidade mínima de hardware para `SUPPORTED`/);
  assert.match(spec, /Edge Runtime NÃO DEVE:/);
  assert.match(spec, /calcular preço/);
  assert.match(spec, /materializam Evidence/);
});

test("the proposal cannot be mistaken for an accepted normative change", () => {
  const adr = read("docs/adr/ADR-010-Edge-Hardware-and-Provisioning.md");
  const spec = read("docs/tv-network/EDGE_PROVISIONING_AND_HARDWARE_PLATFORM.md");

  assert.match(adr, /Nenhum código de produção deve assumir esta decisão como `ACCEPTED`/i);
  assert.match(spec, /## 30\. Decisões abertas/);
  assert.match(spec, /Status.*DRAFT/i);
  assert.doesNotMatch(spec, /Status.*ACCEPTED/i);
});
