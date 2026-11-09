import * as React from 'react'
import * as reactDom from 'react-dom/client'
import { CHAT_ANSWER_ROW_SELECTOR, FLOW_KIND_ATTRIBUTE, MESSAGE_ACTION_ROW_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, TURN_TAIL_SELECTOR, USER_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { createCopy } from '../../core/i18n'
import type { FeatureUi } from '../../core/feature'
import { createHostToast } from '../../shared/host-toast'
import { ACTION_BUTTON_ATTRIBUTE, BUTTONS_SEAT_ATTRIBUTE, BUTTONS_SEAT_CLASS, MessageActionButtons } from './message-action-buttons'
import COPY from './message-actions.copy.json'
import type manifest from './message-actions.manifest'
import { answerPromptOf, answerRowOf, readerMessageOf, rewindTo } from './message-cut'

const copy = createCopy(COPY)

/**
 * A message the reader sent: the control row below it gains "Retract" and "Edit", as in Claude Code,
 * and that row shows only while the pointer rests on the message.
 *
 * The control row is the host's own (the clock and the copy button), and the skin draws no second one:
 * the host marks the control row with `[data-clock]` and the reader message with
 * `data-chat-flow-kind="user"`, and the stylesheet uses those two marks to show every reader message
 * row only on hover or focus (the host does that only for rows that still have messages after them).
 * The two buttons are inserted into the same row, so they show with it, and the copy button and the
 * time behave the same way.
 *
 * The two buttons are drawn as the host's own buttons: the labels go through the host's Tooltip, the
 * same component the copy button uses, so the tips shown on hover share shape and colour
 * (message-action-buttons.ts).
 *
 * Both actions fork (message-cut.ts): the host has no way to truncate a conversation in place, so the
 * prefix up to the event before the message is copied into a new session. Retract puts the original
 * text back into the new session's composer and waits for the reader to send it; edit sends the changed
 * text straight from there. The original session loses no event, and the reader can go back and look
 * whenever. The answer row's "Rerun" and "Delete this turn" also fork in front of that turn's user
 * prompt: rerun submits the original prompt in the new session, and delete leaves only the session
 * prefix before that turn.
 */

/** The reader message's row (the kind the host marks). */
const USER_ROW_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"]`
/** The control row: the clock and copy button the host draws in this row. */
const ACTION_SEAT_SELECTOR = `${USER_ROW_SELECTOR} [${MESSAGE_ACTION_ROW_ATTRIBUTE}]`
const ANSWER_SEAT_SELECTOR = `${TURN_TAIL_SELECTOR} [${MESSAGE_ACTION_ROW_ATTRIBUTE}]`
const MESSAGE_SEATS_SELECTOR = `${ACTION_SEAT_SELECTOR}, ${ANSWER_SEAT_SELECTOR}`
/** The row whose editor is open: the stylesheet uses it to hide the original bubble. */
const EDITING_ATTRIBUTE = 'data-dsh-claude-message-editing'
const EDITOR_CLASS = 'dsh-claude-message-editor'
const EDITOR_INPUT_CLASS = 'dsh-claude-message-editor-input'
const EDITOR_ROW_CLASS = 'dsh-claude-message-editor-row'
const EDITOR_CANCEL_CLASS = 'dsh-claude-message-editor-cancel'
const EDITOR_SAVE_CLASS = 'dsh-claude-message-editor-save'

/** The button seat this feature inserts on a control row: its box and its React root. */
interface Seat {
  box: HTMLElement
  root: reactDom.Root
}

/** The row being edited: its root, its input, and the row it writes back to. */
interface Editing {
  row: HTMLElement
  root: HTMLElement
  input: HTMLTextAreaElement
  cancel: HTMLButtonElement
  save: HTMLButtonElement
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const toast = createHostToast()
  const seats = new Map<HTMLElement, Seat>()
  let editing: Editing | null = null
  let cancelFrame: (() => void) | null = null
  let released = false
  let pendingAction = false

  /** One write waits for the next frame: the host mounts a whole subtree in one batch, and writing one by one would break that batch apart. */
  function queue(write: () => void) {
    if (released || cancelFrame !== null) return
    cancelFrame = requestFrame({
      write() {
        cancelFrame = null
        if (released) return
        write()
      },
    })
  }

  function closeEditor() {
    if (editing === null) return
    editing.row.removeAttribute(EDITING_ATTRIBUTE)
    editing.root.remove()
    editing = null
  }

  function dropSeat(actions: HTMLElement) {
    const seat = seats.get(actions)
    if (seat === undefined) return
    seat.root.unmount()
    seat.box.remove()
    seats.delete(actions)
  }

  /**
   * The end of one action: a failure tells the reader through the host's toast and stops in place.
   *
   * There is no other reporting channel here — when a fork fails the page changes nothing, and the
   * reader needs an explanation; the toast carries one generic line, and the concrete reason stays in
   * the console.
   */
  function run(action: () => unknown) {
    if (pendingAction) return
    const report = (error: unknown) => {
      console.error('[dsh-claude-style] message-actions failed:', error)
      toast.show({ text: copy('failed') })
    }
    try {
      const answer = action()
      if (answer instanceof Promise) {
        pendingAction = true
        answer.catch(report).finally(() => { pendingAction = false })
      }
    } catch (error) {
      report(error)
    }
  }

  /** Open the editor: only one at a time; an editor open on another row is collected first. */
  function openEditor(row: HTMLElement, line: HTMLElement) {
    const message = readerMessageOf(ctx, row)
    if (message === null) throw new Error('message-actions: the row no longer resolves to a message')
    if (message.open) {
      toast.show({ text: copy('running') })
      return
    }
    const host = line.parentElement
    if (host === null) throw new Error('message-actions: the action row stands without a message row')
    closeEditor()
    const root = buildElement('div', EDITOR_CLASS)
    const input = document.createElement('textarea')
    input.className = EDITOR_INPUT_CLASS
    input.value = message.text
    input.rows = Math.min(10, Math.max(2, message.text.split('\n').length))
    input.setAttribute('aria-label', copy('edit'))
    const buttons = buildElement('div', EDITOR_ROW_CLASS)
    const cancel = buildElement('button', EDITOR_CANCEL_CLASS, copy('cancel'))
    cancel.type = 'button'
    const save = buildElement('button', EDITOR_SAVE_CLASS, copy('save'))
    save.type = 'button'
    // Editing means sending this message again: with the text cleared there is nothing to send, and the reader must write something first.
    save.disabled = input.value.trim() === ''
    buttons.append(cancel, save)
    root.append(input, buttons)
    host.insertBefore(root, line)
    row.setAttribute(EDITING_ATTRIBUTE, '')
    editing = { row, root, input, cancel, save }
    input.addEventListener('input', () => {
      save.disabled = input.value.trim() === ''
    })
    cancel.addEventListener('click', (event) => {
      event.stopPropagation()
      closeEditor()
    })
    save.addEventListener('click', (event) => {
      event.stopPropagation()
      run(commitEditor)
    })
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeEditor()
        return
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        run(commitEditor)
      }
    })
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }

  /** Save the edit: fork in front of this message and send the changed text straight into the new session. */
  async function commitEditor() {
    const current = editing
    if (current === null) return
    const text = current.input.value
    // Empty text is not sent: the editor stays, and the reader fills it in and presses again.
    if (text.trim() === '') return
    const message = readerMessageOf(ctx, current.row)
    closeEditor()
    if (message === null) throw new Error('message-actions: the row no longer resolves to a message')
    await rewindTo(ctx, message, text, true)
    toast.show({ text: copy('sent') })
  }

  /** Retract: fork in front of this message, put the original text back into the new session's composer, and wait for the reader to send it. */
  async function retractMessage(row: HTMLElement) {
    const message = readerMessageOf(ctx, row)
    if (message === null) throw new Error('message-actions: the row no longer resolves to a message')
    if (message.open) {
      toast.show({ text: copy('running') })
      return
    }
    closeEditor()
    await rewindTo(ctx, message, message.text, false)
    toast.show({ text: copy('rewound') })
  }

  /** An answer's prompt must still resolve to a settled turn when the press lands. */
  function actionableAnswer(row: HTMLElement) {
    const message = answerPromptOf(ctx, row)
    if (message === null) throw new Error('message-actions: the answer no longer resolves to its prompt')
    if (message.open) {
      toast.show({ text: copy('running') })
      return null
    }
    closeEditor()
    return message
  }

  async function rerunAnswer(row: HTMLElement) {
    const message = actionableAnswer(row)
    if (message === null || message.attachments) return
    await rewindTo(ctx, message, message.text, true)
    toast.show({ text: copy('reran') })
  }

  async function deleteAnswer(row: HTMLElement) {
    const message = actionableAnswer(row)
    if (message === null) return
    await rewindTo(ctx, message, '', false)
    toast.show({ text: copy('deleted') })
  }

  /** The two buttons' actions: the host redraws a row and the buttons are redrawn with it, and the action itself reads the row as it stood then. */
  function handlersFor(row: HTMLElement, line: HTMLElement) {
    if (row.matches(CHAT_ANSWER_ROW_SELECTOR)) {
      const attachments = answerPromptOf(ctx, row)?.attachments === true
      return {
        ...(attachments ? {} : { rerun() { run(() => rerunAnswer(row)) } }),
        delete() { run(() => deleteAnswer(row)) },
      }
    }
    return {
      retract() {
        run(() => retractMessage(row))
      },
      edit() {
        run(() => openEditor(row, line))
      },
    }
  }

  function draw(seat: Seat, row: HTMLElement, line: HTMLElement) {
    const handlers = handlersFor(row, line)
    seat.root.render(React.createElement(MessageActionButtons, {
      labels: { retract: copy('retract'), edit: copy('edit'), rerun: copy('rerun'), delete: copy('delete') },
      handlers,
    }))
  }

  /** Add the two buttons to a control row; where they already stand, write no second copy. */
  function decorate(line: HTMLElement) {
    if (line.querySelector(`[${BUTTONS_SEAT_ATTRIBUTE}]`) !== null) return
    const answer = answerRowOf(line)
    const row = line.closest<HTMLElement>(USER_ROW_SELECTOR) ?? answer
    if (row === null) return
    if (answer !== null) {
      const message = answerPromptOf(ctx, answer)
      if (message === null || message.open) return
    } else {
      // Attachments are drafts the browser uploaded for one send; retract or edit would drop them.
      const message = readerMessageOf(ctx, row)
      if (message !== null && (message.text === '' || message.attachments)) return
    }
    const box = buildElement('span', BUTTONS_SEAT_CLASS)
    box.setAttribute(BUTTONS_SEAT_ATTRIBUTE, '')
    // The host draws the time and the copy button first in this row, and the two buttons follow, in Claude Code's order.
    line.append(box)
    const seat: Seat = { box, root: reactDom.createRoot(box) }
    seats.set(line, seat)
    draw(seat, row, line)
  }

  /** A language switch: the buttons' tips and the editor's text follow. */
  function relabel() {
    for (const line of seats.keys()) {
      const seat = seats.get(line)
      const row = line.closest<HTMLElement>(USER_ROW_SELECTOR)
      if (seat === undefined || row === null) continue
      draw(seat, row, line)
    }
    if (editing !== null) {
      editing.input.setAttribute('aria-label', copy('edit'))
      editing.cancel.textContent = copy('cancel')
      editing.save.textContent = copy('save')
    }
  }

  const seatsOnPage = observeMatches<HTMLElement>(MESSAGE_SEATS_SELECTOR, () => queue(sync))

  function sync() {
    for (const line of seats.keys()) if (!line.isConnected) dropSeat(line)
    if (editing !== null && !editing.root.isConnected) {
      // The host redrew this row and replaced the editor with it: the state is collected, leaving no half-open row.
      editing.row.removeAttribute(EDITING_ATTRIBUTE)
      editing = null
    }
    for (const line of seatsOnPage.all()) {
      if (line.isConnected) decorate(line)
    }
  }

  /**
   * When the host redraws a row it may replace only our buttons and leave the control row, and that
   * batch brings no new nodes to the match list, so this watches one more layer: a batch whose removals
   * contain our button is aligned once more.
   */
  const stopRemovals = subscribeMutations(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: [ROW_PHASE_ATTRIBUTE] }, (records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        queue(sync)
        continue
      }
      for (const node of record.removedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(`[${BUTTONS_SEAT_ATTRIBUTE}]`) || node.querySelector(`[${ACTION_BUTTON_ATTRIBUTE}]`) !== null) {
          queue(sync)
          return
        }
      }
    }
  })

  ui.messageActions = { onCopyChange: relabel }
  queue(sync)

  return () => {
    released = true
    delete ui.messageActions
    stopRemovals()
    seatsOnPage.release()
    if (cancelFrame !== null) cancelFrame()
    cancelFrame = null
    closeEditor()
    for (const line of [...seats.keys()]) dropSeat(line)
    toast.dispose()
  }
}
