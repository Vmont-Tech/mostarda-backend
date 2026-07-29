import assert from "node:assert/strict";
import test from "node:test";

import {
  evolveGovernanceMachine,
  InvalidGovernanceTransition,
  initialGovernanceMachine,
  transitionGovernanceState,
} from "../../packages/governance/src/index.ts";

test("normal investigation lifecycle reaches the only terminal state", () => {
  let state = transitionGovernanceState(null, "GovernanceCaseOpened");
  state = transitionGovernanceState(state, "InvestigationStarted");
  state = transitionGovernanceState(state, "ResponsibilityDecisionPublished");
  state = transitionGovernanceState(state, "GovernanceCaseClosed");

  assert.equal(state, "CLOSED");
});

test("human review never auto-decides and publishes only through the decision fact", () => {
  let state = transitionGovernanceState(null, "GovernanceCaseOpened");
  state = transitionGovernanceState(state, "InvestigationStarted");
  state = transitionGovernanceState(state, "HumanReviewRequested");

  assert.equal(state, "UNDER_REVIEW");
  assert.throws(
    () => transitionGovernanceState(state, "GovernanceCaseClosed"),
    InvalidGovernanceTransition,
  );
  assert.equal(
    transitionGovernanceState(state, "ResponsibilityDecisionPublished"),
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
    () => transitionGovernanceState("CLOSED", "InvestigationStarted"),
    InvalidGovernanceTransition,
  );
});
