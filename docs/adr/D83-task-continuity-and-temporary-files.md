# D83. Work orders carry tasks across sessions; temporary files retire on their own

- **Replaces**: D82

## Background

A small change, a read-only check and a one-off experiment can usually finish in the current session. Filling in a goal, acceptance criteria, where measurements go and review status for that work would cost more than the work itself. Temporary scripts, screenshots and logs, however, arise in tasks of any size, and each needs a clear owner and a time to be deleted.

Work that needs cross-session recovery, handoff between people, or sustained collection of acceptance evidence still needs its context kept in one place. A work order keeps that context, and temporary files have an owner of their own for their lifetime.

## Decision

- A small change with a clear scope that can finish in the current session, a read-only check and a one-off experiment proceed directly. No temporary directory is created when the work produces no intermediate files.
- When the user explicitly asks for a work order, or the task needs cross-session recovery, handoff between people or sustained collection of acceptance evidence, the agent doing the work creates or reuses a work order itself. Changed line counts, file counts and whether temporary files appear do not on their own trigger one.
- A one-off artifact goes into a directory of its own under `.debug/tmp/` per session or run, recording the owning process and the time of activity. A run that ends normally deletes its directory, a failed run keeps the evidence; an abandoned directory is collected once the retention period has passed and its owning process has exited. Cleanup works on the whole run directory, and live processes and directory links are protected.
- A work order still lives under `.debug/work/`, and its `refs/`, `shots/` and `tmp/` hold the material that travels with it. A measurement states where it goes before review begins: a token, a spec, a comment, an architecture decision or nothing durable. Closing a work order deletes the whole directory.
- Build, test, screenshot tools and caches have their own run directories and retention rules, and running them does not create a work order. Deleting a tool's directory is its owner's job.
- Neither temporary directories nor work orders are committed. A probe worth keeping becomes a spec or a scenario; a behaviour change goes into `docs/changes/`, a direction change into an architecture decision. Durable documents never name a temporary directory or a work-order instance.

## Consequences

- Day-to-day changes can be completed directly, and temporary artifacts have a way to be created, located, closed and collected without a work order.
- Whether to create a work order is judged by the agent doing the work, from the needs of the context; the command-line tool executes explicit orders to create one. The tool cannot infer from file changes whether a handoff is needed.
- The liveness check for a temporary directory is deliberately conservative: an owner that is still alive extends the retention time, and closing explicitly ends a session directory already known to be finished.
- Work-order material is kept with the task, run material retires with the process and the retention period, and the two have their own clear cleanup rules.

## Reconsider when

- When the host can provide reliable session-end notification or cross-machine task storage, reconsider the temporary directory's owner record and where work orders live.
