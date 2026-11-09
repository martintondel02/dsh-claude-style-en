import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'rightbarFit',
  order: 256,
  contracts: ['shell.rightbar-column', 'shell.rightbar-panel', 'shell.rightbar-handle'],
  ungated: 'Converts the host right bar panel width and drag handle back into the page\'s own pixels; at a page scale of 1 it writes nothing',
  stylesheets: [],
  cases: [],
} satisfies FeatureManifest
