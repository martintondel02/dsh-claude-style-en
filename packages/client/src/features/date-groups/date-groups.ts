import { SESSION_ROW_KEY_ATTRIBUTE, SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { QUIET_ATTR } from '../../constants'
import { watchSidebar } from '../../shared/sidebar-watch'
import { hostSessions, hostWorkspaces, hostWorkspaceView } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type { HostSessionGroupBy, HostSessionsService, HostWorkspacesService } from '@dsh-claude-style/contracts/services'
import { copy } from './copy'
import type { CopyKey } from './copy'
import type manifest from './date-groups.manifest'

/**
 * The sidebar's session list ordered by date: today, yesterday, a weekday; anything older than a week
 * goes into "Earlier", the newest stands at the top of each section, and the row's right hand names
 * the workspace it belongs to.
 *
 * The host has no "by date" choice of its own — its view store knows only by workspace, workspace tree
 * and flat — and in the workspace grouping each section is its own list, so dates cannot cross sections.
 * So this feature does two things: it switches the host's view store to flat, so every session lands on
 * one list; and it re-orders the seats in that list by update time and inserts a header of its own at the
 * start of each section.
 *
 * The rows themselves do not move, only the box the host wraps around each row (the same device as
 * "running sessions stand first"): a box holds one row, so moving the box leaves React's bookkeeping alone.
 * Every write is compared with what stands first, and when it already stands nothing is written — our own
 * writes make the observer run again, and without the comparison it would feed itself.
 */

/** The row's right-hand cluster of inline buttons: the workspace chip is inserted ahead of it. */
const ROW_ACTIONS_SELECTOR = '[data-dsh-claude-part~="row-actions"]'
/** The date header this feature inserts. */
const HEADER_ATTRIBUTE = 'data-dsh-claude-date-header'
/** The workspace chip this feature inserts in the row. */
const CHIP_CLASS = 'dsh-claude-date-chip'
/** Our own writes carry the quiet mark: the wide observer hearing them does not count another page change, which would feed itself. */
function quiet(node: HTMLElement) {
  node.setAttribute(QUIET_ATTR, '')
}
/** The mode mark lands on the body; the stylesheet reads it to decide which rules apply. */
const MODE_ATTRIBUTE = 'data-dsh-claude-date-groups'
/** The reader is browsing archived sessions: that view is not grouped by date, and the stylesheet reads this mark to stand the date view's rules down. */
const ARCHIVED_ATTRIBUTE = 'data-dsh-claude-date-archived'
/**
 * The grouping in force before the switch to flat is remembered here. The host's view store writes
 * that choice into its own storage, so memory alone is not enough: a reader who quits inside the date
 * view would come back to a flat list.
 */
const GROUP_BACKUP_KEY = 'dsh-claude-group-before-date-view'
/** Days within a week are titled by weekday; anything earlier falls into one section. */
const WEEKDAY_LIMIT = 7
/**
 * The name of the view-switch event: the bell dispatches it and this feature takes it, switching between
 * the host's by-workspace order and our by-date order. The date view is off by default, and that choice
 * does not survive a refresh.
 */
export const DATE_VIEW_TOGGLE_EVENT = 'dsh-claude-toggle-date-view'

/** The header key of the section a day belongs to (in the order of Date#getDay). */
const WEEKDAY_KEYS: CopyKey[] = ['weekday0', 'weekday1', 'weekday2', 'weekday3', 'weekday4', 'weekday5', 'weekday6']

/** One seat in a list: the box the host wraps around a row, plus the session read from it. */
interface Seat {
  /** The host's box: this is what moves in the list, not the row. */
  box: HTMLElement
  /** The row inside the box, where the key is read and the chip is inserted. */
  row: HTMLElement
  /** The session id (the row key with its `session:` prefix removed). */
  id: string
  /** The last update time, which orders both the sections and the rows within them. */
  updatedAt: number
  /** Days away from today: 0 today, 1 yesterday, larger means earlier. */
  day: number
}

/** Local midnight of that day. */
function startOfDay(time: number) {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * How many days lie between two midnights.
 *
 * Counted by converting year, month and day into a day index and subtracting, rather than dividing a
 * millisecond gap by a day: a daylight-saving day has only 23 hours, and a millisecond gap would count
 * early and late in the same day as a day apart (or the reverse).
 */
function daysBetween(earlier: number, later: number) {
  const index = (stamp: number) => {
    const date = new Date(stamp)
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  }
  return index(later) - index(earlier)
}

/** Remember the reader's previous grouping (skipped when localStorage is unavailable, leaving the in-memory copy alone). */
function rememberGroup(group: HostSessionGroupBy) {
  try {
    globalThis.localStorage?.setItem(GROUP_BACKUP_KEY, group)
  } catch {
    // Private mode or storage disabled: the in-memory previousGroup still carries this session.
  }
}

/** Read back the grouping remembered last time; null when absent or not a valid value. */
function rememberedGroup(): HostSessionGroupBy | null {
  try {
    const value = globalThis.localStorage?.getItem(GROUP_BACKUP_KEY)
    return value === 'workspace' || value === 'workspace-tree' || value === 'flat' ? value : null
  } catch {
    return null
  }
}

/** Removed once restored: this backup should exist only while the reader stays in the date view. */
function forgetGroup() {
  try {
    globalThis.localStorage?.removeItem(GROUP_BACKUP_KEY)
  } catch {
    // As above, failing to remove it does not affect this session.
  }
}

/** The title of the section a seat belongs to: today, yesterday, a weekday; anything older than a week is "Earlier". */
function labelOf(seat: Seat) {
  if (seat.day <= 0) return copy('today')
  if (seat.day === 1) return copy('yesterday')
  if (seat.day < WEEKDAY_LIMIT) {
    const key = WEEKDAY_KEYS[new Date(seat.updatedAt).getDay()]
    if (key !== undefined) return copy(key)
  }
  return copy('earlier')
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /**
   * The host's services are fetched on every pass rather than once at install: this feature is installed
   * with the plugin, and the host registers `sessions`, `workspaces` and the view store only after that.
   * A value captured at install would be null for the whole generation — the date view would draw every
   * section as "Earlier" and the rows would carry no workspace chip (#222).
   */
  const sessionsNow = () => hostSessions(ctx)
  const workspacesNow = () => hostWorkspaces(ctx)
  const viewNow = () => hostWorkspaceView(ctx)

  /** The nodes this feature inserted into the page, collected on teardown from this list (no second query of the document). */
  const mine = new Set<HTMLElement>()
  /** The grouping in force before this feature switched the host's view store to flat, restored on teardown. */
  let previousGroup: HostSessionGroupBy | null = null
  /** Flat is the value this feature wrote: any other value read back from the store is the reader's choice. */
  let flattening = false
  /** Whether the date view is on: off by default, and the reader turns it on with the bell. */
  let dateMode = false
  let disposed = false

  /**
   * Session id → the workspace it belongs to, and whether that ownership is complete.
   *
   * `ready` is true only after the host's workspace list has answered: before that there is no answer
   * about who belongs where, and the page must not read it as "this session belongs to no workspace"
   * and hide it.
   */
  function workspacesById() {
    const titles = new Map<string, string>()
    const list = workspacesNow()?.list
    const snapshot = typeof list?.getSnapshot === 'function' ? list.getSnapshot() : undefined
    if (snapshot === undefined || snapshot === null || snapshot.phase === 'pending') return { titles, ready: false }
    // When the page has no workspace list, `items` may be missing entirely: that also counts as no answer yet.
    if (!Array.isArray(snapshot.items)) return { titles, ready: false }
    for (const row of snapshot.items) {
      for (const id of row.sessionIds) if (!titles.has(id)) titles.set(id, row.title)
    }
    return { titles, ready: true }
  }

  /** Session id → its last update time. */
  function timesById() {
    const times = new Map<string, number>()
    const list = sessionsNow()?.list
    const snapshot = typeof list?.getSnapshot === 'function' ? list.getSnapshot() : undefined
    if (snapshot === undefined || snapshot === null || snapshot.phase === 'pending') return times
    for (const id of snapshot.ids) {
      const summary = snapshot.byId?.[id]
      if (summary !== undefined && summary !== null) times.set(id, summary.updatedAt ?? 0)
    }
    return times
  }

  /**
   * Cut the host's list down to one flat list.
   *
   * In the workspace grouping each section is its own list, and dates must cross workspaces, so they can
   * only land on one list; when the bell returns to the host view this choice goes back. The grouping is
   * kept in previousGroup, and the copy in localStorage carries it when the application is closed unexpectedly.
   *
   * Flat is this feature's write. A grouping read back after flattening that is not ours means the reader
   * changed it in the host's view menu: the date view stands down and leaves that choice in the store (#267).
   * @returns Whether the date view stood down: a pass that stood down must not go on arranging, or the
   * section headers and row chips disable() collected would be reinserted by this pass into a page that no
   * longer carries the mode mark.
   */
  function flatten(): boolean {
    const store = viewNow()
    if (store === null || store === undefined) return false
    if (typeof store.getSnapshot !== 'function' || typeof store.actions?.setGroupBy !== 'function') return false
    const group = store.getSnapshot().groupBy
    if (group === 'flat') {
      flattening = true
      return false
    }
    if (flattening) {
      // disable receives this choice: standing down must not overlay the reader's fresh choice with previousGroup.
      disable(group)
      return true
    }
    previousGroup = group
    rememberGroup(group)
    flattening = true
    store.actions.setGroupBy('flat')
    return false
  }

  /** The workspace chip: inserted ahead of the row's inline buttons, truncated by the stylesheet when too long. */
  function dress(seat: Seat, title: string) {
    const row = seat.row
    let chip = row.querySelector<HTMLElement>(`:scope > .${CHIP_CLASS}`)
    if (title === '') {
      if (chip !== null) {
        chip.remove()
        mine.delete(chip)
      }
      return
    }
    if (chip === null) {
      chip = buildElement('span', CHIP_CLASS)
      quiet(chip)
      const actions = row.querySelector(ROW_ACTIONS_SELECTOR)
      if (actions !== null && actions.parentElement === row) row.insertBefore(chip, actions)
      else row.appendChild(chip)
      mine.add(chip)
    }
    if (chip.textContent !== title) chip.textContent = title
  }

  /**
   * Arrange one list: the seats stand in date order, each section headed by its own header.
   * @param list - the common parent of the seats.
   * @param seats - this list's seats, in the order the host currently draws them.
   */
  function place(list: Element, seats: Seat[]) {
    // The order they stand in: closer to today first, and within one day the newer update first (sort is
    // stable, so two seats with the same time keep the host's order).
    const ordered = seats.slice().sort((left, right) => left.day - right.day || right.updatedAt - left.updatedAt)
    // The current order is read from the DOM, not from the bus's match list: the list is maintained
    // incrementally, and once nodes have moved its order is no longer the page's order; comparing against
    // it would judge "not standing" on every pass and re-sort the whole list again and again — which the
    // reader sees as the list twitching.
    const byBox = new Map<Element, Seat>()
    for (const seat of seats) byBox.set(seat.box, seat)
    const current: Seat[] = []
    for (const child of Array.from(list.children)) {
      const seat = byBox.get(child)
      if (seat !== undefined) current.push(seat)
    }
    const standing = current.length === ordered.length && current.every((seat, at) => seat === ordered[at])
    if (!standing) {
      // Append one by one to the end: after one round the list's seats stand in `ordered` order; the header
      // nodes are left for now and rebuilt together below (this step is needed only when the list holds
      // non-seat child nodes).
      for (const seat of ordered) list.appendChild(seat.box)
    }
    // Section boundaries: the first row where the title differs from the adjacent seat's.
    const boundaries: { before: Element, label: string }[] = []
    let lastLabel: string | null = null
    for (const seat of ordered) {
      const label = labelOf(seat)
      if (label !== lastLabel) {
        boundaries.push({ before: seat.box, label })
        lastLabel = label
      }
    }
    // The headers standing in this list, in document order.
    const headers: HTMLElement[] = []
    for (const child of Array.from(list.children)) {
      if (child instanceof HTMLElement && child.getAttribute(HEADER_ATTRIBUTE) !== null) headers.push(child)
    }
    const settled = headers.length === boundaries.length && boundaries.every((item, at) => {
      const header = headers[at]
      return header !== undefined && header.nextElementSibling === item.before && header.textContent === item.label
    })
    if (settled) return
    for (const header of headers) {
      header.remove()
      mine.delete(header)
    }
    for (const item of boundaries) {
      const header = buildElement('div', 'dsh-claude-date-header')
      quiet(header)
      header.setAttribute(HEADER_ATTRIBUTE, '')
      header.textContent = item.label
      list.insertBefore(header, item.before)
      mine.add(header)
    }
  }

  /** One writing pass: flatten the host's list first, then re-order each list by date and chip the rows. */
  function arrange() {
    if (disposed) return
    // Restoring must come before flattening: when the application was last closed inside the date view,
    // the host recorded flat and the reader's own grouping survives only in this backup. The other way
    // round would unfold the list just flattened.
    healLeftover()
    if (!dateMode) return
    // Archived sessions are not grouped by date: that is where the reader looks back at old work, and
    // date sections belong to the live list only.
    if (archivedView()) {
      calm()
      return
    }
    document.body.removeAttribute(ARCHIVED_ATTRIBUTE)
    // A pass that stood down ends here: disable() has already collected the headers and chips, and
    // arranging on would insert them back into a page without the mode mark, where only the date view's
    // stylesheet knows them.
    if (flatten()) return
    const { titles, ready } = workspacesById()
    const times = timesById()
    const today = startOfDay(Date.now())
    // Seats are grouped by the list they stand in: one list is arranged at once, so sections never cross lists.
    const lists = new Map<Element, Seat[]>()
    for (const row of rows.all()) {
      const key = row.getAttribute(SESSION_ROW_KEY_ATTRIBUTE) ?? ''
      if (!key.startsWith('session:')) continue
      const box = row.parentElement
      const list = box === null ? null : box.parentElement
      if (box === null || list === null) continue
      const id = key.slice('session:'.length)
      // Sessions that still belong to no workspace after the ownership answer is complete stand down: date
      // sections say which day a conversation happened, and a session with no owner is noise there. Before
      // ownership has answered, no row is hidden — no answer does not mean no owner.
      const workspace = titles.get(id)
      if (ready && workspace === undefined) {
        if (box.style.display !== 'none') box.style.display = 'none'
        continue
      }
      // The remaining running sessions are arranged into the "Today" block as usual.
      if (box.style.display === 'none') box.style.display = ''
      const updatedAt = times.get(id) ?? 0
      const seat: Seat = { box, row, id, updatedAt, day: daysBetween(startOfDay(updatedAt), today) }
      const seats = lists.get(list)
      if (seats === undefined) lists.set(list, [seat])
      else if (!seats.some(other => other.box === box)) seats.push(seat)
      dress(seat, workspace === undefined ? '' : workspace)
    }
    for (const [list, seats] of lists) place(list, seats)
  }

  /** Whether the reader is browsing archived now: the host's filter counts both "archived only" and "show both". */
  function archivedView() {
    const store = viewNow()
    if (store === null || store === undefined || typeof store.getSnapshot !== 'function') return false
    const snapshot = store.getSnapshot()
    return snapshot.archivedFilter === 'only' || snapshot.archivedFilter === 'show'
  }

  /**
   * Collect what the date view wrote and hand the list back to the host's order.
   * Used when the reader switches to archived: that view is not grouped by date and should keep no
   * trace of the date view.
   */
  function calm() {
    document.body.setAttribute(ARCHIVED_ATTRIBUTE, '')
    for (const node of mine) node.remove()
    mine.clear()
    restoreSeats()
  }

  /**
   * Put back what was written on the rows: rows that stood down are shown again, chips removed, and the
   * inline display on the button cluster restored. Both endings (switching to archived, turning the date
   * view off) share this.
   */
  function restoreSeats() {
    for (const row of rows.all()) {
      const box = row.parentElement
      if (box !== null && box.style.display === 'none') box.style.display = ''
      const chip = row.querySelector('.dsh-claude-date-chip')
      if (chip !== null) chip.remove()
    }
  }

  /**
   * Turn the date view on: switch to flat, re-order, chip the rows; the mark lands on the body for the
   * stylesheet and the bell to read. The arranging itself is left to the next frame: the host may be
   * redrawing the list the moment the bell is pressed, so read it after that frame.
   */
  function enable() {
    if (dateMode || disposed) return
    dateMode = true
    flattening = false
    document.body.setAttribute(MODE_ATTRIBUTE, '')
    followLists()
    schedule()
  }

  /**
   * Turn the date view off: restore the host's grouping and collect every pixel this feature wrote.
   * When `keep` is given it is already in the store: what is restored is the reader's fresh choice, not
   * what was remembered before flattening (#267).
   */
  function disable(keep?: HostSessionGroupBy) {
    if (!dateMode) return
    document.body.removeAttribute(ARCHIVED_ATTRIBUTE)
    dateMode = false
    document.body.removeAttribute(MODE_ATTRIBUTE)
    // Every header and chip this feature inserted is collected, and the display state changed on rows is restored.
    for (const node of mine) node.remove()
    mine.clear()
    restoreSeats()
    // The grouping goes back to the reader's own choice (workspace, workspace tree or flat, each exactly as it was).
    const store = viewNow()
    const restore = keep ?? previousGroup ?? rememberedGroup()
    if (restore !== null && typeof store?.actions?.setGroupBy === 'function') store.actions.setGroupBy(restore)
    previousGroup = null
    flattening = false
    forgetGroup()
  }

  /** The page is leaving: restore the grouping while still in the date view, leaving no trace of this feature in the host's storage. */
  function onPageHide() {
    if (dateMode) disable()
  }

  /** The bell was pressed: switch between the two views once. */
  function onToggle() {
    if (dateMode) disable()
    else enable()
  }

  /**
   * Ask the scheduler to run a pass on the next frame. Arranging reads the host's session and workspace
   * lists, and a service failing there should count as one failure of this feature: the scheduler wraps
   * its sync on its own, retries up to a limit, then takes this feature down and hands it to the teardown,
   * so the page's marks do not outlive a feature that has stopped.
   */
  function schedule() {
    ui.schedule?.()
  }

  /**
   * The session and workspace lists appear later than this feature's install: subscribe when the first
   * pass reads them. A change in update time can move a section boundary (the frame that crosses midnight);
   * a session changing owner or a workspace being renamed must also change the chip at the row's right hand.
   */
  let sessionList: HostSessionsService['list'] | null = null
  let workspaceList: HostWorkspacesService['list'] | null = null
  let unsubscribe: (() => void) | null = null
  let unsubscribeWorkspaces: (() => void) | null = null
  function followLists() {
    const listing = sessionsNow()?.list
    if (listing !== undefined && listing !== sessionList) {
      unsubscribe?.()
      sessionList = listing
      unsubscribe = typeof listing.subscribe === 'function' ? listing.subscribe(() => schedule()) : null
    }
    const shelf = workspacesNow()?.list
    if (shelf !== undefined && shelf !== workspaceList) {
      unsubscribeWorkspaces?.()
      workspaceList = shelf
      unsubscribeWorkspaces = typeof shelf.subscribe === 'function' ? shelf.subscribe(() => schedule()) : null
    }
  }

  /** Every session row in the sidebar, which the host may redraw wholesale at any time. */
  const rows = observeMatches<HTMLElement>(SESSION_ROW_SELECTOR, schedule)
  /** Rows replaced, lists redrawn, sections pruned by the host: all count as sidebar changes, and the list is arranged again with them. */
  const stopWatch = watchSidebar(schedule)

  /**
   * Self-healing: if the application was last closed inside the date view, the host recorded flat; here
   * it is restored to the reader's own grouping, so the bell has the right target to return to. The view
   * store appears later than install, so this runs once per pass after it shows up, and stands before
   * flattening.
   */
  let healed = false
  function healLeftover() {
    if (healed) return
    const store = viewNow()
    if (store === null) return
    healed = true
    const leftover = rememberedGroup()
    if (leftover === null) return
    const group = typeof store.getSnapshot === 'function' ? store.getSnapshot().groupBy : null
    if (group === 'flat' && typeof store.actions?.setGroupBy === 'function') store.actions.setGroupBy(leftover)
    forgetGroup()
  }

  followLists()
  healLeftover()

  /** Turn the view off, then tear down: restore the grouping and collect the inserted nodes. Both callers (the scheduler taking this feature down and a page unload) share this. */
  function teardown() {
    if (disposed) return
    disable()
    document.removeEventListener(DATE_VIEW_TOGGLE_EVENT, onToggle)
    globalThis.removeEventListener('pagehide', onPageHide)
    disposed = true
    stopWatch()
    rows.release()
    if (unsubscribe !== null) unsubscribe()
    if (unsubscribeWorkspaces !== null) unsubscribeWorkspaces()
    document.body.removeAttribute(MODE_ATTRIBUTE)
    for (const node of mine) if (node.isConnected) node.remove()
    mine.clear()
    const store = viewNow()
    if (previousGroup !== null && store !== null && store !== undefined && typeof store.actions?.setGroupBy === 'function') {
      store.actions.setGroupBy(previousGroup)
    }
  }

  ui.dateGroups = { sync: arrange, skipOnContentOnly: true, teardown }

  // The date view is off by default: installing only restores the previous flat choice to the reader's own
  // grouping, and the bell is what orders date sections.
  schedule()
  document.addEventListener(DATE_VIEW_TOGGLE_EVENT, onToggle)
  // Closed inside the date view: restore the grouping first, leaving no flat choice in the host's storage.
  globalThis.addEventListener('pagehide', onPageHide)

  return teardown
}
