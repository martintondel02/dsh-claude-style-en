# D47. Build output does not enter the main branch

## Background

The build output was tracked by version control, updated only at release time, counted as neither source nor guaranteed to match the source, and ordinarily appeared in the working tree only as changed files. When a user installed the plugin from the code repository, the package with build scripts required them to approve a build and then fetch the dev dependencies.

## Decision

- The main branch does not keep the build output; continuous integration builds it when needed.
- A release is performed by continuous integration: build once, and what is published is the same artifact that passed verification.
- The same release writes the files identical to what is published to a release branch written only by continuous integration, and moves the version tag onto that commit, so installing by tag and installing from the package manager get the same artifact.
- The step that writes the release branch builds first itself; a clean checkout has no artifact, and packing alone would write a package pointing at missing files.
- Before publishing, check that the tag matches the version the package declares and fail if it does not; a rerun continues from where it stopped, a version already published is not published again, and a branch already written is not rewritten.
- A release runs in two stages: publish a prerelease from the same pack, then, once every gate has passed, publish the final version and set it as the default tag.
- Publishing uses one-time credentials and provenance; the repository stores no release token.
- After publishing, create or update the release notes with that version's changelog section as the body.

## Consequences

- A usable artifact can no longer be taken directly from any commit on the main branch; it must be built, or installed from the package manager or the release branch.
- The release flow gains pushing a branch and requesting credentials, and continuous integration needs write access to the repository.
- The prerelease stays in the package manager and is not withdrawn with the final version.

## Reconsider when

- The host can run the build automatically when installing a plugin from a code repository, or the plugin marketplace installs only from the package manager: delete the release branch.
