import COPY from './date-groups.copy.json'
import { createCopy } from '../../core/i18n'

export type CopyKey = keyof typeof COPY

/**
 * The feature's own interface copy (packages/client/src/features/date-groups/date-groups.copy.json):
 * the copy ships with the bundle, present on the first frame; the keys hold only in this file.
 */
export const copy = createCopy(COPY)
