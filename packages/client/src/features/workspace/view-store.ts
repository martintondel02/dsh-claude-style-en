import type { HostArchivedFilter, HostSessionGroupBy, HostWorkspaceViewSnapshot, HostWorkspaceViewStore } from '@dsh-claude-style/contracts/services'

/** The section's view (active / archived), as far as the host's own view store tells it. */
export type SegmentView = 'active' | 'archived'

/** The reader's Active grouping, outliving a reload spent in Archived. */
const GROUP_BY_STORAGE = 'dsh-claude-style.workspaceGroupBy'

/**
 * The grouping the reader last had in Active: the store's default until this browser records one.
 *
 * All three groupings are recorded: the host's view menu already offers the single
 * flat list, and once the reader picks it, the next open is that same flat list.
 */
export function storedGroupBy(): HostSessionGroupBy {
  const stored = localStorage.getItem(GROUP_BY_STORAGE)
  if (stored === 'workspace-tree' || stored === 'flat') return stored
  return 'workspace'
}

function storeGroupBy(group: HostSessionGroupBy) {
  localStorage.setItem(GROUP_BY_STORAGE, group)
}

/** The store's filter, with a snapshot older than the filter read as the host reads it. */
export function filterOf(snapshot: HostWorkspaceViewSnapshot): HostArchivedFilter {
  return snapshot.archivedFilter === 'show' || snapshot.archivedFilter === 'only' ? snapshot.archivedFilter : 'default'
}

export function groupOf(snapshot: HostWorkspaceViewSnapshot): HostSessionGroupBy {
  return snapshot.groupBy === 'workspace-tree' || snapshot.groupBy === 'flat' ? snapshot.groupBy : 'workspace'
}

/**
 * The host's view store, followed: the host's view menu and the archive notice's
 * "Filter archived conversations" write the same state, so a change made there
 * moves the segment with it; `show` (archived rows among the others) is the one
 * state the two halves cannot share, and it is driven to `only` for the archived
 * segment to own the list. A grouping change while Active is the reader's and
 * becomes the one a later Archived visit puts back.
 *
 * The store is the registration the host keeps under `sidebar.workspaces`
 * (package `@dsh-claude-style/engine/host.ts` `hostWorkspaceView`), the same
 * instance its own view menu writes; the grouping the reader had before Archived
 * is put back on the way out, and kept in this browser for a reload spent
 * inside Archived.
 */
export function createViewStoreFollower() {
  /** The host's view store; null until its registration is on the page. */
  let store: HostWorkspaceViewStore | null = null
  let view: SegmentView = 'active'
  /**
   * The filter the store answered last: a write of the skin's own is not read
   * back as a change of the reader's, and the filter before an archived visit
   * is what tells a return from a pick.
   */
  let seenFilter: HostArchivedFilter | null = null
  /** The grouping Active had before Archived; see storedGroupBy for the reload case. */
  let activeGroupBy: HostSessionGroupBy = storedGroupBy()
  const listeners: (() => void)[] = []
  let disposed = false

  /** The host's view store, once the browser's registration is on the page. */
  function attach(next: HostWorkspaceViewStore) {
    store = next
  }

  function attached() {
    return store !== null
  }

  function currentView() {
    return view
  }

  function subscribe(listener: () => void) {
    listeners.push(listener)
    return () => {
      const at = listeners.indexOf(listener)
      if (at !== -1) listeners.splice(at, 1)
    }
  }

  function notify() {
    const current = listeners.slice()
    for (let i = 0; i < current.length; i++) current[i]()
  }

  function setView(next: SegmentView) {
    if (next === view) return
    view = next
    notify()
  }

  /** The reader's grouping, kept for the way back and across a reload inside Archived. */
  function rememberGroup(group: HostSessionGroupBy) {
    activeGroupBy = group
    storeGroupBy(group)
  }

  /**
   * Follow the host's store. Its view menu and the archive notice's
   * "Filter archived conversations" write the same state, so a change made there
   * moves the segment with it; `show` (archived rows among the others) is the one
   * state the two halves cannot share, and it is driven to `only` for the archived
   * segment to own the list. A grouping change while Active is the reader's and
   * becomes the one a later Archived visit puts back.
   */
  function reconcile() {
    const followed = store
    if (followed === null || disposed) return
    const snapshot = followed.getSnapshot()
    const filter = filterOf(snapshot)
    const group = groupOf(snapshot)
    // While the date view is on, the grouping belongs to the date-groups half (it
    // switches the host to flat and orders by date); following it as usual here would
    // record that flat list as the reader's Active grouping — one press of the bell and
    // the reader's own workspace grouping is gone. The filter is still followed: the
    // Archived page and its segment are described here, and a remount has to take the
    // host's filter as the truth.
    const dated = document.body.hasAttribute('data-dsh-claude-date-groups')
    const previous = seenFilter
    seenFilter = filter
    if (filter === 'default') {
      setView('active')
      if (previous === 'only' || previous === 'show') {
        if (dated === false && group !== activeGroupBy) followed.actions.setGroupBy(activeGroupBy)
      } else if (group !== activeGroupBy && (dated === false || group !== 'flat')) {
        // Any of the groupings the reader picks in the host's view menu (by workspace,
        // by workspace tree, flat list) is their grouping. While the date view is on,
        // the flat list is written by the date-groups half and not recorded; every
        // other one is — that is the one left in the host's store once the date view
        // steps aside (#267).
        rememberGroup(group)
      }
      return
    }
    setView('archived')
    // The flat list the Archived view runs in is the skin's arrangement, not the reader's
    // grouping: only a filter that was not already the archived one tells the
    // two apart.
    if (dated === false) {
      if (previous === 'default') rememberGroup(group)
      else if (previous === null && group !== 'flat') rememberGroup(group)
    }
    if (filter !== 'only') followed.actions.setArchivedFilter('only')
    if (group !== 'flat') followed.actions.setGroupBy('flat')
  }

  /**
   * The segment's own switch: write the host's filter and grouping, then let
   * the next pass follow the store's answer. The store keeps both, so the
   * choice survives a reload without the skin persisting anything but the
   * Active grouping.
   */
  function drive(next: SegmentView) {
    const followed = store
    if (followed === null) return
    if (next === 'archived') {
      const snapshot = followed.getSnapshot()
      if (filterOf(snapshot) === 'default') rememberGroup(groupOf(snapshot))
      followed.actions.setArchivedFilter('only')
      followed.actions.setGroupBy('flat')
      seenFilter = 'only'
    } else {
      followed.actions.setArchivedFilter('default')
      followed.actions.setGroupBy(activeGroupBy)
      seenFilter = 'default'
    }
    setView(next)
  }

  /**
   * The view's listeners, run without a change: a locale switch has to reach
   * what the view already rendered (the row actions' labels).
   */
  function refresh() {
    notify()
  }

  return { attach, attached, view: currentView, subscribe, reconcile, drive, refresh, dispose() { disposed = true } }
}
