import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'heroMenu',
  order: 100,
  reads: ['composer'],
  contracts: ['shell.menu'],
  ungated: 'The home area that follows the composer rework',
  stylesheets: [{ file: 'hero-menu.css', rank: 280, gate: true }],
  cases: ['popovers']
} satisfies FeatureManifest
