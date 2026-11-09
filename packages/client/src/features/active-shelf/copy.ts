import COPY from './active-shelf.copy.json'
import { createCopy } from '../../core/i18n'

export type CopyKey = keyof typeof COPY

/**
 * The feature's own interface copy (packages/client/src/features/active-shelf/active-shelf.copy.json):
 * only the accessible names of two buttons; the copy ships with the bundle, present on the first frame.
 */
export const copy = createCopy(COPY)
