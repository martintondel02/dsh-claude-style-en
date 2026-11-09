# Architecture

`dsh-claude-style` is a theme plugin for DeepSeek Harness, packaged as one npm package (D7). The host loader accepts only a single-file artifact and offers no asset addresses, so the package holds build output, and the source is split into two halves: the browser half changes the page's appearance and interaction, and the host half does what the browser cannot reach — read the user's files, register private routes, patch the host (D36).

This document is the map of the code: what parts the repository consists of, what connects them, and which constraints cross module boundaries. Why a particular module has its present shape is written in that module's header comment; directional choices are in `docs/adr/`.

## The shape of the repository

| Location | What it holds |
|---|---|
| `packages/client` | The browser half: entry, core runtime, shared layer, theme stylesheets, the features |
| `packages/host` | The host half: private routes, settings, usage, search, peak rates, cache files |
| `packages/contracts` | Types and constants the two halves share: host selectors, private routes, host services, preferences, moments, brands, usage |
| `packages/engine` | Mechanisms that talk to the host directly and are unrelated to appearance. On the browser side (`src`): the observation bus and frame pipeline, host element and host service reads, the feature scheduler, preference binding, scroll arbitration, part markers, stylesheet mounting, deferred chunk loading, the seam that hands over the skin's vocabulary. On the host process side (`node`): request fencing and JSON replies, Harness home directory paths, cache files, session log reading, replies for static files and hashed assets, package root lookup |
| `packages/assets` | Images, brand marks and font faces, and the build step that generates the asset manifest |
| `packages/testing` | Validation tools: specs in the three layers of logic, mechanism and behaviour, the smoke, end-to-end, the fault corpus, probes, screenshots, and the manifests and tables used for checking |
| `scripts` | Build, check, documentation and release tools |
| `locale` | The plugin's interface copy, which is plugin metadata |
| `lib` | The build output (D47), never edited by hand and never committed |

## The engine

`packages/engine` holds the mechanisms that talk to the host page directly and are unrelated to appearance (D73). It is bundled into the artifact and is not published on its own, and each half takes what it needs.

- The engine does not know the skin: the attribute names it writes (part, holding, silent, reader takeover), together with the two menu anchors, are handed in by the skin before mounting through `engine/src/skin.ts` and the vocabulary of `installParts`; asked for one of them that was never handed over, it throws. Stylesheet ids, package names and text, and the shared-module table for deferred chunks, are handed in on every call.
- The engine has an entry on each side: `engine/src` runs in the page, `engine/node` runs in the host process (each type-checked with its own configuration). The host half's build inlines `engine/node` modules, contracts included, into every module that uses them, so the artifact carries no bare specifier pointing at the engine. Package name, cache directory and log prefix are taken by the host half from the contract's `PACKAGE_NAME` and passed to the engine as arguments.
- The side that belongs to the skin: the feature manifests and feature handle table, preference values and the page mirror, account identity and model copy live in the browser half, while the host half keeps private routes, settings, usage, search and peak rates, and the engine references none of them.
- The dependency direction is checked by `npm run lint`: the engine may not import the browser half, the host half, or a generated module carrying the skin's vocabulary. The source tree's attribute check reads both the engine and the browser half, and the attribute names written at the seam are recorded there.

## The browser half

`entry.ts` is the only entry, and the exported `apply(ctx)` is called by the host loader. One mount proceeds in a fixed order: stop other theme stylesheets first, then mount this generation's stylesheet, then install the features by manifest. Teardown follows the same path: `ctx.effect` is registered first, the `teardown()` it calls may run repeatedly, the features' stop functions run one by one in reverse install order, and one feature throwing does not block the rest (D12).

- `core/` is the core runtime, where each page-level shared resource has exactly one owner (D40): preferences and switches, the feature scheduler, host access (every read of a host service is collected here, and features call it by an accessor named for what it does), interface copy. Mechanisms that talk to the host directly are in `packages/engine` (D73).
- `features/<name>/` are the features, one directory per feature: the main module exports `install(ctx, ui)`, and a `<main module>.manifest.ts` beside it registers the feature's facts, with the manifest's shape defined by `FeatureManifest` in `core/feature.ts` (D76). A feature module writes `ui` as `FeatureUi<typeof manifest>`, so it sees only its own handles and the ones it `reads`; a new handle goes into the scheduler's `Handles`.
- `shared/` is the shared layer: mechanisms two or more features use. Features do not borrow each other's class names; shared looks use neutral shared class names.
- `theme/` holds stylesheets that belong to no feature: tokens, window frame, sidebar, typography, third-party plugins, the scrim under a wallpaper.

An entry in a feature manifest with `load: 'deferred'` has its module moved out of the main artifact into a chunk, fetched when the page really uses it (D76); only features the first frames can do without are deferred.

React and the host packages are imported by name, always externalized, and provided by the host. Build-time-only data (stylesheet text, asset addresses, brand marks, the build id) is imported from `virtual:dsh-claude-style/generated`, with its types declared separately. Values from host services and snapshots are written as unknown values until the contracts module gives them a type.

## The host half

The host half runs in node and belongs to the same package as the browser half. It registers private routes (D75), reads session logs and user settings, aggregates usage, provides search and peak rates, writes cache files, and patches a piece of the host. Its routes read the user's own data, so the same fence stands in front of every one of them, borrowing the validation the host itself applies to `/api`.

The contracts module is the two halves' common language: the shape of a host selector, a private route, a host service, a preference key, a moment or a usage bucket is defined once, there.

## Invariants

These constraints cross module boundaries; read them before changing anything here:

- **Fail fast** (D12): an error is thrown where it happens, not swallowed and not silently fallen back from; an allowed catch states its reason beside it, and teardown is the only cleanup point.
- **Host queries go through one place** (D3, D75): when the same host query or the same kind of selector appears a second time, move it into the host access module; a selector is written into the contracts module and registered in the feature manifest. Reading a host service also goes through one place: a feature calls an accessor in the host access module named for what it does, and the service name and the shape it is read into are written only there.
- **There is one bus for observing page changes and one pipeline for each frame's writes** (D40): features do not set up observers of their own, do not each query the whole document, and do not each request an animation frame. The bus and the pipeline are provided by the engine, and a feature's observations are registered through it.
- **The engine does not know the skin** (D73): the engine may not import the browser half, the host half, or a generated module carrying the skin's vocabulary; the skin vocabulary it needs comes through the seam, and `npm run lint` rejects any reverse import.
- **Assets have one path**: image and graphic assets have their content hashed by the build, and the file's own size decides whether it is inlined into the artifact or served through the host half's generic route; the route recognizes only names that appear in the manifest. A deferred feature's chunk and its map file go through the same route.
- **Moments, easing curves and layers are read only from tokens** (D9): `theme/tokens.json` is the only source, stylesheets and scripts read the same value, and features do not each read system settings.
- **A stylesheet has one owner** (D36, D76): one that belongs to a feature goes into its manifest, and one that belongs to no feature goes into the build's theme stylesheet list.
- **`lib/` is the artifact** (D47): the build writes it, the host loader reads it, and it is never edited by hand and never committed.

## The path of one mount

`npm run build` compiles `packages/client/src/` and `packages/host/src/` into `lib/`: the host half is `lib/host/index.js`, the browser half is the single file `lib/client.js`, and assets land in `lib/assets/`. The host loader reads the former, hands the latter to the page, and the page calls `apply(ctx)` with the boot data.

## Checks

Every invariant has a check guarding it, and the checks follow the source, not the documents: `npm run lint` handles the rules that need no build, `npm run build` checks the import graph, selectors, stylesheet scoping and asset correspondence while bundling, the logic- and mechanism-layer specs (`npm test`) check functions and mechanisms through the declared logic surface and each package's public modules, the smoke (`npm run smoke`) checks the artifact's mount and teardown on a stand-in host page, the behaviour-layer specs (`npm run behaviour`) check what the reader can see on the same page, and the end-to-end lane (`npm run verify -- --e2e`) checks behaviour on the real host; every tier is started by `npm run verify` (D87). When a rule can be enforced by a tool, it is written in a check, not in a document (D48).
