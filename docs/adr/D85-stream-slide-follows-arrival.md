# D85. During streaming the host writes the position, the skin only paints the displacement, and its duration follows the pace of arrival

- **Replaces**: D71

## Background

During streaming, the host's follow writes the scroll position to the end in one step each time the content grows, and the reader sees the text above jump up a frame. The skin used to pull the end the host had written back within the same frame, then slide the position over frame by frame with a spring. That meant a position write in every frame: the host's scroll handler read the position after it, forcing a layout every frame, especially visible when several sessions stream at once; the position stopped some distance from the end, the host took that as the reader having left the end and switched its own follow off, and the skin had to hide its back-to-bottom button and then find a way to get the follow back. Most of the cost of smoothness went into cancelling the host out, and the denser the output, the busier the main thread and the slower the slide.

With a displacement in the painted picture, there was another problem: the displacement is an animation replaced on every growth. A real provider delivers piece by piece, and the gap between two pieces is usually shorter than the slide token's duration; on restart the previous one has only partly run and the remaining distance is carried into the next, so after a few growths the displacement climbs to the most one slide can carry. During the displacement the message column is painted below its layout position, so the newest row falls outside the viewport; at the end of the stream that distance has to be taken back in the same duration. The position itself is continuous: each piece's scroll jump is cancelled by the displacement in the same frame, and between adjacent frames the message column only moves up.

## Decision

- During streaming the skin writes no scroll position. The host's follow writes the position to the end as usual when the content grows, and the skin neither pulls back nor takes over.
- Smoothness comes from a displacement in the painted picture: in the frame where the content grew, after the host writes the end and before the picture is painted, the skin pushes the message column down by the growth distance and then brings the displacement back to zero. The displacement is left to the compositor, triggering no layout and producing no scroll event.
- Only one displacement animation exists at a time; when a new growth arrives it continues from the distance still outstanding, replacing the one running. A stacking animation cannot be left to the compositor, so it is not used.
- The duration of this slide is the gap from the previous piece to this one, capped at the slide duration token. When the gap is shorter than the token, one slide finishes just as the next growth arrives and carries down only that piece's own growth; when the gap is longer, it still settles in the token's time.
- An element pinned to the bottom (the waiting row) is pushed along with the message column, so it is given a matching displacement of the same duration in the opposite direction; the two cancel and it does not move on screen.
- The push happens only when the host itself says it is following the end, the reader has not left the end, and no fold animation is running; the moment the reader shows any intent to scroll, the displacement in progress stops at once.
- While the reader owns the position the host still pins the position to the end at every growth, and that growth is written back to the reader's position in the same frame (scroll source reader, D40). The write-back itself puts the host into its own sampling window, and the host's follow switches off at once and does not pin again; when the reader is only touching the screen without moving, this is the only way they can stop it.
- Structural moments hand the reader back to the host's follow, while the skin's own jumps and fold transitions still go through the scroll owner (D40).

## Consequences

- The cost of streaming falls back to what it is when the host follows on its own; the host's follow stays on throughout the output, and the skin no longer has to hide its button or get it back during streaming.
- The distance by which the reader lags the end no longer accumulates with continued output and stays at the scale of the most recent growth, with the newest row always near the viewport; once output slows, a slide still settles in the token's time, so the ending feels as it did.
- When the provider is faster than a piece per frame, the slide can be as short as a frame or so, and the displacement is indistinguishable from following the end directly: at that speed the picture can only advance frame by frame anyway.
- While the reader owns the position, each growth costs one position write and one layout, the price of holding the position; that stretch's length is decided by the host's sampling window, and it stops pinning as soon as the window opens.
- During the displacement an element's screen position differs from its layout position by that distance: code that reads screen positions (the host's current-turn decision, the skin's turn navigator) reads a position that is off during this time. The host reads those positions only after the reader has left the end, and the reader's intent stops the displacement first.
- Other snap-positioned elements in the message column (an expanded row's sticky title) have no counter-displacement and move briefly with the displacement while stuck.
- Given up: fixing every slide at the token's duration. That form assumes the gap between two pieces is longer than the token, which a real provider does not.
- Also given up: sharing one animation across consecutive growths. The displacement has to cancel the scroll jump exactly in the same frame, and a shared animation could only make up the difference outside the jump, so each piece would show one jump. During sustained growth the only thing that can change is the length of this one displacement, so the duration follows the pace of arrival.

## Reconsider when

- When the host's own follow offers a smooth form, or opens a replaceable follow strategy, the displacement here retires.
- When the host changes the message column's wrapper structure so its displacement overflows into the scroll container and changes the scrollable height, this approach has to be re-verified.
