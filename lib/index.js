/**
 * Host half of `dsh-port-token`.
 *
 * `dsh web` prints one URL carrying the per-process launch token, which the
 * Web shell exchanges for an HttpOnly cookie and never exposes to the page
 * again. This row re-reads those facts from the live services — `webServer`
 * owns the bound port, `connection` owns the token — and serves them to the
 * authenticated page on one exact route, so the browser badge can display
 * them without a second copy of the token living anywhere else.
 *
 * The route admits only requests that pass the same fence and session check as
 * `/api`, so a reader of this JSON can already drive the Harness.
 *
 * @module dsh-port-token
 */

/** Stable Cordis plugin name. */
export const name = 'port-token'

/** Both services must be live before the route can answer with real facts. */
export const inject = ['webServer', 'connection']

/** Exact path the browser badge reads. */
export const INFO_PATH = '/dsh-port-token/info'

/** Loopback host the canonical local URL always names. */
const LOOPBACK_HOST = '127.0.0.1'

/**
 * Read the port, token, and token-bearing URL of this process.
 * @param connection - Host connection service owning the launch token.
 * @param port - the port the Web server actually bound.
 * @returns the instance facts served to the page.
 */
export function describeInstance(connection, port) {
  const origin = `http://${LOOPBACK_HOST}:${String(port)}`
  const url = connection.authenticatedUrl(origin)
  const token = new URL(url).searchParams.get('token') ?? ''
  return { port, origin, url, token }
}

/**
 * Write one JSON response with no-store caching.
 * @param res - the owning response.
 * @param status - HTTP status.
 * @param body - JSON-serializable payload.
 */
function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(payload)),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

/**
 * Answer one info request for an already-admitted page.
 * @param ctx - plugin context carrying both services.
 * @param req - the inbound request.
 * @param res - the response this handler owns.
 */
function handleInfo(ctx, req, res) {
  try {
    if (req.method !== 'GET') {
      res.writeHead(405, { allow: 'GET' })
      res.end()
      return
    }
    const admission = ctx.connection.admit(req)
    if (admission.rejection !== undefined) {
      sendJson(res, admission.rejection, {
        ok: false,
        code: admission.rejection === 401 ? 'unauthenticated' : 'untrusted-request',
      })
      return
    }
    sendJson(res, 200, {
      ok: true,
      host: ctx.webServer.host,
      ...describeInstance(ctx.connection, ctx.webServer.port),
    })
  } catch (error) {
    if (res.headersSent) {
      res.end()
      return
    }
    sendJson(res, 500, {
      ok: false,
      code: 'internal',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Register the info route for the lifetime of this plugin.
 * @param ctx - plugin context.
 */
export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: INFO_PATH, handler: (req, res) => handleInfo(ctx, req, res) }),
    'port-token: instance info route',
  )
}
