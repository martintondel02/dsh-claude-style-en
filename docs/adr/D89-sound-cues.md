# D89. The host half plays system sounds for the cues; the browser half only decides when they sound

## Background

Two moments need a soft cue: a session waiting for the reader's confirmation, and a task finishing. Sound in the browser has two limits: without a reader gesture the audio context may be suspended, and playback is unreliable while the window is in the background; yet the moment this cue is most useful is exactly when the window is not in front. macOS ships two system sounds, Pop and Tink, as files in system directories, and distributing them in the package would touch Apple's copyright. The host half already runs on this machine, so it can play the files from the system directly.

## Decision

- Add a private route `/dsh-claude-style/sound`, going through the same request fence as the other routes (D75). `GET` answers whether this machine can be played by the host, and which two sounds it can play; `POST { name, volume }` plays one.
- The host answers `system` only on macOS, with `/usr/bin/afplay` and both system files present; playback uses `afplay -v <gain>`, the names taken from the two fixed files, and the gain clamped to what `afplay` accepts. The package carries no audio.
- The browser half reads two of the host's own snapshots: `uiSession.sessionStatus` and `sessions.list`. A session going from "not waiting" to "waiting" plays Pop; a top-level session going from "running" to "not running" plays Tink; a subagent sounds only when it waits, and its end does not count as a finished task.
- The first reading when the page opens is the baseline: a state already waiting or already running gets no cue. Two cues within 200 milliseconds are merged into one, with waiting for confirmation taking priority.
- Only a page on the loopback address uses host playback; other pages (a `dsh web` on another machine, a non-macOS host, a host without this route) fall back to Web Audio synthesizing two approximate sounds, with pitch and envelope following the system files and gain from the same table.
- One preference, "Sound cue", with values off, soft and clear: off installs no part of the feature, and the page subscribes to no state and opens no audio context; the two levels set the gain of both cues together. Off by default. The cue pair is fixed as Pop and Tink, and this version offers no choice of timbre.

## Consequences

- On macOS what sounds is the system's own file, and it still sounds after the window switches to another application; non-macOS and remote pages hear a synthesized sound, close in timbre but not equal to the system file.
- Stopped and failed turns also go from "running" to "not running" and also play Tink. Distinguishing them from a normal finish would mean reading that session's event stream and filtering by the `turn/end` reason, at the cost of one more subscription.
- Each cue starts one `afplay` process. Cues are sparse anyway, so that cost is acceptable; a failed playback only degrades to the synthesized sound and reports once, without interrupting the state subscription (D12).
- With two windows open on the same workspace, both pages see the same state change and each sounds once.
- Off by default: someone who never changed the setting is not interrupted by a cue they did not ask for, at the cost that the feature has to be discovered through the settings page.
- Abandoned: browser synthesis alone (unreliable in the background, and the timbre is not the system file); shipping the system files in the package (Apple's copyright); using the host's existing notification capability (the host has no sound service); having the host read the session state (the state lives only in the browser half); splitting the switch, the two cues and the volume into several settings (one decision split three ways, and turning one off still looks as if the whole feature were off).
- The timbre is fixed: adding a choice of timbre would mean the route listing a system directory and the settings row reading a dynamic list, beyond this version.

## Reconsider when

- When the host provides its own sound or notification service, the route calls the host's service.
- When the browser can play reliably without a page gesture and while the window is in the background, and the timbre has to match the system files, host playback can retire.
- When cues need to become a selectable list of timbres, the route gains directory reading and the settings row's choice becomes dynamic.
