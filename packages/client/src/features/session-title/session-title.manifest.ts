import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sessionTitle',
  order: 258,
  ungated: 'A click on the session title: only where the host draws a title does this field exist, and other pages have nothing to install on',
  contracts: [],
  stylesheets: [{ file: 'session-title.css', rank: 79 }],
  cases: []
} satisfies FeatureManifest
