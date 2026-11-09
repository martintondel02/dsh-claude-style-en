# D81. Page zoom stays in the stylesheet; the host's floating cards get back a one-pixel-to-one-pixel space

## Background

The "Page zoom" setting is written by the theme stylesheet as `zoom` on `<body>`. A `zoom` written on an element scales its subtree by the factor, while `getBoundingClientRect()` still answers in the viewport's own pixels: the same length differs by that factor between the two places. The skin's own floating cards divide by the factor before writing a position, so they land correctly; the host's own floating cards write the measured rectangle straight into fixed `left` and `top`, so they are multiplied once more and land a factor away from the row.

There is another layer: the host measures its own cards in page pixels and the row it hangs from in viewport pixels. When a menu opens above its trigger by its own height, the host computes "the trigger's top edge minus the card's height minus the gap", with the card height undercounted by that factor, so the menu sits on top of the trigger, by exactly that share of the card's height. The larger the factor, the more it presses.

The way that truly avoids this is the browser's own page zoom: it changes the size of the layout viewport, so rectangles and written lengths are in the same space. The renderer process cannot reach it — there is no Electron module, `dshDesktop` exposes only the browser panel, keyboard, shortcuts and updates, and the host client has no zoom service either. That route would need the desktop shell to open a zoom interface first, and this setting would also have to stay desktop-only.

## Decision

- Page zoom continues to come from the stylesheet's `zoom`.
- The host's own floating cards get back a one-pixel-to-one-pixel space: write `zoom: 1 / factor` on the card, so its subtree is painted once at the page's factor and divided back out by the card's own factor. The lengths the host writes and the boxes the host measured are then the same length on screen, and the position it computes from its own height holds.
- Handle only nodes that are direct children of `<body>`, carry inline `left` and `top` of their own, and have `position` `fixed` or `absolute`: the host mixes the two spaces only when it writes a position from a measured rectangle, and a floating card the stylesheet places itself does not need this. The skin's own floating cards are excluded already; they divide by the factor before writing a position.
- Recompute each time the host rewrites `left` or `top`; recompute all of them when settings change; hand each card back on uninstall or when the page is no longer scaled.
- The page's own size is written as two custom properties (`--dsh-claude-page-height`, `--dsh-claude-page-width`) for rules that cap a card against the window; `vh` and `vw` in a scaled page are the window's size multiplied once more, and a card capped with them would be taller or wider than the window.
- When the factor is not 1, `<body>` takes these two lengths as its own width and height, and the page itself does not scroll: boxes written in viewport units or measured against the window would leave a stretch of scrollable blank beyond the window, and with the body stopped at the window's size, the window's edge is the page's edge and there is no scrollable blank beyond it.

## Consequences

- The abandoned approach: replacing `zoom` with `transform: scale` makes fixed positioning anchor to the transformed ancestor instead, landing wrong the same way; rewriting the host's own `left` and `top` is overwritten by the host on the next frame; cancelling only the repeated magnification (writing a counter-offset) leaves the painted size still growing with the scale, while a position computed from the card's own height is still off by that share of the height, because the host measured in the other space; adding `transform: scale` on top of the counter-offset to magnify the picture back brings that error back, since the `offsetHeight` the host reads is the number without the transform.
- A card handed back this way keeps the size the host designed and does not grow or shrink with page zoom. Its position and its own cap both go by the window, which is the space the host used to write those numbers.
- The skin's own floating cards are unaffected: the skin places them in the page's own pixels, and their size grows with the scale.

## Reconsider when

- When the host writes its own floating cards' positions in one space, or converts for page zoom, this handling retires.
- When the desktop shell opens a real page-zoom interface to the page, the setting uses that interface and this handling goes away with it.
