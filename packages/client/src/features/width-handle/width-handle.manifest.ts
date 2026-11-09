import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'widthHandle',
  order: 263,
  contracts: ['shell.width-handle'],
  ungated: 'The width handle\'s bright line waits for the pointer to settle: it never flashes as the reader passes the conversation edge, shows at once on press and stays for the whole drag; this is the handle\'s own hover feel and gets no switch of the reader\'s',
  stylesheets: [{ file: 'width-handle.css', rank: 44 }],
  cases: [],
} satisfies FeatureManifest
