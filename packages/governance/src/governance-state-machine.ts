export const GOVERNANCE_STATES = Object.freeze([
  "OPEN",
  "INVESTIGATING",
  "UNDER_REVIEW",
  "DECIDED",
  "APPEALED",
  "REEVALUATING",
  "CLOSED",
] as const);

export type GovernanceState = (typeof GOVERNANCE_STATES)[number];

export type GovernanceLifecycleEvent =
  | "GovernanceCaseOpened"
  | "InvestigationStarted"
  | "HumanReviewRequested"
  | "ResponsibilityDecisionPublished"
  | "ResponsibilityDecisionAppealed"
  | "GovernanceCaseReevaluationStarted"
  | "GovernanceCaseReevaluated"
  | "GovernanceCaseClosed";

export interface GovernanceMachine {
  readonly state: GovernanceState | null;
  readonly reevaluationDecisionPublished: boolean;
}

export class InvalidGovernanceTransition extends Error {
  readonly state: GovernanceState | null;
  readonly eventType: GovernanceLifecycleEvent;

  constructor(
    state: GovernanceState | null,
    eventType: GovernanceLifecycleEvent,
  ) {
    super(`Event ${eventType} is invalid while GovernanceCase is ${state ?? "absent"}.`);
    this.name = "InvalidGovernanceTransition";
    this.state = state;
    this.eventType = eventType;
  }
}

export function initialGovernanceMachine(): GovernanceMachine {
  return Object.freeze({
    state: null,
    reevaluationDecisionPublished: false,
  });
}

export function evolveGovernanceMachine(
  machine: GovernanceMachine,
  eventType: GovernanceLifecycleEvent,
): GovernanceMachine {
  const { state } = machine;

  if (state === null && eventType === "GovernanceCaseOpened") {
    return machineAt("OPEN");
  }
  if (state === "OPEN" && eventType === "InvestigationStarted") {
    return machineAt("INVESTIGATING");
  }
  if (state === "INVESTIGATING" && eventType === "HumanReviewRequested") {
    return machineAt("UNDER_REVIEW");
  }
  if (
    (state === "INVESTIGATING" || state === "UNDER_REVIEW") &&
    eventType === "ResponsibilityDecisionPublished"
  ) {
    return machineAt("DECIDED");
  }
  if (state === "DECIDED" && eventType === "ResponsibilityDecisionAppealed") {
    return machineAt("APPEALED");
  }
  if (
    state === "APPEALED" &&
    eventType === "GovernanceCaseReevaluationStarted"
  ) {
    return machineAt("REEVALUATING");
  }
  if (
    state === "REEVALUATING" &&
    eventType === "ResponsibilityDecisionPublished" &&
    !machine.reevaluationDecisionPublished
  ) {
    return Object.freeze({
      state,
      reevaluationDecisionPublished: true,
    });
  }
  if (
    state === "REEVALUATING" &&
    eventType === "GovernanceCaseReevaluated" &&
    machine.reevaluationDecisionPublished
  ) {
    return machineAt("DECIDED");
  }
  if (state === "DECIDED" && eventType === "GovernanceCaseClosed") {
    return machineAt("CLOSED");
  }

  throw new InvalidGovernanceTransition(state, eventType);
}

function machineAt(state: GovernanceState): GovernanceMachine {
  return Object.freeze({
    state,
    reevaluationDecisionPublished: false,
  });
}
