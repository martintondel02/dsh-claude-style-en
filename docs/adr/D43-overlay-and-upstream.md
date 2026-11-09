# D43. Attach to the host's surfaces and the host's data

- **Replaces**: D2, D17

## Background

The skin sits on a page the host has already painted, and the host has prepared no extension points for it. At the same time the host holds exactly the data the skin needs: the available permission tiers, their names and descriptions, the interface language. If the skin wrote its own copy, the two sources would drift apart; if it attached to the host everywhere, the effect would be at the mercy of internal details the host never promised.

## Decision

- Data the host already provides is authoritative: the tier set, names and descriptions are all read from the host, and the skin only decides how to show them. A tier the host's catalog does not have does not appear, and the skin keeps no second list.
- A tier's name follows the host's original under its current language; only for a tier the host gives no translation does the skin supply a wording of its own, and internal identifiers never appear in the interface.
- Switching tiers goes to the host's own handler; the skin does not implement it a second time.
- A surface the host already provides is preferred for attachment: where the host's slot anchors, attributes and role markers can locate something, locate it that way; where the host has opened no extension point, the effect is an overlay, and the assumptions the overlay makes are written into the contracts module.
- The assumptions an overlay makes are recorded one by one: what holds it up now, what happens if that breaks, and the entry point it wants. When the host ships the corresponding capability, that place attaches to the host and the replaced assumption is deleted from the contracts module.
- Extension points are not pursued upstream: wait for the host to open them, and do not push by filing external issues or pull requests.
- The host half does only what the page cannot (assets, identity, routes, configuration of settings forms); whatever can be done in the page stays in the page.

## Consequences

- The host decides the tier set, and the skin cannot choose otherwise; for a tier the host has no translation for, the interface shows the host's wording and the skin's wording side by side.
- An overlay's correctness depends on internal details the host never promised, so after a host revision it takes a run to learn which assumption broke; the difference between an overlay and a real attachment can only be held by the contract tests and the end-to-end lane.
- Abandoned: the skin carrying a complete list of tiers and names, so the interface looks the same on any host version.
- Abandoned: actively filing extension points upstream for the few places that lack them.

## Reconsider when

- The host starts accepting external issues and pull requests, or opens complete theme extension points: reconsider pursuing extension points upstream.
- The host's tier catalog provides localized names directly: read the catalog itself.
- The host natively supports tier glyphs, or the interface gains one glyph language for tiers: consider drawing icons again.
