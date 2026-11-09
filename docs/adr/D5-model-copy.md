# D5. Model copy is data

## Background

The model catalog changes quickly: vendors add, rename and retire models frequently, and new tiers appear within the same generation. A description written for one particular version ends up attached to another before long; registering copy entry by entry under a model id means every changed spelling, added date suffix or changed seller needs another line. Updating copy should not require a code change and another release.

## Decision

- Model copy is data: a document is validated against its format constraints at build time, copied out with the artifact, and read through a host channel when the browser first paints the picker; extending the copy table changes no code.
- The document has no entries registered by model id: the mapping from ids to sentences is only one ordered table of pattern rules, and aliases and spelling variants are tolerated by the rules themselves.
- Lookup falls back in order: family rules, tier rules, the catalog's own text.
- Copy belongs to a product line, not to a version: one product line maps to one sentence by name pattern, and neither a version bump nor a retirement can move that rule.
- Where copy needs a version number or a superlative, the pattern anchors to that version, and a general rule for the same product line sits beneath it as the fallback.
- Never write invented tier prefixes, and never repeat the model name the row already carries.
- Family rules are ordered and must be scoped: one product line's rule does not claim another product line's models.
- One document binds models to vendor lockups; a model no rule claims draws no lockup.

## Consequences

- The first painting of the picker costs one asynchronous read, and the copy rules take some learning.
- Abandoned: writing the copy as constants in code; registering it entry by entry under model ids; making the copy follow the version number.
- What it buys: a change in the catalog edits data, not logic, and needs no new release.

## Reconsider when

- The host's model catalog interface provides localized copy directly: read the host's.
