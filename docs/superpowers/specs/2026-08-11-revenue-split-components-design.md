# Revenue Split Components Design

**Status:** Approved design basis for implementation

## Goal

Represent the current commercial campaign distribution as a versioned, deterministic
policy owned by Settlement, without implementing ledgers, fund spending, payment
rails, frontend configuration, or campaign-specific editing.

## Normative model

Every campaign distribution totals 100%:

- TV Owner: 20% fixed.
- Space Owner: 20% fixed.
- Seller: four independently earned components of 5% each (maximum 20%).
- Seller Acquisition Fund: every seller component not earned (remainder to 20%).
- Influencer: four independently earned components of 3%, 2%, 2%, and 3% (maximum 10%).
- Influencer Acquisition Fund: every influencer component not earned (remainder to 10%).
- Mostarda: residual, with a protected minimum of 30%.

The two acquisition funds are distribution recipients in this policy. Their balances,
spending authorization, campaign creation, and governance remain outside this slice.
No balance cap or spending rule is invented here.

Creative production compensation is independent of the commercial influencer cap. This
slice does not define its amount, eligibility, ledger, or payment behavior.

## Policy identity and ownership

The executable policy uses the opaque version identity
`SPLIT-PERFORMANCE-RESIDUAL-V1`. Settlement owns the policy and its output rights.
Evidence, Ledger, Wallet, Withdrawal, Asaas, and the acquisition-fund ledgers remain
separate authorities.

## Inputs and outputs

The policy receives component-achievement booleans. It returns immutable percentage
shares for seven recipients and the applied policy version. It does not decide whether a
goal was achieved; upstream eligibility/evidence supplies those booleans.

The A/B/C examples are conformance fixtures only. They are not defaults, presets, or
campaign configuration. Under the current fund rule, unearned components are allocated
to their corresponding acquisition fund, so valid distributions preserve the 30%
Mostarda residual while the funds receive the unearned portions.

## Invariants

- TV Owner is exactly 20%.
- Space Owner is exactly 20%.
- Seller earned share is between 0% and 20%.
- Seller Acquisition Fund plus Seller earned share is exactly 20%.
- Influencer earned share is between 0% and 10%.
- Influencer Acquisition Fund plus Influencer earned share is exactly 10%.
- Mostarda is at least 30%.
- All seven shares sum exactly to 100%.
- Creative production does not reduce the influencer commercial cap.

## Out of scope

This design does not define component eligibility criteria, fund ownership/governance,
fund spending, production compensation, Settlement persistence, Partner Ledger,
Partner Wallet, Withdrawal, Asaas, frontend controls, or campaign-specific policies.
