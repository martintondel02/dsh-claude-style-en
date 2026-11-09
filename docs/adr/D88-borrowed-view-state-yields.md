# D88. When borrowed view state is rewritten, the whole page yields

## Background

The date view has to lay days out across workspaces, while in the host's grouping only flat is a single list. So it switches the host's view store to flat, remembers the reader's grouping, and restores it when the bell switches back to the host view. The reader's own grouping and the date view write the same field, and two writers share one value.

When the reader picks another tier in the host's view menu, the date view's next layout pass reads neither flat nor the value it wrote itself. It used to overwrite that value as its own backup and write flat back: the reader's choice vanished that frame, and workspace grouping and its switch stopped working entirely while the date view was open.

## Decision

- The tier written into the host's view store is remembered by the half that writes it. The date view writes only flat, and flat is its write.
- A grouping read after flattening that belongs to someone else is judged as the reader having changed the grouping: the date view yields, taking the same path as turning the lights off, the mode marker on the body is removed, and the reader's tier stays in the store.
- What is handed back on yielding is the tier the reader has just chosen, not the tier remembered before flattening.
- The half that records the grouping as the "grouping in progress" skips only flat while the date view is open; every other tier is recorded as usual, and that is exactly the one to leave in the store after the date view yields.
- The archived page's forced flat stays as it is: the date view does not flatten in archived, so the two do not trigger each other.

## Consequences

- Changing the grouping while the date view is open lays the list out by the reader's grouping, the date view turns itself off, and the bell releases with it.
- After the reader changes the grouping and then presses the bell, the date view flattens and restores against the new tier.
- Given up: treating the date view as the only owner of the grouping field: the host view menu's write takes precedence over it.
- Changing the grouping in archived is still pressed back to flat by the host's view store, which is that page's original behaviour.

## Reconsider when

- When the host leaves an extension point for the date tier, or the view store can record grouping per data source, this yielding retires.
- When the host's grouping enum is renamed or gains a tier, the half that remembers writes is checked with it.
