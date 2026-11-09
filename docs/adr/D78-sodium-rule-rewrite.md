# D78. Rewrite the host's and plugins' expensive style rules

## Background

In the host's conversation-stream styles a few spacing rules use `:has()` to decide whether a stream item is empty, then pass that decision on to the items after it through sibling combinators; the subject (the last compound) of these rules is "an item that is neither hidden nor empty", which carries no class name, tag or attribute for the browser to bucket by, so every element on the page has to be tried against it. The browser matches from the last compound, so every insertion tries the whole page against these rules, the unit cost of a style recalculation in a long conversation rises with it, and any layout read by the skin and the host in the same frame pays that bill. The host offers no switch for rules of this kind.

## Decision

- The skin offers an experimental rewrite called Sodium: with the switch on, rules registered in the adaptation table have their selectors rewritten in place in the original stylesheet so the browser can bucket them; with it off, the selectors are written back as they were, every marker the skin wrote is withdrawn, and the page returns to the host's own look.
- The adaptation table is organized by member. The host's own interface is provided by built-in plugins shipped with it, and it is a member like any other: each member states where its version is read from, the version from which adaptation starts (higher versions are included automatically) and its adaptation entries; each entry states the stylesheet (the package name and path the loader marks on the style node), the rules it recognizes, and the script that maintains the fallback markers. A member whose version cannot be read takes no part in the rewrite.
- The table holds the whole selector: the form the browser serializes, with hashed class names replaced by role placeholders captured on first appearance and required to be the same class name afterwards. One character off and it does not match, and the rule stays as it was; when the host changes the rule, what stays on the page is the host's own rule.
- The rewrite touches only the subject: it is expanded into several parallel branches by the keys the host writes when it creates the element — stream block, running row, submit echo, interjection bubble, stream slot, each registered in the host contract — and the browser buckets by those keys and tries only those elements. An element carries its key from the moment it is inserted, so when the host inserts a node and reads layout synchronously in the same task, the rewritten rule and the original read the same set of elements. The structural decisions inside the rule (empty item, hidden) are left to the browser to decide live.
- Other kinds the host or another plugin puts into the stream are covered by markers a script writes on every child of the stream container: that is the last parallel branch, written in the change observer's callback, and such elements temporarily carry no spacing in the task that inserts them.
- A replacement is equivalent to the original rule: it matches the same set of elements on the same tree, at the same specificity. Each branch's key appears only on children of the stream container; to make up for the specificity the key adds, the parallel negations are merged into one `:not()`, which counts only the heaviest of them.
- The switch is off by default, and the preference's initial value is "undecided". In the probe after the user's settings are read, one rule in the adaptation table matching turns it on for the user; once the user has flipped the switch, the preference has an explicit value and the probe no longer changes it.
- The settings item's small print reports only the number of rules in force, and hovering lists each rule's source and declarations for maintenance comparisons.

## Consequences

- With the switch on, the host's and plugins' stylesheets no longer correspond one-to-one to what their authors wrote; turn the switch off before investigating a style problem.
- Adapting a new rule means writing its whole selector, its replacement and the host contract it depends on, with a spec checking that the two match the same set of elements on the same tree and carry the same weight in the cascade, including the moment after a node changes in the same task and before any observer runs.
- Rules whose subjects can already be bucketed (empty-item collapse by item class name, running-row divider by divider class name) are cheap already and do not enter the table.
- Every time the host changes these rules, the corresponding entry in the table stops working and has to be registered again against the new form; when the host adds a new kind of stream child, its key has to join the subject's branches, or it only waits for the fallback marker.
- The rewrite acts on the stylesheet object, so when the same styles are injected again (hot reload) the rewrite is lost with the old object, and the skin has to watch `<head>` and re-match the new object.
- Abandoned: writing higher-specificity rules in the skin's stylesheet to override the host's declarations. Even overridden, the browser still has to evaluate the original rule for the value, so the cost does not fall.
- Abandoned: deleting the original rule and inserting a rewritten copy. Deleting and inserting changes rule indices, so turning the rewrite off would have to insert back at a recorded position, and the host's own additions and deletions invalidate that position.
- Abandoned: narrowing the subject with script-written markers alone, or replacing the empty-item decision with a script-written attribute. Markers and attributes only update in the change observer's callback; when the host withdraws the running row at the end of a turn and inserts a new item and then reads layout in the same task, the content it reads is shorter than under the original rule, and the browser clamps the scroll position back a stretch.

## Reconsider when

- When the host fixes these rules, or provides a buckettable attribute for stream items, the corresponding adaptation entry is deleted.
- When the browser's cost of matching and invalidating structural selectors of this kind falls to that of an ordinary attribute selector, the whole feature is deleted.
