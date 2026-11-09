import * as React from 'react'
import * as reactDom from 'react-dom/client'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * Hangs the host's own tooltip on a control React does not own.
 *
 * The host's Tooltip takes a React element as its anchor and places the bubble
 * beside that element's rect, so the control is wrapped in two layers: the layer
 * the caller inserts is `display: contents` (it takes no layout), and the layer
 * React draws is the control's real box — its size follows the control, which
 * puts the bubble beside it. React's ref hands the control into the inner layer,
 * and pointer and focus events still bubble up.
 *
 * It is used where the skin builds a control directly: a browser-native `title`
 * beside the host's own tooltip would show two different looks.
 */

export interface HostTooltipOptions {
  side?: 'right' | 'bottom' | 'top'
  /**
   * How long to wait before the bubble appears; the host's inline action buttons
   * all appear once the pointer settles.
   */
  delayMs?: number
  /**
   * The inner box's own class name, so it takes part in the parent's layout (a
   * title elided with an ellipsis needs a flex item that fills). Without it the
   * inner box is `inline-flex`, sized by the control.
   */
  className?: string
  /**
   * The bubble hangs under the body (the default), so a scrolling or clipping
   * ancestor such as a list or the sidebar never cuts it off.
   */
  portal?: boolean
}

export interface HostTooltip {
  /** The shell inserted where the control stood. */
  readonly node: HTMLElement
  /** Swap the tip's text. */
  setLabel(label: string): void
  /**
   * Take the tip down: the control goes back to the shell's place, and the control
   * itself stays.
   */
  release(): void
}

/**
 * A React element as the host Tooltip's anchor. The host injects its own
 * attributes into the anchor (`aria-describedby` and a few events), so the type
 * requires the element to declare one of them; the element accepts those
 * attributes anyway, and this only writes that requirement out.
 */
export function tooltipAnchor(element: React.ReactElement): React.ReactElement<{ 'aria-describedby'?: string }> {
  return element as React.ReactElement<{ 'aria-describedby'?: string }>
}

export function hostTooltip(control: HTMLElement, label: string, options: HostTooltipOptions = {}): HostTooltip {
  const mount = document.createElement('span')
  mount.style.display = 'contents'
  let text = label
  const root = reactDom.createRoot(mount)
  /**
   * The control itself stays in the inner box: React owns the anchor layer only
   * and never redraws the control's content.
   */
  function adopt(node: HTMLElement | null) {
    if (node === null || control.parentNode === node) return
    node.appendChild(control)
  }
  function render() {
    root.render(React.createElement(primitives.Tooltip, {
      label: text,
      side: options.side ?? 'bottom',
      portal: options.portal ?? true,
      ...options.delayMs === undefined ? {} : { delayMs: options.delayMs },
      children: React.createElement('span', {
        className: options.className,
        style: options.className === undefined ? { display: 'inline-flex' } : undefined,
        ref: adopt,
      }),
    }))
  }
  render()
  return {
    node: mount,
    setLabel(next: string) {
      if (next === text) return
      text = next
      render()
    },
    release() {
      root.unmount()
      if (!mount.isConnected) return
      control.remove()
      mount.replaceWith(control)
    },
  }
}
