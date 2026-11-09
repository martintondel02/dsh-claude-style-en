import { SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'

/** The sidebar block (the host's slot name): only changes inside it are worth another pass. */
const SIDEBAR_SELECTOR = '[data-slot="sidebar"]'

/**
 * Wakes a pass only when something changed in the sidebar.
 *
 * The host's session rows, top row and list container are rebuilt inside this
 * sidebar block; a large repaint of the chat stream or the home cards has nothing
 * to do with the sidebar, and passing over it only keeps the page from settling
 * (the scheduler should not keep running while the reader sits still). The nodes
 * the skin inserts carry quiet marks, and `skipQuiet` drops those records, so a
 * write never feeds itself.
 *
 * @param schedule - the pass to wake when the sidebar really changed.
 * @returns the unsubscribe function.
 */
export function watchSidebar(schedule: () => void): () => void {
  return subscribeMutations(document.body, { childList: true, subtree: true, skipQuiet: true }, records => {
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      // The change happened inside the sidebar (a row swapped, the list repainted, a section pushed out by the host).
      if (target !== null && target.closest(SIDEBAR_SELECTOR) !== null) {
        schedule()
        return
      }
      // The whole sidebar was replaced: the new node brings its session rows with it.
      for (const node of record.addedNodes) {
        if (node instanceof Element && (node.matches(SESSION_ROW_SELECTOR) || node.querySelector(SESSION_ROW_SELECTOR) !== null)) {
          schedule()
          return
        }
      }
    }
  })
}
