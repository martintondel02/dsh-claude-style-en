#!/usr/bin/env node
/**
 * custom-brand.mjs — the reader's own brand images on the real host (D30).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The host half keeps the images under the scratch home's
 * `dsh-claude-style/brand/`. The scenario drives its routes from the page, the
 * way the settings page does — through the host's fence, with the page's own
 * cookie — and holds each refusal to its status: a type the route does not
 * take, bytes that do not open the way their type requires, a body over the
 * size limit. Then it reloads and reads where the real shell paints the
 * images: the sidebar's mark and wordmark, the hero's mark. The images are
 * removed before the scenario ends, so the home the next scenario boots on
 * carries none.
 */

/** The routes under test (packages/contracts/src/routes.ts). */
const ROUTES = {
  status: '/dsh-claude-style/brand',
  mark: '/dsh-claude-style/brand/mark',
  wordmark: '/dsh-claude-style/brand/wordmark',
}

/** One step past the host half's size limit (packages/contracts/src/brand.ts). */
const OVERSIZED_BYTES = 2 * 1024 * 1024 + 1

/** Drive the routes from the page: uploads, refusals, and the status after each. */
const driveRoutes = (page) => page.evaluate(async ({ routes, oversized }) => {
  const send = async (url, method, type, body) => {
    const response = await fetch(url, { method, headers: type === null ? {} : { 'content-type': type }, body })
    return { status: response.status, answer: await response.json() }
  }
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  canvas.getContext('2d').fillRect(0, 0, 32, 32)
  const png = await new Promise((settle) => canvas.toBlob(settle, 'image/png'))
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><rect width="400" height="100"/></svg>'
  return {
    before: (await send(routes.status, 'GET', null)).answer,
    wrongType: (await send(routes.mark, 'PUT', 'image/gif', png)).status,
    wrongBytes: (await send(routes.mark, 'PUT', 'image/png', new Blob(['not a png']))).status,
    oversized: (await send(routes.mark, 'PUT', 'image/png', new Uint8Array(oversized))).status,
    mark: await send(routes.mark, 'PUT', 'image/png', png),
    wordmark: await send(routes.wordmark, 'PUT', 'image/svg+xml', svg),
    served: await fetch(routes.mark).then((response) => ({
      status: response.status,
      type: response.headers.get('content-type'),
      policy: response.headers.get('content-security-policy'),
    })),
  }
}, { routes: ROUTES, oversized: OVERSIZED_BYTES })

/** Where the shell paints the images, once the brand feature has adopted them. */
async function readPainted(page) {
  await page.waitForFunction(() => document.body.getAttribute('data-dsh-claude-custom-word') === 'image', null, { timeout: 15000 })
  return page.evaluate(() => {
    const art = (selector) => {
      const element = document.querySelector(selector)
      if (element === null) return null
      const before = getComputedStyle(element, '::before')
      return { image: before.backgroundImage, width: before.width, height: before.height }
    }
    return {
      mark: art('[data-dsh-claude-part~="brand-mark"]'),
      word: art('[data-dsh-claude-part~="brand-identity"] > [data-dsh-claude-part~="brand-name"]'),
      hero: art('[data-dsh-claude-part~="hero-mark"]'),
    }
  })
}

/** Remove both images and answer the status left behind. */
const removeImages = (page) => page.evaluate(async (routes) => {
  for (const url of [routes.mark, routes.wordmark]) await fetch(url, { method: 'DELETE' })
  return (await fetch(routes.status)).json()
}, ROUTES)

function customBrandScenario({ check }) {
  /** What beforeSend read, for assert to judge. */
  let routes = null
  let painted = null
  let after = null
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page }) {
      try {
        routes = await driveRoutes(page)
        await page.reload()
        painted = await readPainted(page)
      } finally {
        after = await removeImages(page)
      }
    },
    async assert({ session }) {
      // The three refusals the scenario provokes are logged by the browser as
      // failed loads; every other console line is a problem.
      const problems = session.problems.filter((line) => !/Failed to load resource: the server responded with a status of (400|413|415)/.test(line))
      return [
        check('the host half starts with no custom brand image',
          routes.before.ok === true && routes.before.mark === null && routes.before.wordmark === null, JSON.stringify(routes.before)),
        check('an unaccepted type, bytes that do not match their type, and an oversized image answer 415, 400 and 413 in turn',
          routes.wrongType === 415 && routes.wrongBytes === 400 && routes.oversized === 413,
          JSON.stringify({ wrongType: routes.wrongType, wrongBytes: routes.wrongBytes, oversized: routes.oversized })),
        check('once the mark and wordmark are stored, the status carries both, each with its type and version',
          routes.wordmark.status === 200 && routes.wordmark.answer.mark?.type === 'image/png' &&
            routes.wordmark.answer.wordmark?.type === 'image/svg+xml' && typeof routes.wordmark.answer.wordmark?.version === 'string',
          JSON.stringify(routes.wordmark)),
        check('the image is served under its own type with a script-blocking policy',
          routes.served.status === 200 && routes.served.type === 'image/png' && /sandbox/.test(routes.served.policy ?? ''),
          JSON.stringify(routes.served)),
        check('the sidebar mark and the hero mark paint this image',
          painted.mark !== null && painted.mark.image.includes(ROUTES.mark) && painted.mark.width === '18px' &&
            painted.hero !== null && painted.hero.image.includes(ROUTES.mark),
          JSON.stringify({ mark: painted.mark, hero: painted.hero })),
        check('the wordmark takes its width from its 4:1 ratio at an 18px height',
          painted.word !== null && painted.word.image.includes(ROUTES.wordmark) && painted.word.width === '72px' && painted.word.height === '18px',
          JSON.stringify(painted.word)),
        check('once both are removed neither stands in the status', after.mark === null && after.wordmark === null, JSON.stringify(after)),
        check('the console reports no errors', problems.length === 0, problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { customBrandScenario }
