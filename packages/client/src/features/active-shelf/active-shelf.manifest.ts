import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'activeShelf',
  order: 264,
  contracts: ['session.row-key'],
  ungated: 'A bell at the right end of the sidebar\'s "Workspace" heading row opens the list of sessions running at this moment: the list itself still uses the host\'s own session data, and when there are none on the page the bell shows only a count',
  stylesheets: [{ file: 'active-shelf.css', rank: 132 }],
  cases: [],
} satisfies FeatureManifest
