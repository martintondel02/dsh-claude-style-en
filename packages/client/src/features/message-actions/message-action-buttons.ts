import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * The two buttons at the end of the reader message's control row, drawn as the host's own buttons:
 * the labels go through the host's Tooltip (the primitives package, the same one the copy button
 * uses), and the icons are local single paths.
 *
 * They are rendered with React because the Tooltip has only a component form; the host's own buttons
 * live in the same tree, so the tips shown on hover share one style.
 */

/** The two buttons' own mark, whose value says which one it is. */
export const ACTION_BUTTON_ATTRIBUTE = 'data-dsh-claude-message-action'
export const ACTION_BUTTON_CLASS = 'dsh-claude-message-action'
/** The box carrying the two buttons: a contents box, so the host's row layout stays as it was. */
export const BUTTONS_SEAT_ATTRIBUTE = 'data-dsh-claude-message-actions'
export const BUTTONS_SEAT_CLASS = 'dsh-claude-message-actions'
/** Retract: an arrow folding back. */
const RETRACT_PATH = 'M4.5 6.5H10a4 4 0 0 1 0 8H7M4.5 6.5 7 4M4.5 6.5 7 9'
/** Edit: a pen. */
const EDIT_PATH = 'M10.8 2.7 13.3 5.2 5.8 12.7 2.9 13.4 3.6 10.5ZM9.6 3.9 12.1 6.4'
/** Rerun: a circular arrow going round once more in the original direction. */
const RERUN_PATH = 'M13.5 5.5V2.8m0 2.7h-2.7M13.2 5.2a5.5 5.5 0 1 0 1 5.2'
/** Delete this turn: a cross. */
const DELETE_PATH = 'M4 4l8 8M12 4l-8 8'

export interface MessageActionLabels {
  retract: string
  edit: string
  rerun: string
  delete: string
}

export interface MessageActionHandlers {
  retract?(): void
  edit?(): void
  rerun?(): void
  delete?(): void
}

function icon(path: string) {
  return React.createElement('svg', {
    viewBox: '0 0 16 16',
    width: 15,
    height: 15,
    'aria-hidden': true,
    focusable: 'false',
  }, React.createElement('path', {
    d: path,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }))
}

function action(kind: 'retract' | 'edit' | 'rerun' | 'delete', label: string, path: string, press: () => void) {
  return React.createElement(primitives.Tooltip, {
    label,
    side: 'bottom',
    children: React.createElement('button', {
      type: 'button',
      className: ACTION_BUTTON_CLASS,
      [ACTION_BUTTON_ATTRIBUTE]: kind,
      'aria-label': label,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation()
        press()
      },
    }, icon(path)),
  })
}

/** Each row draws only the actions it supports: the answer row gets rerun and delete, the user row retract and edit. */
export function MessageActionButtons({ labels, handlers }: { labels: MessageActionLabels, handlers: MessageActionHandlers }) {
  return React.createElement(React.Fragment, null,
    handlers.rerun === undefined ? null : action('rerun', labels.rerun, RERUN_PATH, handlers.rerun),
    handlers.retract === undefined ? null : action('retract', labels.retract, RETRACT_PATH, handlers.retract),
    handlers.edit === undefined ? null : action('edit', labels.edit, EDIT_PATH, handlers.edit),
    handlers.delete === undefined ? null : action('delete', labels.delete, DELETE_PATH, handlers.delete))
}
