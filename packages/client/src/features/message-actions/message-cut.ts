import {
  CHAT_ANSWER_ROW_SELECTOR,
  CHAT_FLOW_SELECTOR,
  CHAT_NODE_KEY_ATTRIBUTE,
  CHAT_TURN_ATTRIBUTE,
  FLOW_KIND_ATTRIBUTE,
  TURN_TAIL_SELECTOR,
  USER_ROW_KIND,
} from '@dsh-claude-style/contracts/dom'
import type { HostUiWorkspaceService } from '@dsh-claude-style/contracts/services'
import { conversationColumn } from '@dsh-claude-style/engine/chat-dom'
import {
  closestConversationSession,
  conversationSessionId,
  currentSessionId,
  findChatTarget,
  hostConversation,
  hostSessions,
  hostUiWorkspace,
} from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'

/**
 * A reader message's position in the conversation log, and the two actions that fork away in front of it.
 *
 * The host offers no way to truncate a conversation in place: the session controller gives `fork`, which
 * copies the prefix up to an event into a new session (the host's own branch button takes that path). So
 * "retract" and "edit" both fork in front of the message's preceding event — the original session loses
 * no event; retract puts the original text back into the new session's composer, and edit sends the
 * changed text straight from there.
 */

/** The cap on waiting for the new session to bind its composer after a fork: the host creates the session first and hands its binding to the page afterwards. */
const DRAFT_SEED_WAIT_MS = 4000
/** The interval between two looks at the binding. */
const DRAFT_SEED_POLL_MS = 60

/** One reader message: its session, its event sequence number, the text it sent, and whether that turn is still running. */
export interface ReaderMessage {
  sessionId: string
  /** The message event's sequence number; the fork boundary takes the one before it. */
  seq: number
  /** The message text, with image and file attachments left out. */
  text: string
  /**
   * The message carries image or file attachments. An attachment is a draft the browser uploads for one
   * send, and only its delivery token stays in the text; putting it back into the composer or sending it
   * again loses it, so this message offers neither retract nor edit.
   */
  attachments: boolean
  /** The turn has not ended: retract and edit wait for it to stop. */
  open: boolean
}

function textOf(content: unknown): string {
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue
    const piece = block as { type?: unknown, text?: unknown }
    if (piece.type === 'text' && typeof piece.text === 'string') text += piece.text
  }
  return text
}

/** Whether there are blocks other than text: images, files, and any kind the host adds later. */
function carriesAttachments(content: unknown): boolean {
  if (!Array.isArray(content)) return false
  return content.some((block) => {
    if (typeof block !== 'object' || block === null) return false
    return (block as { type?: unknown }).type !== 'text'
  })
}


/**
 * Read the conversation node a message row stands for. The row's `data-chat-node-key` is the same key
 * the snapshot's nodes carry, and the node's own `seq` is the event sequence number at which this
 * message arrived.
 */
export function readerMessageOf(ctx: HostContext, row: Element): ReaderMessage | null {
  const session = closestConversationSession(row)
  const sessionId = conversationSessionId(session) ?? currentSessionId(ctx)
  if (sessionId === null) return null
  const snapshot = findChatTarget(ctx, sessionId)?.getSnapshot()
  if (!snapshot) return null
  const key = row.getAttribute(CHAT_NODE_KEY_ATTRIBUTE)
  if (key === null) return null
  const node = snapshot.nodes?.values?.().find(candidate => candidate.key === key && candidate.kind === USER_ROW_KIND)
  const raw = node?.data?.seq
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw)) return null
  const turn = Number(row.getAttribute(CHAT_TURN_ATTRIBUTE))
  const exchange = Number.isSafeInteger(turn) ? snapshot.timeline.turns.get(turn) : undefined
  return {
    sessionId,
    seq: raw,
    text: textOf(node?.data?.content),
    attachments: carriesAttachments(node?.data?.content),
    open: exchange !== undefined && exchange.end === undefined,
  }
}

/** The answer row itself, or the answer named by a turn-tail's turn. */
export function answerRowOf(row: Element): HTMLElement | null {
  const direct = row.closest<HTMLElement>(CHAT_ANSWER_ROW_SELECTOR)
  if (direct !== null) return direct
  const tail = row.closest<HTMLElement>(TURN_TAIL_SELECTOR)
  const turn = tail?.getAttribute(CHAT_TURN_ATTRIBUTE)
  const flow = tail?.closest(CHAT_FLOW_SELECTOR) ?? conversationColumn()
  if (!turn || !flow) return null
  return flow.querySelector<HTMLElement>(`${CHAT_ANSWER_ROW_SELECTOR}[${CHAT_TURN_ATTRIBUTE}="${CSS.escape(turn)}"]`)
}

/** The user prompt that opened the turn an answer row belongs to. */
export function answerPromptOf(ctx: HostContext, row: Element): ReaderMessage | null {
  const answer = answerRowOf(row)
  if (answer === null) return null
  const turn = answer.getAttribute(CHAT_TURN_ATTRIBUTE)
  const flow = answer.closest(CHAT_FLOW_SELECTOR) ?? conversationColumn()
  if (turn === null || flow === null) return null
  const prompt = flow.querySelector(`[${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"][${CHAT_TURN_ATTRIBUTE}="${CSS.escape(turn)}"]`)
  return prompt === null ? null : readerMessageOf(ctx, prompt)
}

/**
 * Put `text` into the new session's composer and wait until it really lands there; when `send` is true,
 * send it through the host's submit action (the same entry the editor's Enter takes).
 *
 * Right after a fork returns, the session may not be bound to the page yet, and its composer cannot be
 * read; this looks again at a fixed interval and throws at the cap — the fork has already cut the
 * message away, and the reader's text must not disappear silently.
 */
async function seedDraft(ctx: HostContext, sessionId: string, text: string, send: boolean): Promise<void> {
  const deadline = Date.now() + DRAFT_SEED_WAIT_MS
  for (;;) {
    const binding = hostSessions(ctx)?.binding(sessionId)
    const conversation = binding === undefined || binding === null ? null : hostConversation(binding.ctx)
    if (binding !== undefined && binding !== null && conversation !== null) {
      const input = conversation.input.for(binding.ctx)
      input.setDraft(text)
      if (send) {
        if (typeof input.actions?.submit !== 'function') throw new Error('message-actions: the host composer offers no submit action')
        input.actions.submit()
      } else {
        input.focus()
      }
      return
    }
    if (Date.now() >= deadline) throw new Error(`message-actions: the forked session ${sessionId} never bound its composer`)
    await new Promise<void>((resolve) => { setTimeout(resolve, DRAFT_SEED_POLL_MS) })
  }
}

/**
 * Fork in front of the message's preceding event, open the new session, and put `text` into its composer;
 * when `send` is true, send it at once, so what the reader sees is this message sent again in the new session.
 *
 * The new session's title continues the original's (`increaseTitle`), matching the host's own branch button.
 */
export async function rewindTo(ctx: HostContext, message: ReaderMessage, text: string, send: boolean): Promise<void> {
  if (message.seq <= 0) throw new Error('message-actions: no event precedes the message to fork at')
  const sessions = hostSessions(ctx)
  if (sessions === null || typeof sessions.fork !== 'function') throw new Error('message-actions: the host sessions service offers no fork')
  const childId = await sessions.fork({ sessionId: message.sessionId, atSeq: message.seq - 1, increaseTitle: true })
  const workspace = hostUiWorkspace(ctx) as HostUiWorkspaceService | null
  if (workspace === null || typeof workspace.openSession !== 'function') throw new Error('message-actions: host uiWorkspace.openSession is unavailable')
  workspace.openSession(childId)
  await seedDraft(ctx, childId, text, send)
}
