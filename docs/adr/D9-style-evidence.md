# D9. Evidence and tokens for CSS

- **Replaces**: D4, D33, D37, D51, D65, D67

## Background

Style is where this skin touches the host most closely: selectors are written against someone else's structure, and colours, layers and motion have to coexist with someone else's values. The same fact used to be written once in a stylesheet, once in a script constant and once in a document, so changing it meant searching the other places by hand; importance, gating and ownership were not recorded, and one more line cost nothing.

## Decision

- Every fact in the styles that the build can check is written as data and a check, so a reader of the code does not have to keep it consistent from memory and search.
- Tokens have one data source: palette, type, durations, curves, layers and distances are all read from it, and the stylesheets and the tables in the documents are generated from it — nothing is handwritten anywhere.
- One effect has one rung: when a new duration, curve or layer is needed, first pick an existing rung in the data source; if none fits, add a rung, with the nearest one beside it.
- Selectors, gating, ownership and importance are checked on the syntax tree; line- and character-scanning checks are no longer the basis.
- A structural dependency is written as an attribute by a script, and styles only read attributes; an attribute that keeps flipping is written on the nearest common ancestor.
- Structural relationships are judged only in the selector's last segment; the earlier segments carry none.
- Every `!important` needs evidence that it is necessary: the build checks what it overrides, and whether the painted result really changes without it.
- When most of the `!important` declarations in a region override the host's inline styles or its own `!important`, the skin takes over rendering that region: the host's element is hidden, and data and actions go through the host service registered in the contracts module.
- Stylesheet ownership is marked by this package itself: a sibling package's stylesheet is not claimed, and the host is not expected to collect this package's sheets either.
- The input box region's rules are withdrawn as a whole by a switch the build stamps.

## Consequences

- Stylesheets are plain CSS, minified by the build into the artifact: the page carries no comments or layout, and in the developer tools a reader has to follow a selector back to the source file.
- The build gains dev dependencies that parse stylesheets and the scripts' syntax trees; one of them is marked unstable at the current version of the tool it uses, and has to be checked along with every upgrade.
- A structural dependency waits for a script to write an attribute in the same frame, before paint; each further structural relationship means one more attribute in the part-covering code.
- How much the evidence covers depends on the screens the walk reaches; where the walk does not reach, entries are recorded one by one with the reason, and the record may only shrink. Three signals — a selector that never matched, a recorded entry that now matches, and an appearance that differs from the snapshot — record the host's output and are reported as observations on every run under D87's tiers, for a person to read and then update the record.
- Merging the rungs changed the feel of some interactions: durations, curves, distances and layers moved to the nearest rung.
- Abandoned: ordering with cascade layers, and letting the numbers in a stylesheet explain their own origin.

## Reconsider when

- The host puts its styles in cascade layers, or provides a mechanism for layering themes and tokens: switch to cascade layers and join the host's layers.
- Measured invalidation for a non-final-segment structural judgement is no longer clearly slower than the final-segment form.
- The host provides a public way to declare and own client styles: use it for the ownership marker.
- The host publishes its own motion and layer tokens: alias these groups to the host's set.
