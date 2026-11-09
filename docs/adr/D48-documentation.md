# D48. Layered documentation

## Background

The same fact written in several places leaves the reader unable to tell which one still holds, and a change always has someone missing one place. The earlier documentation both described mechanisms and recorded directions, and carried progress and indexes, so a refactor that changed no direction left whole passages stale; the effort of maintaining that text was out of proportion to the help it gave.

## Decision

- Each kind of information lives in one place. Mechanisms, execution order, paths and numbers belong to code and comments; global structure and cross-module invariants to an architecture overview; directional choices to one-time ADRs; user-facing behaviour to user documentation; commands and red lines to the working rules file.
- The test for where a piece of text belongs is: would a refactor that changes no direction make it stale? Text that would go stale stays beside the code; only a direction a refactor cannot overturn becomes an ADR.
- An ADR records only what direction was chosen at the time, why, and what was given up. Once written, it is not changed with the code.
- When a direction is overturned, write another ADR and name on the new one which numbers it replaces; the replaced file is deleted, its number retired and never reused.
- An ADR carries no "current status" field. Implementation progress belongs to commits and issues, and the reader learns it from the code and the commit history.
- One-time actions and the course of evolution stay in commit messages and the changelog, not in an ADR.
- Only when a direction's reasoning cannot be read from the code and the tests does it qualify as an ADR; a rule a tool can enforce goes into a check, and only the reasoning stays in the ADR.

## Consequences

- Anyone who wants to understand a mechanism has to read the code; the documentation no longer retells it.
- A replaced ADR has been deleted, so a reader who meets a retired number in an old commit or a code comment has to follow the decision that replaced it to the direction in force.
- Given up: "one document describing the whole current state" and "recording progress inside decisions"; gained: any piece of text's ownership tells you whether it should change with a change.

## Reconsider when

- None.
