import path from 'node:path'
import { HOST, check } from './lane.mjs'
import { sanitizePage } from '../../scripts/shared/privacy.mjs'

/** The visible host Tooltip, read off the page: its words and the look the host gives it. */
function readTooltip(page) {
  return page.evaluate(() => {
    const shown = [...document.querySelectorAll('[role="tooltip"]')].filter((tip) => tip.getBoundingClientRect().height > 0 && getComputedStyle(tip).opacity === '1')
    const tip = shown[shown.length - 1]
    if (tip === undefined) return null
    const style = getComputedStyle(tip)
    return { text: (tip.textContent ?? '').trim(), background: style.backgroundColor, color: style.color, radius: style.borderRadius, size: style.fontSize }
  })
}

/** Hover one control and read the Tooltip it raises, once the page has painted it. */
async function hoverTooltip(page, locator) {
  await locator.hover()
  await page.waitForFunction(() => [...document.querySelectorAll('[role="tooltip"]')].some((tip) => tip.getBoundingClientRect().height > 0 && getComputedStyle(tip).opacity === '1'), { timeout: 6000 }).catch(() => {})
  return readTooltip(page)
}


function messageActionsScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend(context) {
      const { page, notes } = context
      const value = page.locator('.dsh-claude-home-stat-value').first()
      await value.waitFor({ timeout: 20000 }).catch(() => {})
      if (await value.count() === 0) {
        notes.homeTip = null
        return
      }
      notes.homeTitle = await value.getAttribute('title')
      notes.homeText = (await value.textContent() ?? '').trim()
      notes.homeTip = await hoverTooltip(page, value)
      await page.mouse.move(5, 5)
    },
    async assert({ page, session, notes, out }) {
      const ROW = '[data-chat-flow-kind="user"]'
      const LINE = `${ROW} [data-clock]`
      const EDITOR = `${ROW} textarea`
      // The host row holds three buttons in order: the time, then copy, then the skin's two.
      const buttons = page.locator(`${LINE} button`)
      const copyButton = buttons.nth(0)
      const retractButton = buttons.nth(1)
      const editButton = buttons.nth(2)
      await buttons.nth(2).waitFor({ timeout: 20000 })
      const read = () => page.evaluate((row) => {
        const line = document.querySelector(row)
        const clock = line?.querySelector('[data-clock]') ?? null
        const bubble = line?.querySelector('[data-message-bubble]') ?? null
        return {
          buttons: clock === null ? 0 : clock.querySelectorAll('button').length,
          opacity: clock === null ? null : getComputedStyle(clock).opacity,
          sessionId: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? null,
          draft: (document.querySelector('[data-composer-input]')?.innerText ?? '').trim(),
          bubbleText: (bubble?.textContent ?? '').trim(),
          bubbleShown: bubble === null ? false : getComputedStyle(bubble).display !== 'none',
        }
      }, ROW)
      const resting = await read()
      const answerButtons = {
        rerun: await page.getByRole('button', { name: /^(重跑这一轮|Run this turn again)$/ }).count(),
        delete: await page.getByRole('button', { name: /^(删除此轮|Delete this turn)$/ }).count(),
      }
      const answerState = await page.locator(HOST.answerRow).evaluateAll((rows) => rows.map((row) => ({
        turn: row.getAttribute('data-chat-turn'),
        key: row.getAttribute('data-chat-node-key'),
        parentKey: row.parentElement?.getAttribute('data-chat-node-key'),
        actions: row.querySelectorAll('[data-clock] button').length,
        parentActions: row.parentElement?.querySelectorAll('[data-clock] button').length,
      })))
      const clockState = await page.locator('[data-clock]').evaluateAll((rows) => rows.map((row) => ({
        turn: row.getAttribute('data-chat-turn'),
        key: row.getAttribute('data-chat-node-key'),
        closestKind: row.closest('[data-chat-flow-kind]')?.getAttribute('data-chat-flow-kind'),
        closestTurn: row.closest('[data-chat-turn]')?.getAttribute('data-chat-turn'),
        closestKey: row.closest('[data-chat-node-key]')?.getAttribute('data-chat-node-key'),
      })))
      await page.hover(HOST.answerRow)
      await sanitizePage((expression) => page.evaluate(expression))
      await page.screenshot({ path: path.join(out, 'message-actions.png') })
      await page.hover(ROW)
      await page.waitForFunction((row) => {
        const clock = document.querySelector(row)?.querySelector('[data-clock]')
        return clock !== null && clock !== undefined && getComputedStyle(clock).opacity === '1'
      }, ROW, { timeout: 5000 }).catch(() => {})
      const hovered = await read()
      const ourTip = await hoverTooltip(page, retractButton)
      const retractLabel = await retractButton.getAttribute('aria-label')
      await page.mouse.move(5, 5)
      await page.waitForTimeout(400)
      const hostTip = await hoverTooltip(page, copyButton)
      await editButton.click()
      await page.waitForSelector(EDITOR, { timeout: 5000 })
      const edited = await page.inputValue(EDITOR)
      const whileEditing = await read()
      await page.keyboard.press('Escape')
      await page.waitForSelector(EDITOR, { state: 'detached', timeout: 5000 }).catch(() => {})
      const cancelled = await read()
      await page.hover(ROW)
      await retractButton.click()
      await page.waitForFunction((before) => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') !== before, resting.sessionId, { timeout: 30000 }).catch(() => {})
      await page.waitForFunction(() => (document.querySelector('[data-composer-input]')?.innerText ?? '').trim() === 'hello there', { timeout: 30000 }).catch(() => {})
      const rewound = await read()
      // Send the original text the composer got back, then edit it and press Enter: the
      // changed text goes straight into the new conversation.
      await page.evaluate((selector) => document.querySelector(selector)?.focus(), '[data-composer-input]')
      await page.keyboard.press('Enter')
      // The forked conversation carries a synthetic tail row of its own, so this waits for
      // the tail of the new message's turn (the next turn), not for any tail row to say
      // the turn is over.
      await page.waitForSelector('[data-chat-turn="2"][data-chat-flow-kind="turn-tail"]', { timeout: 90000 })
      await page.hover(ROW)
      await editButton.click()
      await page.waitForSelector(EDITOR, { timeout: 5000 })
      // With the text cleared there is nothing to send: the save button stands disabled.
      await page.fill(EDITOR, '')
      const emptySaveOff = await page.isDisabled(`${EDITOR} ~ div > button:last-child`)
      await page.fill(EDITOR, 'hello there, edited')
      await page.keyboard.press('Enter')
      await page.waitForFunction((before) => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') !== before, rewound.sessionId, { timeout: 30000 }).catch(() => {})
      await page.waitForFunction(() => {
        const bubble = document.querySelector('[data-chat-flow-kind="user"] [data-message-bubble]')
        return (bubble?.textContent ?? '').trim() === 'hello there, edited'
      }, { timeout: 30000 }).catch(() => {})
      await page.waitForFunction(() => (document.querySelector('[data-composer-input]')?.innerText ?? '').trim() === '', { timeout: 10000 }).catch(() => {})
      const committed = await read()
      return [
        check('the answer row offers rerun and delete for this turn', answerButtons.rerun === 1 && answerButtons.delete === 1, `${JSON.stringify(answerButtons)} rows=${JSON.stringify(answerState)} clocks=${JSON.stringify(clockState)}`),
        check('two buttons, retract and edit, grow at the end of the control row', resting.buttons === 3, `${resting.buttons} buttons (beside the host's time and copy)`),
        check('the control row hides when the pointer leaves and shows when it lands', resting.opacity === '0' && hovered.opacity === '1', `resting=${resting.opacity} hovered=${hovered.opacity}`),
        check('the retract button\'s tooltip is the host\'s own Tooltip', ourTip !== null && ourTip.text === retractLabel && hostTip !== null && ourTip.background === hostTip.background && ourTip.color === hostTip.color && ourTip.radius === hostTip.radius && ourTip.size === hostTip.size, `ours=${JSON.stringify(ourTip)} host=${JSON.stringify(hostTip)}`),
        check('the home statistics value\'s tooltip is the host\'s own Tooltip too', notes.homeTip !== null && notes.homeTitle === null && notes.homeTip.text === notes.homeText && hostTip !== null && notes.homeTip.background === hostTip.background && notes.homeTip.radius === hostTip.radius, `title=${notes.homeTitle} home=${JSON.stringify(notes.homeTip)} host=${JSON.stringify(hostTip)}`),
        check('the editor opens with that message\'s original text', edited.trim() === 'hello there', edited.slice(0, 80)),
        check('while editing, the original bubble gives way', whileEditing.bubbleShown === false, `bubbleShown=${whileEditing.bubbleShown}`),
        check('Esc puts the editor away and the bubble returns', cancelled.bubbleShown === true && cancelled.bubbleText.includes('hello there'), `bubbleShown=${cancelled.bubbleShown} bubble=${cancelled.bubbleText.slice(0, 60)}`),
        check('retracting opens a new conversation', rewound.sessionId !== resting.sessionId && rewound.sessionId !== null, `before=${resting.sessionId} after=${rewound.sessionId}`),
        check('the original text returns to the new conversation\'s composer', rewound.draft === 'hello there', rewound.draft.slice(0, 80)),
        check('with the text cleared the save button cannot be pressed', emptySaveOff === true, `disabled=${emptySaveOff}`),
        check('edit and save send the changed text straight into the new conversation', committed.sessionId !== rewound.sessionId && committed.bubbleText === 'hello there, edited' && committed.draft === '', `session=${committed.sessionId} draft=${committed.draft.slice(0, 40)} bubble=${committed.bubbleText.slice(0, 60)}`),
        check('the console reports no errors', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { messageActionsScenario }
