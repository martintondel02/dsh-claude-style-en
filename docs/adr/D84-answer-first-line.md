# D84. The first line of the answer is where reading starts

## Background

A long answer is hard to read, especially on a phone: a screen holds little, and while following, the reader sees only the last line, so starting from the first means dragging back. The thinking and tool-call phase is read another way — those steps keep growing at the end, and following the end is right. The two are opposite readings, yet the host's follow has only one mode for the whole turn: pin the end throughout.

The practice described in upstream feedback (#230): follow as usual through the process phase, and as soon as the answer proper begins, bring the answer's first line to the top of the screen and stop there while the body keeps growing below. The reader reads from the first line instead of chasing the end.

## Decision

- The skin takes over only while the reader is reading the end; a reader who has left the end is reading where they chose, and must not be moved at a moment they did not ask for.
- The moment to take over is when the Markdown layer's streaming marker (`data-streaming`) appears in the answer's row: the answer row is the reply part of the assistant step (`CHAT_ANSWER_ROW_SELECTOR`), the row that is not thinking. In 0.2.2-rc.1 the host counts every row of the turn into the process group until the turn ends, and the answer row itself carries the process member's marker, so "the row the process does not hold" can never be recognized during streaming; only the row's own part can be. Restored history has no such marker, and a finished answer no longer has one either, so reopening a conversation is not misled.
- The target of the move is the difference between the answer row's top and the top of the scroll container; the write goes through the scroll owner's jump source, and ownership is taken immediately after the write (D40), while the row's height keeps being watched. When the answer has just begun it is still less than a screen tall, the difference exceeds the scrollable range, the browser clamps the write to the end, and the reader keeps following the end as before; from then on, each time the row grows, the same target is written again, and once the row is taller than a screen the write really lands on the first line, the reader stops at the start of the answer, and the following text lands below the screen. Ownership makes the follow source and the stream displacement both stand aside (D85), and the host's own follow switches off within its sampling window.
- The skin takes over once per answer; once the reader moves, the rewrite stops, and when the reader scrolls back to the end the ownership is released as usual and following is handed back (D40's settlement).
- Off by default, with its own switch in the settings page's conversation group. It moves the reader at a moment they did not ask for, and on by default would decide that for everyone.

## Consequences

- After the takeover the reader stops at the start of the answer while the streamed output keeps growing below; during ownership the host still pins the end, and that stretch of growth is written back to the reader's position (D85).
- An answer shorter than a screen has no scrollable room: the first line cannot reach the top, and the reader still sees the end grow, which is a limit of the page itself, not the takeover failing.
- dsh-chat-ux acts on the same thing at the same moment, and the two exclude each other (the manifest's `yieldsTo`); the feature is not installed while it is on the page.
- Abandoned: on by default. A page that jumps on its own when the reader did not ask for it is taken as an accident.
- Abandoned: triggering on the host's earlier `data-turn-process-answer` marker. The host stopped writing that marker after 0.2.1-rc.5, so reading it means doing nothing in the new era.
- Abandoned: triggering on the answer row appearing from nothing. The answer row can mount with the turn while its content is empty, which would take the reader to an answer that has not begun.

## Reconsider when

- When the host provides a semantic event for "the answer proper has begun", or an awaitable render phase, this decision reads that event.
- When the host opens a replaceable follow strategy, the takeover returns to the host and only the switch and the decision stay here (D40's reconsideration).
