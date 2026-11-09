import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'bottomPanelFit',
  order: 261,
  contracts: ['composer.seat', 'shell.rightbar-column'],
  ungated: 'Converts dsh-better-sidebar\'s bottom panel back into the page\'s own pixels from the measured margins of the left and right bars and the composer seat; writes pause while a sidebar is dragged, and at a page scale of 1 it writes nothing',
  stylesheets: [],
  cases: [],
} satisfies FeatureManifest
