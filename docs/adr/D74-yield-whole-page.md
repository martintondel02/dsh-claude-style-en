# D74. Coexist with other plugins: when yielding, hand over the whole page

- **Replaces**: D49, D23, D32, D55, D56, D57, D58, D63

## Background

The chat-area interactions ported from the upstream chat plugin and the upstream itself are installed on the same page: two implementations claim the same markers, replay the same click for each other, toggle the same switch, or register the same keybinding at the same priority and throw. The skin center and another plugin that occupies the page can also take over this page's sidebar, conversation and input area at the same moment. Coexistence by avoiding one item at a time only piles up more patches; the first question is "who owns this page now".

Which pieces of interface to leave behind when yielding is decided by "where its styles come from". The settings page's layout, controls and tokens are all written in the theme's own stylesheet, and that sheet comes down with the theme, so the page left behind has only the host's default layout: the tab bar becomes a line of plain text, rows have no spacing or switches, and changing an option shows no result. To make it look right under another skin as it does now, you would have to ship a separate set of styles and tokens for it, and maintain a set of appearance alongside the theme's; that cost buys a settings page whose appearance cannot be changed under another skin.

## Decision

- The page owner is decided in exactly one place: another skin painting, or another plugin's shell mounted on the page, means yield; the decision is read synchronously at startup, then follows the real changes of the two markers and is not cached across changes. The skin wins: when both are present the page belongs to the skin.
- The grain of yielding is the whole page: no stylesheet of this theme is mounted, no scheduler installed, no marker of this theme written, no interface of this theme left, and the settings page is handed over with it. Yielding withdraws only the visuals; a feature's teardown does not touch the settings and preferences the reader has stored.
- There is exactly one exception, where another plugin provides the way back to this theme: the skin center's entry for this plugin while a skin paints, and the Chat / Code switch left on the page while ds-bot's Bot shell takes it over. The switch carries its own stylesheet reading only host tokens and depends on neither the theme's tokens nor its shared controls, so it need not yield.
- Taking the page back adopts the preferences again, mounts the stylesheets and installs every feature; a feature already installed is not installed twice.
- The ported chat-area interactions read only attributes the host itself writes, and every marker they write carries the skin's own prefix, so with the upstream installed at the same time neither implementation can claim the other's markers.
- While the upstream is present these interactions stand aside as a whole: the settings page disables the relevant rows, keeps the reader's values and states below them who has taken over; installing or removing the upstream mid-session takes them down or puts them back at once, and features do not each judge for themselves.
- Settings the upstream leaves behind are not rewritten: the behaviour the reader sees under the host's own tiers follows the host's tiers, and the documentation says so.
- These interactions use the skin's own preference entries and settings page and do not touch the upstream plugin's configuration.
- The line that says what the model is doing is written in one place only; when a visible substitute text appears at the same place, it yields by ownership, withdrawing this theme's copy and clock.

## Consequences

- While yielding, the whole page is inert: every behaviour of this package on the page stops, and the flip causes a visible remount.
- While yielding, the reader cannot open this theme's settings page, and preferences can only change after this theme takes the page back.
- The interface switch depends on markers and menu order another plugin has not promised; until it exposes an interface for reading and writing its mode, the check can only be against a fixed version. When its browser half fails to run, the stored mode makes this theme yield forever.
- The ported behaviour is covered by this repository's own cases, and upstream updates are compared by hand; when the host changes how it arranges process groups, this theme's counts and readings change with it.
- Stopped and failed turns no longer show the time and usage this theme computed; only the host's own statement remains in the history.

## Reconsider when

- When the host provides a theme-layer interface, or the upstream splits these interactions into a library that can be depended on with a stable public interface, depend on it instead of porting.
- When another plugin exposes an interface for reading and writing its mode, the interface switch uses it, and the dependency on its markers and menu order is deleted.
- When the host provides an extension point for theme plugins to paint only their own settings page, the settings page stays on the yielding page and need not carry its own styles and tokens.
