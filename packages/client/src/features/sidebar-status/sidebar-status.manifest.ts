import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sidebarStatus',
  order: 153,
  ungated: 'The native sidebar status shows at the head or the tail of the row; the status itself stays the host\'s',
  contracts: ['shell.sidebar-slot', 'session.phase', 'workspace.leading-outlet'],
  stylesheets: [{ file: 'sidebar-status.css', rank: 117 }],
  /**
   * The Motion tab's Ongoing conversations row chooses the look; where that
   * look stands belongs to the row it stands in, so this row rests under it.
   */
  settingsRows: [{
    tab: 'motion',
    rank: 45,
    pref: 'ongoingIndicatorSide',
    parent: 'ongoingIndicator',
    title: 'sideTitle',
    choiceLabels: { left: 'sideLeft', right: 'sideRight' },
  }],
  cases: [],
} satisfies FeatureManifest
