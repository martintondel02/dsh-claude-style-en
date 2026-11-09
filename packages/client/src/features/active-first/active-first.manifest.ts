import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'activeFirst',
  order: 262,
  contracts: ['session.row-key', 'session.row', 'session.phase', 'session.ongoing-state', 'session.ongoing'],
  ungated: 'Running sessions stand at the head of the column they belong to; the rows themselves are still the ones the host draws, only their order follows the state. Whichever sessions the reader sees running, the order follows — no switch is needed',
  stylesheets: [],
  cases: [],
} satisfies FeatureManifest
