import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gatePath =
  new URL("../../docs/specification/GOVERNANCE_IMPLEMENTATION_GATE_V1.md", import.meta.url);

test("Governance gate covers every IRR V2 promotion requirement", async () => {
  const gate = await readFile(gatePath, "utf8");
  const requiredSections = [
    "## 3. Catálogo específico de erros",
    "## 4. Schemas versionados dos Events",
    "## 5. Contratos internos",
    "## 6. Compatibilidade e upcast",
    "## 7. Suíte de conformidade",
  ];

  for (const section of requiredSections) {
    assert.match(gate, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Governance gate enumerates the nine Commands and nine Events", async () => {
  const gate = await readFile(gatePath, "utf8");
  const commands = [
    "OpenGovernanceCase",
    "AttachEvidenceReference",
    "StartInvestigation",
    "RequestHumanReview",
    "ClassifyResponsibility",
    "PublishDecision",
    "AppealDecision",
    "ReevaluateGovernanceCase",
    "CloseGovernanceCase",
  ];
  const events = [
    "GovernanceCaseOpened",
    "EvidenceReferenceAttached",
    "InvestigationStarted",
    "HumanReviewRequested",
    "ResponsibilityDecisionPublished",
    "ResponsibilityDecisionAppealed",
    "GovernanceCaseReevaluationStarted",
    "GovernanceCaseReevaluated",
    "GovernanceCaseClosed",
  ];

  for (const artifact of [...commands, ...events]) {
    assert.match(gate, new RegExp(`\\b${artifact}\\b`));
  }
});

test("Governance aggregate remains blocked unless every gate is satisfied", async () => {
  const gate = await readFile(gatePath, "utf8");

  assert.match(gate, /GovernanceCase Aggregate:\s*`IMPLEMENTATION_PARTIAL`/);
  assert.match(gate, /Autorização para implementar o Aggregate:\s*`NÃO`/);
  assert.match(gate, /Autorização para implementar o kernel transversal:\s*`SIM`/);
});
