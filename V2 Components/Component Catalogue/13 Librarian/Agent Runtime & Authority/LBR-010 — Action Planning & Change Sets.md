---
id: LBR-010
status: active
kind: behavior
authority: current
system: SYS-13
family: agent-runtime-authority
storybook: none
depends_on:
- LBR-008
- LBR-012
- REV-004
---

# LBR-010 — Action Planning & Change Sets

Parent: [[SYS-13 — Librarian]]

## Purpose

Turns a natural-language goal into a bounded semantic plan and one understandable conceptual action, even when many registered tools are required.

## Example

`Create the Ashen Court, make Veyra its leader, connect it as a rival to the Crown and place both beside the palace.` may become a multi-step semantic plan while remaining one user-level action.

## Plan visibility

Show user-comprehensible plans only when authority, risk, ambiguity, breadth, or explicit preview warrants it. Never expose hidden chain-of-thought.

## Bounded goal

Every agentic task has task origin, goal, context snapshot, authorized scope, authorized capabilities, autonomy policy, and expected result/output.

## Change Set

Related writes share one conceptual Change Set where possible, powering atomicity, provenance, receipt, Undo, Settlement, and audit.

## Relationships

- [[LBR-008 — Semantic Capability & Tool Registry]]
- [[LBR-012 — Execution, Progress, Receipt & Undo]]
- [[REV-004 — Session Change Set & Story Changes]]

## Handoff

Implement **LBR-010 — Action Planning & Change Sets** as the bounded planning layer between user goal and deterministic application execution.
