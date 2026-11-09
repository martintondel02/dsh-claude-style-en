# D40. Page-level resources have one owner each

- **Replaces**: D6, D41, D26

## Background

When features each set up their own observers, the ordering is down to luck: which of two observers is set up first decides whether the follow or the host writes the scroll position last. When features each query the whole document, every read grows in cost with the page, and in a long conversation every frame pays for the whole page. When features each read system settings, stylesheets and scripts do not even get the same answer. Things shared on the page need one owner each.

## Decision

- Observing changes on the page goes through one observation bus: features subscribe with a target and the kinds of change they care about; the bus merges subscriptions on the same target, routes records back by each subscription's options, runs callbacks in subscription order, and takes an observer down entirely when it has no subscriptions left. Small batches run their callbacks right there in the observer's callback, still before paint; a large batch such as a session switch moves to the next task and runs in slices on an 8-millisecond budget. A feature callback is an idempotent scan, so arriving one beat late affects only the scan. A subscription can declare `beforePaint`: such subscriptions run in the observer's callback, ahead of the batch's deferred subscriptions, still before paint however heavy the batch, for markers that style writes have to read; the rest stay deferred. Box geometry is not measured in such a subscription: that goes to the frame pipeline's read phase, merged into one read with the other features' measurements in the same frame, and written back by frame after the writes.
- Host nodes are read through the list the bus keeps by selector, maintained incrementally in batches as changes arrive; a feature querying the whole document on refresh is forbidden. A feature registers when it reads and releases when it uninstalls, and the subscription comes down when the last reader lets go.
- Each frame is scheduled through one frame pipeline: the whole page makes one animation-frame request, each frame reads in order and then writes in order, and features put their measurements and their writes in their own places; the scroll owner's position write sits between them, writing while the layout the read just computed is fresh, so it does not pay for a layout caused by someone else's write. Repositioning caused by a viewport change is merged through it too; the reader's own wheel is not part of that.
- Only the scroll owner writes the chat area's scroll position, arbitrating per scroll container; requests are prioritized by source, and the plugin's jumps, follow and catch-up all go through it. The reader's own wheel belongs to the browser: the scroll owner does not take that event over, only records that the reader moved and refuses to follow on account of it.
- The animation choice is resolved in one place into a value on the document, and scripts and stylesheets read the same value; features do not read system settings themselves. When the system setting flips or another chat plugin is installed or removed, it resolves once more and reruns the preference listeners.
- Subscriptions, size registrations and frame tasks are added and removed in pairs with a feature's install; on failure the failure is reported and the other subscriptions and tasks carry on.
- Activity that only records a moment and causes no page change (pointer movement) travels on a separate reporting channel, from which a feature knows the reader is present.

## Consequences

- The observation bus and the frame pipeline become a shared dependency of every feature; a fault in either affects the whole page, so the dispatch order, option routing and scheduling phases have to be pinned by the most complete checks.
- The filtering the browser used to do for every subscription is now decided by the bus in script, one by one; with more subscribers that decision gets heavier.
- Features separate measurement from writing, each going to its own place; a feature that still wants to read during the write phase reads the writes made earlier in that frame.
- Adding a scroll source means changing both the priority decision and the checks. The reader's own wheel and a slide the plugin paints are two kinds of motion; the plugin's slide has its own speed limit and curve, and a long slide is clamped at both ends.
- A large batch's callback runs one beat late: the page it reads has already painted a frame. Interactions that depend on writing before that same paint (hiding the send echo, the height a roll-up door presses down) get it only when the batch's weight stays under the threshold; weight is estimated by record count plus each added node's child count, and an estimate that cannot reach a deep, huge mount stays on the synchronous side. A subscription declaring `beforePaint` is the exception: its cost lands in the frame before paint, so it should only write markers that styles read, run no scans and read no boxes; putting measurement in that callback forces reflow again and again on a tree that was just mounted and has no styles computed yet, and the delay on a tree swap therefore compounds. Measurement goes through the frame pipeline's read phase, which reads once per frame.
- The batch weight threshold and the 8-millisecond slicing budget are hard-coded in the bus; changing them means looking together at the checks for which features depend on same-frame dispatch.

## Reconsider when

- The host provides a unified subscription to page changes or a render-phase hook: the observation bus and the frame pipeline connect to the host's.
- The host opens a replaceable scroll-follow strategy: the follow part registers with the host, and only the skin's own jumps and transitions stay here.
- The host can report that a session switch is complete, or provides an awaitable render phase: the batch-weight threshold decision is driven by that notification.
