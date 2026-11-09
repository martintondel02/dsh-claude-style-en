# D12. Fail fast and isolate features

## Background

The skin shares one page with the host, and one host process with other plugins. One failure must not stop the whole page, but a swallowed error shows up elsewhere in a way that is harder to diagnose: a piece of the interface is missing and the console says nothing.

## Decision

- Throw where the error is; do not swallow it and do not fall back silently. Where a host service may be absent, express "there is no such service" with optional chaining and type checks, not by catching an error.
- Where isolation is needed, report and carry on: notify subscribers one by one, run frame tasks one by one, uninstall features one by one, and a single failure reports only itself. Reporting has one outlet.
- Every place a catch is allowed writes its reason beside the code. Where the reason cannot be read off, it goes into a comment there.
- A feature's teardown is the only cleanup point for everything it set up: listeners, subscriptions, queued frame tasks and timers, host interface it took over. Teardown is registered first and may run more than once.
- A feature that fails several rounds in a row is reported and retired; retirement runs its own teardown.

## Consequences

- When a feature fails there is no hint in the interface, only a console record; features that depend on the same host service retire together.
- Every catch needs its reason, so the code is longer; in exchange, "why may this be swallowed" does not send the reader somewhere else.

## Reconsider when

- The host provides plugin-level error reporting: hand the reporting over.
