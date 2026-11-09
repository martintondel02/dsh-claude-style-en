import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'manualUnread',
  order: 154,
  ungated: 'The unread mark is an action in the session menu: the mark is saved with the configuration, and the page adds no switch of its own',
  contracts: ['shell.sidebar-slot', 'session.row-key'],
  stylesheets: [{ file: 'manual-unread.css', rank: 116 }],
  cases: [],
} satisfies FeatureManifest
