# D73. One preference, one declaration; the engine is a package of its own

- **Replaces**: D7

## Background

Inside the repository, packages split by responsibility, and the constants the two halves share live in the contracts package. This direction stopped short on preferences: one preference had to be written once in the contract's defaults table, once in the browser half's value constants, once in the `Prefs` interface, once in the value-set table, once in the page mirror's attribute list and once in the host half's settings schema; adding a preference or changing a value meant changing them all at once, and a missed place only showed up at runtime. At the same time the browser half grew a layer of mechanisms that talk to the host directly — observation bus, frame pipeline, host access, stylesheet mounting, deferred chunk loading, scheduler, preference binding — which have nothing to do with appearance yet lived on the same layer as the skin code, and in turn had to know about specific features.

## Decision

- Only one plugin is published: a user installs once and gets both behaviour and appearance. The way to get behaviour without appearance is the palette and typeface choices in the appearance settings.
- Inside the repository, packages split by responsibility: the browser half, the host half, the contract shared by both, the engine, assets and manifest generation, and the validation tools. Which package a new piece of code goes into is decided by who depends on it.
- A preference has exactly one declaration in the contracts module: key, type, default, value set, text limits, migration of old values. The `Prefs` type, the value set, the browser half's value constants, the page mirror's defaults and the host half's settings fields are all derived from that table; the value set is written once, and a misspelled value is rejected by type checking.
- The host half's settings fields stay permissive: a field accepts strings, booleans and arrays of strings, the value set narrows only in the browser half, and an old value never makes the host refuse to start this package.
- The engine is a package of its own (`packages/engine`): the mechanisms that talk to the host directly and have nothing to do with appearance live there, and the browser half and the host half each take what they need — what runs in the page under `src`, what runs in the host process under `node`. It is bundled into the artifact and published on its own.
- Reading a host service by name happens only in the engine's `host.ts`: a feature gets a service through a purpose-named accessor function, and the lint does not allow a feature module to get it by name itself.
- The engine does not know the skin: the attribute prefix, package name, feature handle table, the scheduler's repaint source, the account identity and the model copy are supplied by the skin or stay on the skin's side.
- The dependency direction is checked by the build: the engine may not import the skin's features, theme or skin constants.
- Inside a package, directories still split by feature, with a feature's script and styles together; parts several features share get a layer of their own. A mechanism both halves share is written once, in the engine.
- The stop lines for file length and duplicated code apply by path inside each package, covering every script.

## Consequences

- Adding a preference changes three places: one row in the contracts table, the feature that uses it, and the feature's own settings row.
- When the engine interface has only one user, its shape lacks counterexample validation, and the direction of change is held by the contract tests and the real page.
- Moving files and changing logic are committed separately, and the moving commit reads its whole diff.
- Abandoned: letting each feature write down the preferences, values and host interfaces it reads (at the cost that the same assumption is written again and again, and the impact of a host or contract revision has to be collected afresh).

## Reconsider when

- When a second plugin uses this set of mechanisms, the engine becomes a separately published package, its interface shaped to the needs of both users.
- When the host provides a theme extension point or a unified subscription to page changes, the corresponding part of the engine connects to the host's.
