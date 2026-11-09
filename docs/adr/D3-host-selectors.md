# D3. The host contract lives in one contracts module

- **Replaces**: D19, D44

## Background

The skin locates elements through the structure of the host page, and depends on the shapes and ordering the host services provide. When these assumptions are scattered, the impact of a host revision has to be traced one place at a time; a hand-built stand-in page can only reproduce the structure its author already knows, never the real host's timing.

## Decision

- The host selectors, attributes, service shapes and timing assumptions the skin depends on are collected in one place (the contracts module), each noting the host build it was checked against and the features that depend on it.
- A new host selector is registered in the contracts module, the contract table and the feature manifests at the same time; the build rejects a selector literal that is not registered, and an entry no feature claims.
- Host elements are located in this order of precedence: a stable contract the host promises (slot anchors, the host's own attributes) → a marker the skin writes from structure → a class name found in the host's documentation. Interface text never takes part in locating.
- A marker the skin writes from structure is a part name matched as a whole word; stylesheets read part names and the host's stable attributes, and class-name substring matching no longer appears.
- When the same name means different things in different regions, each region registers it separately and neither pulls in the other.
- When the host mounts another of its components inside a region's box (the composer card's overlay seat), the region's name is not read inside that subtree: the seat's own class names are read as usual, and what stands inside it counts as neither the region's rows nor its controls.
- The contract test runs against the locked version of the real host components and checks every assumption in the contract; on a host upgrade it runs first, lists each assumption that no longer holds, and then the affected features are changed.
- Timing assumptions are treated the same as selectors: written into the contract and checked.
- Which build the page runs is the build id computed from the artifact's contents; a page's load time says nothing about the code's version.

## Consequences

- Adding a host selector means registering it in the contracts module, the contract table and the feature manifests at once, and the build checks that the three agree, while all three are maintained by hand.
- The contract test has to install and mount the real host packages, a heavier environment than a stand-in page; the locked host version has to be updated along with the supported range.
- On a host revision the assumptions that no longer hold are listed one by one, so the surface of change grows: every replaced assumption has to be deleted from the contract and the affected feature changed.
- Abandoned: letting each feature write down the selectors and shapes it depends on, so a change lands in one place. The cost is that the impact of a structural host change has to be collected again, and the same assumption gets written down more than once.

## Reconsider when

- The host provides an official contract or testing kit for plugins: use the host's.
- The host provides a stable attribute contract for these regions: read the host's attributes first, and the markers the skin writes from structure are deleted accordingly.
