import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'surface',
  order: 265,
  contracts: ['shell.sidebar-root', 'shell.sidebar-brand', 'shell.sidebar-toggle', 'shell.windows-menu', 'ds-bot.return', 'ds-bot.account', 'ds-bot.account-menu', 'ds-bot.agent-item', 'ds-bot.sidebar-top'],
  ungated: 'Appears only with ds-bot installed: without it the host has one interface only, and the switch has nothing to toggle',
  stylesheets: [{ file: 'surface.css', rank: 380, scope: 'surface' }],
  // The stand-in page has no ds-bot; the lane's dsBot scenario walks the switch beside the real one (D87).
  cases: []
} satisfies FeatureManifest
