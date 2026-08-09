import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Edge audit package contains the three derived documents", () => {
  for (const path of [
    "docs/specification/CURRENT_ARCHITECTURE.md",
    "docs/specification/EDGE_PLATFORM_GAP_ANALYSIS.md",
    "docs/specification/EDGE_TECHNICAL_ROADMAP.md",
  ]) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), true, path);
  }
});

test("current architecture preserves accepted and proposed authority", () => {
  const current = read("docs/specification/CURRENT_ARCHITECTURE.md");

  assert.match(current, /AUDIT BASELINE — NÃO NORMATIVO/);
  assert.match(current, /main @ ddad9bf/);
  for (const state of ["ACCEPTED", "PROPOSED", "DRAFT", "IMPLEMENTED", "PARTIALLY IMPLEMENTED", "OPEN"]) {
    assert.match(current, new RegExp(`\\b${state}\\b`), state);
  }
  assert.match(current, /Contrato[\s\S]*Implementação[\s\S]*Intenção/);
  assert.match(current, /ADR-002 — Arquitetura do Edge[\s\S]*?Aceito/);
  assert.match(current, /ADR-010 — Edge Hardware e Provisioning[\s\S]*?Proposed/);
  assert.match(current, /PLATFORM_SPECIFICATION\.md[\s\S]*?0\.2\.0-draft/);
  assert.match(current, /o estado normativo atual continua sendo o descrito pelo ADR-002/i);
  assert.match(current, /Hardware heterogêneo \/ TV Box[\s\S]*?proposta/i);
});

test("gap analysis exposes open hardware decisions without choosing them", () => {
  const gaps = read("docs/specification/EDGE_PLATFORM_GAP_ANALYSIS.md");

  assert.match(gaps, /GAP ANALYSIS/i);
  assert.match(gaps, /Situação atual[\s\S]*Situação desejada[\s\S]*Documento afetado[\s\S]*Decisão necessária[\s\S]*Dependências[\s\S]*Risco[\s\S]*Bloqueia implementação\?[\s\S]*Bloqueia ADR-010\?[\s\S]*Pode ser resolvido depois\?/i);
  for (const phrase of [
    "Instalação Android → Edge OS",
    "Boot e Secure Boot",
    "Imagem e base do sistema",
    "Player\/Web engine",
    "Local Content Store",
    "Rollback e Recovery",
    "Offline prolongado",
    "Hardware não homologado",
  ]) {
    assert.match(gaps, new RegExp(phrase, "i"), phrase);
  }
  assert.match(gaps, /não escolhe tecnologia, hardware ou política quantitativa/i);
  assert.match(gaps, /Esta análise não conclui que:[\s\S]*TV Box é `SUPPORTED`/i);
});

test("roadmap blocks normative synchronization and implementation until approval", () => {
  const roadmap = read("docs/specification/EDGE_TECHNICAL_ROADMAP.md");

  assert.match(roadmap, /ROADMAP CANDIDATE — NÃO NORMATIVO/);
  assert.match(roadmap, /main @ ddad9bf/);
  assert.match(roadmap, /ADR-002.*continua aceito/i);
  assert.match(roadmap, /ADR-010.*continua Proposed/i);
  assert.match(roadmap, /PLATFORM_SPECIFICATION.*continua Draft/i);
  assert.match(roadmap, /Fase 0 — Baseline forense/);
  assert.match(roadmap, /Fase 1 — Gate de dependências e gaps/);
  assert.match(roadmap, /Fase 2 — Revisão do ADR-010/);
  assert.match(roadmap, /Fase 3 — Sincronização normativa/);
  assert.match(roadmap, /Hardware Discovery[\s\S]*Hardware Profile[\s\S]*Installation Profile[\s\S]*Recovery Profile/);
  assert.match(roadmap, /RAM[\s\S]*Storage[\s\S]*Offline Content Store[\s\S]*Web Engine[\s\S]*Codec Capability[\s\S]*Player Profile/);
  assert.match(roadmap, /Não fazer nesta fase/);
  assert.match(roadmap, /\| implementar installer\/OS\/adapters \| não \|/i);
  assert.doesNotMatch(roadmap, /- \*\*Status:\*\* `ACCEPTED`/i);
});
