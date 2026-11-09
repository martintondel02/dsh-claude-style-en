import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'rowSkip',
  order: 257,
  contracts: ['chat.user-row', 'chat.process-answer'],
  ungated: 'An offscreen conversation row skips layout only once it has been laid out at its real size, so scrolling never jumps on an estimated height; it is what keeps long conversations fast and gets no switch of the reader\'s',
  stylesheets: [{ file: 'row-skip.css', rank: 55 }],
  cases: [],
} satisfies FeatureManifest
