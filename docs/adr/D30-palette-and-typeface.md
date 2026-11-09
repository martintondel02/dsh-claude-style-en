# D30. Brand and palette

- **Replaces**: D50, D64

## Background

The skin paints the host's own interface, and its colours and fonts may come from the host or from another theme plugin. A brand has to switch between keeping the host's brand and taking the skin's own, and a reader may also want their own mark and accent colour. All of this changes only what is painted, not how features behave; written as branches inside features, every stylesheet would have to know which brand is current.

## Decision

- Palette and typeface are each a preference that can follow the host; under follow-the-host the skin's surfaces read aliases of host tokens, and the result does not depend on the order the stylesheets load in.
- Brands switch by tier; a tier decides the default palette and mark and does not change feature behaviour. Adding a brand tier leaves the feature stylesheets untouched.
- A palette switch works through tokens alone: a tier rewrites the host aliases and the skin's private tokens as one set, and feature stylesheets always read tokens.
- A colour card can pin any tier's palette: what is pinned is only the palette, and the brand mark is still decided by the brand preference; "Follow the brand again" hands the palette back to the brand and keeps the reader's own four colours.
- A tier's palette is derived at build time from that tier's seed colours and one shared ladder table. The seeds are the accent, the light and dark canvases and the inline-code ink; the sidebar and the reader's bubble take a colour of their own, and body links may take one too, derived from the accent when they do not. The ladder table holds each colour token's lightness step, chroma and alpha relative to its seed, shared across tiers.
- Tiers differ only in their seeds and one structural trait: how dark outlines are drawn (a lit highlight or a surface step).
- Brand art colouring is not part of the colour card: it follows the "Mark colours" preference, whose values are the mark's own colour (per tier), the accent and the text colour; the settings page's brand preview draws the brand mark and the reader's uploaded image by it.
- The reader can write a third colour card of their own: four colours stored as a preference, with the page writing the ladder's relative colours in a block per brand and scheme; when it is the picked card the whole palette derives from it. All three cards can be picked, picking a brand card changes only the palette, and a reader changing one colour switches to their own card.
- Every colour token the skin defines needs a value or an alias in every tier; a missing one fails the build.
- Colours the ladder cannot derive stay literal: the reasoning slider's apex purple, the focus ring, the ripple's front, peak and off-peak billing and the shadow.
- A custom brand is a layer over the selected brand: name, mark image, wordmark, mark colouring and its own colour card are independent, and whatever the reader does not provide stays as the selected brand has it.
- A custom brand introduces no behavioural divergence; when one would, it is handled as a separate theme package and not folded into this layer.
- The accent applies only under the skin's own palette tiers; under follow-the-host the whole colour card is absent, and the reader's stored values remain.
- Earlier versions had a single accent colour; an accent read from that version lands in the custom card's first colour and selects that card, so the picture matches the stored value.

## Consequences

- Adding a tier writes one set of seeds and a mark; changing the shared ladder moves every tier at once.
- Palette and mark are separate: the brand mark's ink is written by brand trait outside the colour card block, so pinning another colour card does not change the mark.
- The shared ladder puts most of a tier's colours near hand-picked values rather than exactly on them, with an odd accent or ink up to a few ΔE00 apart; tiers are no longer hand-tuned individually.
- The build output is resolved static colour values, with no colour formulas in the page; colour picking, contrast checks and appearance snapshots all read final colours.
- The reader's own card is the exception: its tokens are relative-colour expressions, the final colour is computed in the page, and reading the custom property returns the expression itself; contrast is computed when it is written, from the accent and the light and dark canvases.
- The accent's hover and link colours are still mixed at fixed ratios, which on some colours is less accurate than a hand-tuned palette.
- Every private token the skin adds needs an alias in the follow-the-host tier and a place in the ladder table.
- Every painted colour in a feature stylesheet reads a token; a hard-coded colour is overridden by whoever else paints the page under follow-the-host.
- Custom mark images are taken by the host half and stored in the reader's own directory; after a plugin upgrade without a host restart, those images are absent.
- Abandoned: writing a set of brand-branching rules per brand, making a custom brand another brand tier, and giving each tier its own ladder table.

## Reconsider when

- The host provides a theme layer or a token layering mechanism: palette and typeface use the host's layers.
- The host provides a plugin-level file storage service: custom mark images go there.
- The host's sidebar brand mark and name slots become stable extension points: the sidebar's mark and name register slot components.
- A new brand brings behavioural divergence: the brand stops being a set of tokens and becomes a separate theme package.
- A tier needs a colour the ladder cannot express: add a rung or a structural trait first; the same colour hand-tuned back and forth across tiers means the ladder needs re-tiering.
