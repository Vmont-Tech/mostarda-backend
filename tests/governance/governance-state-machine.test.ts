import assert from "node:assert/strict";
import test from "node:test";

import {
  evolveGovernanceMachine,
  InvalidGovernanceTransition,
  initialGovernanceMachine,
} from "../../packages/governance/src/index.ts";

test("normal investigation lifecycle reaches the only terminal state", () => {
  let machine = evolveGovernanceMachine(initialGovernanceMachine(), "GovernanceCaseOpened");
  machine = evolveGovernanceMachine(machine, "InvestigationStarted");
  machine = evolveGovernanceMachine(machine, "ResponsibilityDecisionPublished");
  machine = evolveGovernanceMachine(machine, "GovernanceCaseClosed");

  assert.equal(machine.state, "CLOSED");
});

test("human review never auto-decides and publishes only through the decision fact", () => {
  let machine = evolveGovernanceMachine(initialGovernanceMachine(), "GovernanceCaseOpened");
  machine = evolveGovernanceMachine(machine, "InvestigationStarted");
  machine = evolveGovernanceMachine(machine, "HumanReviewRequested");

  assert.equal(machine.state, "UNDER_REVIEW");
  assert.throws(
    () => evolveGovernanceMachine(machine, "GovernanceCaseClosed"),
    InvalidGovernanceTransition,
  );
  assert.equal(
    evolveGovernanceMachine(machine, "ResponsibilityDecisionPublished").state,
    "DECIDED",
  );
});

test("reevaluation preserves ordering: decision publication precedes conclusion", () => {
  let machine = evolveGovernanceMachine(
    initialGovernanceMachine(),
    "GovernanceCaseOpened",
  );
  machine = evolveGovernanceMachine(machine, "InvestigationStarted");
  machine = evolveGovernanceMachine(machine, "ResponsibilityDecisionPublished");
  machine = evolveGovernanceMachine(machine, "ResponsibilityDecisionAppealed");
  machine = evolveGovernanceMachine(
    machine,
    "GovernanceCaseReevaluationStarted",
  );

  assert.throws(
    () => evolveGovernanceMachine(machine, "GovernanceCaseReevaluated"),
    InvalidGovernanceTransition,
  );
  machine = evolveGovernanceMachine(
    machine,
    "ResponsibilityDecisionPublished",
  );
  assert.deepEqual(machine, {
    state: "REEVALUATING",
    reevaluationDecisionPublished: true,
  });
  machine = evolveGovernanceMachine(machine, "GovernanceCaseReevaluated");
  assert.equal(machine.state, "DECIDED");
});

test("CLOSED rejects every later lifecycle transition", () => {
  assert.throws(
    () =>
      evolveGovernanceMachine(
        { state: "CLOSED", reevaluationDecisionPublished: false },
        "InvestigationStarted",
      ),
    InvalidGovernanceTransition,
  );
});
