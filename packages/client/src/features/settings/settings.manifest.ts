import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'settings',
  handle: 'settingsNav',
  order: 260,
  load: 'deferred',
  reads: ['quickProviders'],
  contracts: ['shell.dark-theme', 'shell.windows-titlebar'],
  ungated: 'The settings page itself, and the theme-flip suppression installed with it',
  stylesheets: [
    { file: 'settings.css', rank: 310 },
    { file: 'settings-zoom.css', rank: 311 },
    { file: 'settings-cards.css', rank: 315 },
    { file: 'settings-brand-lockup.css', rank: 316 },
    { file: 'theme-flip.css', rank: 370 },
  ],
  cases: ['settings', 'late-forms', 'host-palette', 'skin-center-handoff', 'skin-center-arrival']
} satisfies FeatureManifest
