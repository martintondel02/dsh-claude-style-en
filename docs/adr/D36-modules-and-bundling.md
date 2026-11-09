# D36. TypeScript, esbuild and zero runtime dependencies

- **Replaces**: D1

## Background

The host loader accepts only a single-file artifact and provides neither relative imports nor asset addresses. The early build held dependency order together by concatenating fragments by hand; as sources and fragments multiplied it became hard to follow, and the build script itself came to look more and more like a handwritten bundler.

## Decision

- All source is typed modules, expressing dependencies through explicit imports and exports; type checking runs in strict mode and is a step of the build.
- The build checks the bundled import graph: a missing import, a cycle, a constant used before it is initialized, and a source file no module imports all fail the build.
- A bundler produces the single-file artifact the host loader requires: minified, with a map file, and every runtime dependency externalized and provided by the host.
- Host services and values from snapshots are written as unknown values until the contracts module gives them a type; every other type is written out in full.
- Build-time-only data (stylesheet text, brand marks, asset addresses, the build id) enters the source through one generated module, with its types declared separately.
- Features whose manifests declare deferred loading each form a chunk and stay out of the main artifact.
- The old build checks each have a home: the registry and switches are guaranteed by the feature manifest's type, style rules and gating run on the syntax tree, copy structure is checked by a schema, and the asset correspondence goes to the asset manifest generator.

## Consequences

- The dev dependencies grow by a type checker, a bundler and a validation library; names in the artifact are minified, so diagnosing a problem in the field depends on the map file.
- The host values left untyped are outside type checking, so a structural host change still has to be caught by the smoke and a real instance.
- The build script no longer has to concatenate fragments or infer dependency order itself.

## Reconsider when

- The host loader natively supports relative imports of modules and asset addresses: ship the artifact as modules and assets.
