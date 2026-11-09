import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'dateGroups',
  // Comes after "running sessions first": the same list, where running rows are lifted to the head of the column and then handed to the date sections.
  order: 266,
  contracts: ['session.row', 'session.row-key'],
  ungated: 'The date view is off by default: the sidebar follows the host\'s own grouping, and pressing the bell in the heading row orders it into date sections; that choice does not survive a refresh. The list itself is still the one the host draws',
  stylesheets: [{ file: 'date-groups.css', rank: 134 }],
  cases: [],
} satisfies FeatureManifest
