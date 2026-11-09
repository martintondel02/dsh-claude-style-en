import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'brand',
  order: 15,
  contracts: [],
  ungated: 'Draws only the brand name, mark and accent the reader supplies; with nothing supplied the page matches the selected brand',
  stylesheets: [{ file: 'brand.css', rank: 115 }],
  cases: ['custom-brand']
} satisfies FeatureManifest
