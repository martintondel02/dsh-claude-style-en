import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'quickProviders',
  order: 110,
  reads: ['model'],
  contracts: [],
  ungated: 'A settings row of the model picker; it draws nothing on the page',
  stylesheets: [],
  cases: ['settings']
} satisfies FeatureManifest
