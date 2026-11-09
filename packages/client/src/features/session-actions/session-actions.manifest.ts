import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sessionActions',
  order: 156,
  ungated: 'The context menu and the menu key reuse the ellipsis entry the session row already has; the inline buttons and the native menu both keep the host\'s look',
  contracts: ['shell.sidebar-slot'],
  stylesheets: [],
  cases: [],
} satisfies FeatureManifest
