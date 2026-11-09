import { DATE_VIEW_TOGGLE_EVENT } from '../date-groups/date-groups'
import { hostTooltip } from '../../shared/host-tooltip'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { QUIET_ATTR } from '../../constants'
import { copy } from './copy'
import { watchSidebar } from '../../shared/sidebar-watch'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostTooltip } from '../../shared/host-tooltip'

/**
 * The sidebar's workspace section header: the bell that switches the date view.
 *
 * The bell does one thing: pressing it switches the whole list between "Workspace + sessions" and "by date".
 * While the date view is on it carries a brand-coloured glow, so the reader sees at a glance which order is in force.
 *
 * It sits at the right end of the host's "Workspace" heading row, before its own two section actions: that row is
 * the section's action area, and the bell reads as one group with them. The heading row is drawn only while the
 * sidebar is wide; in a narrow sidebar the bell is not mounted.
 *
 * Search gets no entry from this row: under the `standalone` style the skin's own search button is already above,
 * and under the `icon` style the host's own search button stands in this row; both already have an entry, so a
 * third would only repeat.
 */

/** The date view is on: the bell reads it to draw its pressed state (accessibility reads it too). */
const DATE_VIEW_ATTRIBUTE = 'data-dsh-claude-date-groups'
/** A section's heading row (the parts table's section-header). */
const SECTION_HEADER_SELECTOR = '[data-dsh-claude-part~="section-header"]'
/** The "Workspace" label in the heading row: the host draws none in a narrow sidebar, and then the bell has no seat. */
const SECTION_LABEL_SELECTOR = '[data-dsh-claude-part~="section-label"]'
/** The host's own two section actions (filter and new workspace): the bell is inserted ahead of them. */
const SECTION_ACTIONS_SELECTOR = '[data-dsh-claude-part~="section-actions"]'

/** The bell: the same 16px grid and 1px stroke, so its inked area matches the host icons beside it. */
const BELL_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.9a3.6 3.6 0 0 0-3.6 3.6v2.2c0 1.4-.5 2.5-1.4 3.4h10c-.9-.9-1.4-2-1.4-3.4V6.5A3.6 3.6 0 0 0 8 2.9Z"/><path d="M6.6 12.3a1.4 1.4 0 0 0 2.8 0"/></svg>'

/** Our own writes carry the quiet mark: the wide observer hearing them does not count another page change, which would feed itself. */
function quiet(node: HTMLElement) {
  node.setAttribute(QUIET_ATTR, '')
}

export function install(ctx: HostContext) {
  /** The bell's box; it is taken down when the heading row is rebuilt or the sidebar narrows, and mounted again on the next pass. */
  let actions: HTMLElement | null = null
  /** The bell itself. */
  let trigger: HTMLButtonElement | null = null
  /** The bell's host tooltip: it carries the label changes and is taken down with the bell. */
  let tip: HostTooltip | null = null
  /** Cancels the frame the pass waits on. */
  let cancelFrame: (() => void) | null = null

  /** The bell: pressing it switches the view. */
  function buildTrigger() {
    const button = buildElement('button', 'dsh-claude-active-shelf-trigger')
    button.type = 'button'
    button.setAttribute('aria-label', copy('viewByDate'))
    quiet(button)
    const icon = buildElement('span', 'dsh-claude-active-shelf-trigger-icon')
    icon.innerHTML = BELL_SVG
    button.appendChild(icon)
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      // The date view is off by default: pressing it orders date sections, pressing again returns to the host's "Workspace + sessions".
      document.dispatchEvent(new CustomEvent(DATE_VIEW_TOGGLE_EVENT))
    })
    return button
  }

  /**
   * The section heading row the session list stands in: the heading row and the list area are two siblings under
   * the same box, and that relation identifies it, not the heading text. The host draws no heading in a narrow
   * sidebar, so this pass returns null and the bell goes with it.
   */
  const LIST_AREA_SELECTOR = '[data-dsh-claude-part~="list-area"]'
  function findSectionHeader(): HTMLElement | null {
    for (const header of headerWatch.all()) {
      const parent = header.parentElement
      if (parent === null || parent.querySelector(LIST_AREA_SELECTOR) === null) continue
      if (header.querySelector(SECTION_LABEL_SELECTOR) === null) continue
      return header
    }
    return null
  }

  /** Seat it at the right end of the "Workspace" heading row, ahead of the host's own two section actions; take it down when the row is absent. */
  function seatActions() {
    const header = findSectionHeader()
    if (header === null) {
      if (actions !== null && actions.parentElement !== null) actions.parentElement.removeChild(actions)
      return
    }
    if (actions === null) {
      actions = buildElement('div', 'dsh-claude-active-shelf-actions')
      quiet(actions)
      trigger = buildTrigger()
      // The bell is assembled by the skin, but its tip still uses the host's own bubble: the browser's native
      // title would show a second style on screen beside the host's tips. The bubble's anchor is wrapped in display: contents and takes no layout.
      tip = hostTooltip(trigger, copy('viewByDate'), { side: 'bottom' })
      actions.appendChild(tip.node)
    }
    const hostActions = header.querySelector<HTMLElement>(SECTION_ACTIONS_SELECTOR)
    const stands = actions.parentElement === header &&
      (hostActions !== null ? actions.nextElementSibling === hostActions : actions === header.lastElementChild)
    if (stands) return
    if (hostActions !== null) header.insertBefore(actions, hostActions)
    else header.appendChild(actions)
  }

  /** One pass: seat the bell, then let it tell the truth (pressed state and name). */
  function pass() {
    seatActions()
    if (trigger === null) return
    const pressed = document.body.hasAttribute(DATE_VIEW_ATTRIBUTE)
    const label = pressed ? copy('viewByWorkspace') : copy('viewByDate')
    if (trigger.getAttribute('aria-pressed') !== String(pressed)) trigger.setAttribute('aria-pressed', String(pressed))
    if (trigger.getAttribute('aria-label') !== label) trigger.setAttribute('aria-label', label)
    tip?.setLabel(label)
  }

  /** Wait for this frame to write: the host's rebuilds come several times in a row and collapse into one pass here. */
  function schedule() {
    if (cancelFrame !== null) return
    cancelFrame = requestFrame({
      write() {
        cancelFrame = null
        pass()
      },
    })
  }

  /** The host rebuilds its top row and moves rows between lists: both count as sidebar changes, and the bell is seated and the pass runs again. */
  const stopWatch = watchSidebar(schedule)
  /** The sidebar's section heading rows, kept by the bus by selector (D40): a rebuilt heading row re-mounts the bell with it. */
  const headerWatch = observeMatches<HTMLElement>(SECTION_HEADER_SELECTOR, schedule)

  pass()

  return () => {
    stopWatch()
    headerWatch.release()
    if (cancelFrame !== null) cancelFrame()
    tip?.release()
    tip = null
    if (actions !== null && actions.parentElement !== null) actions.parentElement.removeChild(actions)
    trigger = null
    actions = null
  }
}
